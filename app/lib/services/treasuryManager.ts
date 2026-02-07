// lib/services/treasuryManager.ts
// Treasury Manager — checks Arc balance, plans swap+bridge if needed, executes after approval

import { getWalletTokenBalances, executeContractCall, executeTransfer } from './circleService';
import { InvoiceData } from '@/app/types';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createCircleWalletsAdapter } from '@circle-fin/adapter-circle-wallets';
import {
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  parseUnits,
} from 'viem';
import { sepolia } from 'viem/chains';
import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';

// ── Config ──────────────────────────────────────────────────────────────────

const ARC_WALLET_ID = process.env.NEXT_PUBLIC_CIRCLE_ARC_WALLET_ID!;
const SEPOLIA_WALLET_ID = process.env.NEXT_PUBLIC_CIRCLE_ETH_SEPOLIA_WALLET_ID!;
const SEPOLIA_WALLET_ADDRESS = process.env.CIRCLE_ETH_SEPOLIA_WALLET_ADDRESS!;
const ARC_WALLET_ADDRESS = process.env.CIRCLE_ARC_WALLET_ADDRESS!;

// Uniswap V4 on Sepolia
const UNIVERSAL_ROUTER = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b';
const V4_QUOTER = '0x61b3f2011a92d183c7dbadbda940a7555ccf9227';
const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const NATIVE = '0x0000000000000000000000000000000000000000';
const POOL_FEE = 3000;
const TICK_SPACING = 60;
const HOOKS = '0x0000000000000000000000000000000000000000';
const SLIPPAGE_BPS = 500; // 5%
const ARC_GAS_BUFFER = 0.01; // Reserve 0.01 USDC for Arc gas fees

// Circle token IDs on Arc Testnet
const ARC_USDC_TOKEN_ID = '15dc2b5d-0994-58b0-bf8c-3a0501148ee8';
const ARC_EURC_TOKEN_ID = '4ea52a96-e6ae-56dc-8336-385bb238755f';

const POOL_KEY = {
  currency0: NATIVE,
  currency1: USDC_SEPOLIA,
  fee: POOL_FEE,
  tickSpacing: TICK_SPACING,
  hooks: HOOKS,
};

const V4_QUOTER_ABI = [
  {
    type: 'function' as const,
    name: 'quoteExactOutputSingle' as const,
    stateMutability: 'nonpayable' as const,
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

const UNIVERSAL_ROUTER_ABI = [
  {
    type: 'function' as const,
    name: 'execute' as const,
    stateMutability: 'payable' as const,
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  txHash?: string;
  error?: string;
}

export interface TreasuryPlan {
  invoiceAmount: string;       // e.g. "50"
  invoiceCurrency: string;     // "USDC" or "EURC"
  recipientAddress: string;
  arcBalance: string;          // current balance of invoice currency on Arc
  arcSufficient: boolean;
  deficit: string;             // how much more is needed (0 if sufficient)
  sepoliaEthBalance: string;   // ETH on Sepolia
  sepoliaUsdcBalance: string;  // USDC on Sepolia
  swapNeeded: boolean;
  swapQuoteEth: string | null; // ETH needed for swap (with slippage)
  bridgeNeeded: boolean;
  bridgeAmount: string | null; // USDC to bridge from Sepolia → Arc
  steps: ExecutionStep[];
  canExecute: boolean;
  reason?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getPublicClient() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error('Missing SEPOLIA_RPC_URL');
  return createPublicClient({
    chain: sepolia as Parameters<typeof createPublicClient>[0]['chain'],
    transport: http(rpcUrl),
  });
}

function parseInvoiceCurrency(amountRaw: string): { amount: string; currency: string } | null {
  const sanitized = amountRaw.replace(/,/g, '').trim();
  const match = sanitized.match(/([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)/);
  if (!match) return null;
  const currency = match[2].toUpperCase();
  if (currency !== 'USDC' && currency !== 'EURC') return null;
  return { amount: match[1], currency };
}

function findTokenBalance(balances: any[], symbol: string): string {
  for (const b of balances) {
    const s = (b.token?.symbol || b.token?.name || '').toUpperCase();
    if (s === symbol) return b.amount || '0';
  }
  return '0';
}

// ── Build Plan (no execution) ───────────────────────────────────────────────

export async function buildTreasuryPlan(invoiceData: InvoiceData): Promise<TreasuryPlan> {
  const parsed = parseInvoiceCurrency(invoiceData.amount);
  if (!parsed) {
    return {
      invoiceAmount: invoiceData.amount,
      invoiceCurrency: 'UNKNOWN',
      recipientAddress: invoiceData.walletAddress,
      arcBalance: '0',
      arcSufficient: false,
      deficit: '0',
      sepoliaEthBalance: '0',
      sepoliaUsdcBalance: '0',
      swapNeeded: false,
      swapQuoteEth: null,
      bridgeNeeded: false,
      bridgeAmount: null,
      steps: [],
      canExecute: false,
      reason: 'Only USDC and EURC invoices are supported',
    };
  }

  const { amount, currency } = parsed;
  const invoiceAmountNum = parseFloat(amount);

  // Step 1: Check Arc balance
  const arcBalances = await getWalletTokenBalances(ARC_WALLET_ID);
  const arcTokenBalance = findTokenBalance(arcBalances, currency);
  const arcBalanceNum = parseFloat(arcTokenBalance);

  // Reserve a small buffer for Arc gas (USDC is the native gas token on Arc)
  const arcSufficient = arcBalanceNum >= (invoiceAmountNum + ARC_GAS_BUFFER);
  const deficit = arcSufficient ? 0 : (invoiceAmountNum + ARC_GAS_BUFFER) - arcBalanceNum;

  const steps: ExecutionStep[] = [];

  // If Arc has enough, just transfer
  if (arcSufficient) {
    steps.push({
      id: 'transfer',
      name: 'Transfer on Arc',
      description: `Transfer ${amount} ${currency} to ${invoiceData.walletAddress.slice(0, 10)}... on Arc Testnet`,
      status: 'pending',
    });

    return {
      invoiceAmount: amount,
      invoiceCurrency: currency,
      recipientAddress: invoiceData.walletAddress,
      arcBalance: arcTokenBalance,
      arcSufficient: true,
      deficit: '0',
      sepoliaEthBalance: '0',
      sepoliaUsdcBalance: '0',
      swapNeeded: false,
      swapQuoteEth: null,
      bridgeNeeded: false,
      bridgeAmount: null,
      steps,
      canExecute: true,
    };
  }

  // Step 2: Arc doesn't have enough — check Sepolia for USDC + ETH
  const sepoliaBalances = await getWalletTokenBalances(SEPOLIA_WALLET_ID);
  const sepoliaUsdcBalance = findTokenBalance(sepoliaBalances, 'USDC');
  const sepoliaUsdcNum = parseFloat(sepoliaUsdcBalance);

  // For EURC invoices, we can only pay from Arc directly (no swap to EURC on Sepolia)
  if (currency === 'EURC') {
    return {
      invoiceAmount: amount,
      invoiceCurrency: currency,
      recipientAddress: invoiceData.walletAddress,
      arcBalance: arcTokenBalance,
      arcSufficient: false,
      deficit: deficit.toString(),
      sepoliaEthBalance: '0',
      sepoliaUsdcBalance: '0',
      swapNeeded: false,
      swapQuoteEth: null,
      bridgeNeeded: false,
      bridgeAmount: null,
      steps: [],
      canExecute: false,
      reason: `Insufficient EURC on Arc (have ${arcTokenBalance}, need ${amount}). Cannot swap to EURC on Sepolia.`,
    };
  }

  // USDC invoice — figure out how much to swap + bridge
  // We need `deficit` more USDC on Arc. Check if Sepolia already has some USDC.
  const sepoliaCanCover = sepoliaUsdcNum;
  const needToSwap = deficit - sepoliaCanCover;

  let sepoliaEthBalance = '0';
  let swapQuoteEth: string | null = null;
  let swapNeeded = false;

  if (needToSwap > 0) {
    // Need to swap ETH → USDC on Sepolia
    swapNeeded = true;
    const publicClient = getPublicClient();

    // Get ETH balance
    const ethBalanceWei = await publicClient.getBalance({
      address: SEPOLIA_WALLET_ADDRESS as `0x${string}`,
    });
    sepoliaEthBalance = formatUnits(ethBalanceWei, 18);

    // Get Uniswap v4 quote
    const swapAmountUsdc = parseUnits(needToSwap.toFixed(6), 6);
    const quote = await publicClient.readContract({
      address: V4_QUOTER as `0x${string}`,
      abi: V4_QUOTER_ABI,
      functionName: 'quoteExactOutputSingle',
      args: [
        {
          poolKey: POOL_KEY,
          zeroForOne: true,
          exactAmount: swapAmountUsdc,
          hookData: '0x',
        },
      ],
    });

    const amountIn = quote[0];
    const maxAmountIn = (amountIn * BigInt(10000 + SLIPPAGE_BPS)) / BigInt(10000);
    swapQuoteEth = formatUnits(maxAmountIn, 18);

    if (maxAmountIn > ethBalanceWei) {
      return {
        invoiceAmount: amount,
        invoiceCurrency: currency,
        recipientAddress: invoiceData.walletAddress,
        arcBalance: arcTokenBalance,
        arcSufficient: false,
        deficit: deficit.toString(),
        sepoliaEthBalance,
        sepoliaUsdcBalance,
        swapNeeded: true,
        swapQuoteEth,
        bridgeNeeded: true,
        bridgeAmount: deficit.toFixed(6),
        steps: [],
        canExecute: false,
        reason: `Insufficient ETH on Sepolia for swap. Need ${swapQuoteEth} ETH, have ${sepoliaEthBalance} ETH.`,
      };
    }

    steps.push({
      id: 'swap',
      name: 'Swap ETH → USDC',
      description: `Swap ~${swapQuoteEth} ETH for ${needToSwap.toFixed(2)} USDC on Sepolia via Uniswap v4`,
      status: 'pending',
    });
  }

  // Bridge total deficit from Sepolia → Arc
  const bridgeAmount = deficit.toFixed(6);
  steps.push({
    id: 'bridge',
    name: 'Bridge to Arc',
    description: `Bridge ${bridgeAmount} USDC from Sepolia → Arc Testnet via CCTP`,
    status: 'pending',
  });

  // Final transfer on Arc
  steps.push({
    id: 'transfer',
    name: 'Transfer on Arc',
    description: `Transfer ${amount} ${currency} to ${invoiceData.walletAddress.slice(0, 10)}... on Arc Testnet`,
    status: 'pending',
  });

  return {
    invoiceAmount: amount,
    invoiceCurrency: currency,
    recipientAddress: invoiceData.walletAddress,
    arcBalance: arcTokenBalance,
    arcSufficient: false,
    deficit: deficit.toString(),
    sepoliaEthBalance,
    sepoliaUsdcBalance,
    swapNeeded,
    swapQuoteEth,
    bridgeNeeded: true,
    bridgeAmount,
    steps,
    canExecute: true,
  };
}

// ── Execute Plan (called ONLY after human approval) ─────────────────────────

export async function executeTreasuryPlan(
  plan: TreasuryPlan,
  onStepUpdate: (stepId: string, update: Partial<ExecutionStep>) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Swap (if needed)
    if (plan.swapNeeded && plan.steps.find(s => s.id === 'swap')) {
      onStepUpdate('swap', { status: 'running' });

      const publicClient = getPublicClient();
      const needToSwap = parseFloat(plan.deficit) - parseFloat(plan.sepoliaUsdcBalance);
      const swapAmountUsdc = parseUnits(needToSwap.toFixed(6), 6);

      // Re-quote (price may have changed)
      const quote = await publicClient.readContract({
        address: V4_QUOTER as `0x${string}`,
        abi: V4_QUOTER_ABI,
        functionName: 'quoteExactOutputSingle',
        args: [{ poolKey: POOL_KEY, zeroForOne: true, exactAmount: swapAmountUsdc, hookData: '0x' }],
      });

      const amountIn = quote[0];
      const maxAmountIn = (amountIn * BigInt(10000 + SLIPPAGE_BPS)) / BigInt(10000);

      // Build calldata
      const v4Planner = new V4Planner();
      v4Planner.addAction(Actions.SWAP_EXACT_OUT_SINGLE, [
        {
          poolKey: POOL_KEY,
          zeroForOne: true,
          amountOut: swapAmountUsdc.toString(),
          amountInMaximum: maxAmountIn.toString(),
          hookData: '0x',
        },
      ]);
      v4Planner.addAction(Actions.SETTLE_ALL, [NATIVE, maxAmountIn.toString()]);
      v4Planner.addAction(Actions.TAKE_ALL, [USDC_SEPOLIA, 0]);

      const routePlanner = new RoutePlanner();
      routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.finalize()]);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const callData = encodeFunctionData({
        abi: UNIVERSAL_ROUTER_ABI,
        functionName: 'execute',
        args: [
          routePlanner.commands as `0x${string}`,
          routePlanner.inputs as `0x${string}`[],
          deadline,
        ],
      });

      const swapTx = await executeContractCall({
        walletId: SEPOLIA_WALLET_ID,
        contractAddress: UNIVERSAL_ROUTER,
        callData: callData as `0x${string}`,
        amount: `0x${maxAmountIn.toString(16)}`,
      });

      if (!swapTx) throw new Error('Swap transaction failed to submit');

      // Poll for completion
      const txHash = await pollTransactionComplete(swapTx.id);
      onStepUpdate('swap', { status: 'success', txHash });
    }

    // 2. Bridge (if needed)
    if (plan.bridgeNeeded && plan.bridgeAmount && plan.steps.find(s => s.id === 'bridge')) {
      onStepUpdate('bridge', { status: 'running' });

      const kit = new BridgeKit();
      const adapter = createCircleWalletsAdapter({
        apiKey: process.env.CIRCLE_API_KEY!,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
      });

      const bridgeResult = await kit.bridge({
        from: {
          adapter,
          chain: 'Ethereum_Sepolia',
          address: SEPOLIA_WALLET_ADDRESS,
        },
        to: {
          adapter,
          chain: 'Arc_Testnet',
          address: ARC_WALLET_ADDRESS,
        },
        amount: plan.bridgeAmount,
      });

      const mintTxHash = bridgeResult.steps?.find((s: any) => s.name === 'mint')?.txHash;
      onStepUpdate('bridge', { status: 'success', txHash: mintTxHash || 'completed' });
    }

    // 3. Transfer on Arc
    if (plan.steps.find(s => s.id === 'transfer')) {
      onStepUpdate('transfer', { status: 'running' });

      const tokenId = plan.invoiceCurrency === 'EURC' ? ARC_EURC_TOKEN_ID : ARC_USDC_TOKEN_ID;

      const transferTx = await executeTransfer({
        walletId: ARC_WALLET_ID,
        tokenId,
        amount: plan.invoiceAmount,
        destinationAddress: plan.recipientAddress,
      });

      if (!transferTx) throw new Error('Arc transfer failed to submit');

      const transferTxHash = await pollTransactionComplete(transferTx.id);
      onStepUpdate('transfer', { status: 'success', txHash: transferTxHash });
    }

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown execution error';
    // Mark any running steps as failed
    for (const step of plan.steps) {
      if (step.status === 'running') {
        onStepUpdate(step.id, { status: 'failed', error: errMsg });
      }
    }
    return { success: false, error: errMsg };
  }
}

// ── Poll for Circle transaction completion ──────────────────────────────────

async function pollTransactionComplete(transactionId: string, timeoutMs = 120000): Promise<string> {
  const { initiateDeveloperControlledWalletsClient } = await import(
    '@circle-fin/developer-controlled-wallets'
  );

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await client.getTransaction({ id: transactionId });
    const tx = resp.data?.transaction;
    if (tx?.state === 'CONFIRMED' || tx?.state === 'COMPLETE') {
      return tx.txHash || transactionId;
    }
    if (tx?.state === 'FAILED' || tx?.state === 'CANCELLED') {
      throw new Error(`Transaction ${transactionId} ${tx.state}: ${tx.errorReason || 'unknown'}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Transaction ${transactionId} timed out`);
}
