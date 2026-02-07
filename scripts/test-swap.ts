// Test end-to-end: Build Uniswap v4 swap calldata → Execute via Circle wallet on ETH Sepolia
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createPublicClient, http, formatEther, formatUnits, encodeFunctionData, toHex, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

// ── Config ──
const WALLET_ID = process.env.CIRCLE_ETH_SEPOLIA_WALLET_ID!;
const WALLET_ADDRESS = process.env.CIRCLE_ETH_SEPOLIA_WALLET_ADDRESS!;

const UNIVERSAL_ROUTER = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b';
const V4_QUOTER = '0x61b3f2011a92d183c7dbadbda940a7555ccf9227';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const NATIVE = '0x0000000000000000000000000000000000000000';
const POOL_FEE = 3000;
const TICK_SPACING = 60;
const HOOKS = '0x0000000000000000000000000000000000000000';

// Swap: 0.1 USDC worth (small test amount)
const SWAP_AMOUNT_USDC = '0.1';
const SLIPPAGE_BPS = 500; // 5% slippage for testnet

const UNIVERSAL_ROUTER_ABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const V4_QUOTER_ABI = [
  {
    type: 'function',
    name: 'quoteExactOutputSingle',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          {
            name: 'poolKey',
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ],
          },
          { name: 'zeroForOne', type: 'bool' },
          { name: 'exactAmount', type: 'uint128' },
          { name: 'hookData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

async function main() {
  console.log('=== Uniswap v4 Swap Test: ETH → USDC on Sepolia ===\n');
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Wallet ID: ${WALLET_ID}`);
  console.log(`Swap amount: ${SWAP_AMOUNT_USDC} USDC (exact output)\n`);

  // 1. Setup clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  // 2. Check balances before
  console.log('── Step 1: Check balances before swap ──');
  const [ethBefore, usdcBefore] = await Promise.all([
    publicClient.getBalance({ address: WALLET_ADDRESS as `0x${string}` }),
    publicClient.readContract({
      address: USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [WALLET_ADDRESS as `0x${string}`],
    }),
  ]);
  console.log(`  ETH:  ${formatEther(ethBefore)}`);
  console.log(`  USDC: ${formatUnits(usdcBefore, 6)}`);

  // 3. Get quote
  console.log('\n── Step 2: Get Uniswap v4 quote ──');
  const amountOut = parseUnits(SWAP_AMOUNT_USDC, 6);
  const poolKey = {
    currency0: NATIVE,
    currency1: USDC,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS,
  };

  const quote = await publicClient.readContract({
    address: V4_QUOTER as `0x${string}`,
    abi: V4_QUOTER_ABI,
    functionName: 'quoteExactOutputSingle',
    args: [{ poolKey, zeroForOne: true, exactAmount: amountOut, hookData: '0x' }],
  });

  const amountIn = quote[0];
  const maxAmountIn = (amountIn * BigInt(10000 + SLIPPAGE_BPS)) / BigInt(10000);

  console.log(`  Want: ${SWAP_AMOUNT_USDC} USDC`);
  console.log(`  Quote: ${formatEther(amountIn)} ETH`);
  console.log(`  Max (with ${SLIPPAGE_BPS / 100}% slippage): ${formatEther(maxAmountIn)} ETH`);

  if (maxAmountIn > ethBefore) {
    console.log('  ❌ Insufficient ETH balance!');
    return;
  }
  console.log('  ✅ Sufficient balance');

  // 4. Build swap calldata
  console.log('\n── Step 3: Build swap calldata ──');
  const v4Planner = new V4Planner();
  v4Planner.addAction(Actions.SWAP_EXACT_OUT_SINGLE, [
    {
      poolKey,
      zeroForOne: true,
      amountOut: amountOut.toString(),
      amountInMaximum: maxAmountIn.toString(),
      hookData: '0x',
    },
  ]);
  v4Planner.addAction(Actions.SETTLE_ALL, [NATIVE, maxAmountIn.toString()]);
  v4Planner.addAction(Actions.TAKE_ALL, [USDC, 0]);

  const routePlanner = new RoutePlanner();
  routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.finalize()]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60); // 1 hour (Circle MPC signing adds latency)
  const callData = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [
      routePlanner.commands as `0x${string}`,
      routePlanner.inputs as `0x${string}`[],
      deadline,
    ],
  });

  console.log(`  Calldata length: ${callData.length} chars`);
  console.log(`  Target: Universal Router ${UNIVERSAL_ROUTER}`);
  console.log(`  Value: ${formatEther(maxAmountIn)} ETH`);

  // 5. Execute via Circle
  console.log('\n── Step 4: Execute via Circle wallet ──');
  try {
    const response = await circleClient.createContractExecutionTransaction({
      walletId: WALLET_ID,
      contractAddress: UNIVERSAL_ROUTER,
      callData: callData as `0x${string}`,
      amount: formatEther(maxAmountIn), // ETH value to send
      fee: {
        type: 'level',
        config: { feeLevel: 'HIGH' },
      },
    });

    const tx = response.data;
    console.log(`  ✅ Transaction submitted!`);
    console.log(`  Transaction ID: ${tx?.id}`);
    console.log(`  State: ${tx?.state}`);

    // 6. Poll for completion
    console.log('\n── Step 5: Waiting for confirmation... ──');
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 5000)); // wait 5s
      attempts++;

      const statusRes = await circleClient.getTransaction({ id: tx!.id });
      const status = statusRes.data?.transaction;

      console.log(`  [${attempts}] State: ${status?.state} | TxHash: ${status?.txHash || 'pending...'}`);

      if (status?.state === 'COMPLETE' || status?.state === 'CONFIRMED') {
        console.log(`\n  🎉 SWAP COMPLETE!`);
        console.log(`  TxHash: ${status.txHash}`);
        console.log(`  View: https://sepolia.etherscan.io/tx/${status.txHash}`);

        // Check balances after
        console.log('\n── Final balances ──');
        const [ethAfter, usdcAfter] = await Promise.all([
          publicClient.getBalance({ address: WALLET_ADDRESS as `0x${string}` }),
          publicClient.readContract({
            address: USDC as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [WALLET_ADDRESS as `0x${string}`],
          }),
        ]);
        console.log(`  ETH:  ${formatEther(ethAfter)} (was ${formatEther(ethBefore)})`);
        console.log(`  USDC: ${formatUnits(usdcAfter, 6)} (was ${formatUnits(usdcBefore, 6)})`);
        return;
      }

      if (status?.state === 'FAILED' || status?.state === 'CANCELLED') {
        console.log(`\n  ❌ Transaction ${status.state}`);
        console.log(`  Details:`, JSON.stringify(status, null, 2));
        return;
      }
    }

    console.log('  ⏳ Timed out waiting. Check transaction manually:', tx?.id);
  } catch (err: any) {
    console.error('  ❌ Circle execution failed:', err.message || err);
    if (err.response?.data) {
      console.error('  Details:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

main().catch(console.error);
