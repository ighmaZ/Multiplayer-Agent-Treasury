// lib/services/paymentPlanner.ts
// Builds a Uniswap v4 payment plan and prepares MetaMask transaction data

import { sepolia } from 'viem/chains';
import {
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  parseUnits,
  toHex,
} from 'viem';
import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';

import { InvoiceData, PaymentPlan, PreparedTransaction } from '@/app/types';

// Ethereum Sepolia chain configuration
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_HEX = '0xaa36a7';

// Uniswap V4 contract addresses on Ethereum Sepolia
const UNIVERSAL_ROUTER_ADDRESS = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b';
const V4_QUOTER_ADDRESS = '0x61b3f2011a92d183c7dbadbda940a7555ccf9227';
// Circle USDC on Ethereum Sepolia
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000';
const POOL_FEE = 3000;
const TICK_SPACING = 60;
const HOOKS_ADDRESS = '0x0000000000000000000000000000000000000000';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: ReturnType<typeof createPublicClient> | null = null;

function getPublicClient() {
  if (cachedClient) return cachedClient;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || '';
  if (!rpcUrl) {
    throw new Error('Missing SEPOLIA_RPC_URL');
  }
  cachedClient = createPublicClient({
    // Use type assertion to avoid viem chain type conflicts
    chain: sepolia as Parameters<typeof createPublicClient>[0]['chain'],
    transport: http(rpcUrl),
  });
  return cachedClient!;
}

function normalizeCurrency(raw: string): 'USDC' | 'ETH' | 'UNKNOWN' {
  const normalized = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (normalized === 'USDC') return 'USDC';
  if (normalized === 'ETH' || normalized === 'WETH') return 'ETH';
  return 'UNKNOWN';
}

function parseInvoiceAmount(amountRaw: string): { amount: string | null; currency: 'USDC' | 'ETH' | 'UNKNOWN' } {
  const sanitized = amountRaw.replace(/,/g, '').trim();
  const match = sanitized.match(/([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z$]+)/);
  if (!match) {
    return { amount: null, currency: 'UNKNOWN' };
  }
  return { amount: match[1], currency: normalizeCurrency(match[2]) };
}

function getSlippageBps(): number {
  const raw = Number(process.env.SWAP_SLIPPAGE_BPS || '500');
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 100;
}

function buildDirectTransferTx(recipient: string, amount: bigint): PreparedTransaction {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amount],
  });

  return {
    chainId: SEPOLIA_CHAIN_ID,
    to: USDC_ADDRESS as `0x${string}`,
    data,
    value: '0x0',
    description: 'Transfer USDC to invoice recipient',
  };
}

function buildSwapAndPayTx(
  recipient: string,
  amountOut: bigint,
  maxAmountIn: bigint
): PreparedTransaction {
  const poolKey = {
    currency0: NATIVE_CURRENCY,
    currency1: USDC_ADDRESS,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS,
  };

  const zeroForOne = true;

  const v4Planner = new V4Planner();
  v4Planner.addAction(Actions.SWAP_EXACT_OUT_SINGLE, [
    {
      poolKey,
      zeroForOne,
      amountOut: amountOut.toString(),
      amountInMaximum: maxAmountIn.toString(),
      hookData: '0x',
    },
  ]);
  v4Planner.addAction(Actions.SETTLE_ALL, [NATIVE_CURRENCY, maxAmountIn.toString()]);
  v4Planner.addAction(Actions.TAKE, [USDC_ADDRESS, recipient, amountOut.toString()]);

  const routePlanner = new RoutePlanner();
  routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.finalize()]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [
      routePlanner.commands as `0x${string}`,
      routePlanner.inputs as `0x${string}`[],
      deadline,
    ],
  });

  return {
    chainId: SEPOLIA_CHAIN_ID,
    to: UNIVERSAL_ROUTER_ADDRESS as `0x${string}`,
    data,
    value: toHex(maxAmountIn),
    description: 'Swap ETH to USDC and pay invoice in one transaction',
  };
}

/**
 * Build a payment plan with balances, Uniswap v4 quotes, and a MetaMask-ready transaction.
 */
export async function buildPaymentPlan(
  invoiceData: InvoiceData,
  payerAddress: string
): Promise<PaymentPlan> {
  const { amount, currency } = parseInvoiceAmount(invoiceData.amount);

  const poolKey = {
    currency0: NATIVE_CURRENCY,
    currency1: USDC_ADDRESS,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS,
  };

  if (!amount || currency !== 'USDC') {
    return {
      status: 'UNSUPPORTED_CURRENCY',
      method: 'DIRECT_USDC_TRANSFER',
      chain: 'sepolia',
      payerAddress,
      recipientAddress: invoiceData.walletAddress,
      invoiceAmountRaw: invoiceData.amount,
      invoiceAmountUSDC: null,
      usdcBalance: null,
      ethBalanceWei: null,
      maxEthInWei: null,
      slippageBps: getSlippageBps(),
      poolKey,
      reason: 'Invoice currency must be USDC for SDK flow',
      preparedTransaction: null,
    };
  }

  const publicClient = getPublicClient();
  const usdcDecimals = Number(
    await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    })
  );

  const invoiceAmountUSDC = parseUnits(amount, usdcDecimals);

  const [usdcBalance, ethBalanceWei] = await Promise.all([
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [payerAddress as `0x${string}`],
    }),
    publicClient.getBalance({ address: payerAddress as `0x${string}` }),
  ]);

  if (usdcBalance >= invoiceAmountUSDC) {
    return {
      status: 'READY',
      method: 'DIRECT_USDC_TRANSFER',
      chain: 'sepolia',
      payerAddress,
      recipientAddress: invoiceData.walletAddress,
      invoiceAmountRaw: invoiceData.amount,
      invoiceAmountUSDC: invoiceAmountUSDC.toString(),
      usdcBalance: usdcBalance.toString(),
      ethBalanceWei: ethBalanceWei.toString(),
      maxEthInWei: null,
      slippageBps: getSlippageBps(),
      poolKey,
      preparedTransaction: buildDirectTransferTx(invoiceData.walletAddress, invoiceAmountUSDC),
    };
  }

  const quote = await publicClient.readContract({
    address: V4_QUOTER_ADDRESS,
    abi: V4_QUOTER_ABI,
    functionName: 'quoteExactOutputSingle',
    args: [
      {
        poolKey,
        zeroForOne: true,
        exactAmount: invoiceAmountUSDC,
        hookData: '0x',
      },
    ],
  });

  const amountIn = quote[0];
  const slippageBps = getSlippageBps();
  const maxAmountIn = (amountIn * BigInt(10000 + slippageBps)) / BigInt(10000);

  if (maxAmountIn > ethBalanceWei) {
    return {
      status: 'INSUFFICIENT_FUNDS',
      method: 'SWAP_EXACT_OUT',
      chain: 'sepolia',
      payerAddress,
      recipientAddress: invoiceData.walletAddress,
      invoiceAmountRaw: invoiceData.amount,
      invoiceAmountUSDC: invoiceAmountUSDC.toString(),
      usdcBalance: usdcBalance.toString(),
      ethBalanceWei: ethBalanceWei.toString(),
      maxEthInWei: maxAmountIn.toString(),
      slippageBps,
      poolKey,
      reason: `Need ${formatUnits(maxAmountIn, 18)} ETH for swap`,
      preparedTransaction: null,
    };
  }

  return {
    status: 'READY',
    method: 'SWAP_EXACT_OUT',
    chain: 'sepolia',
    payerAddress,
    recipientAddress: invoiceData.walletAddress,
    invoiceAmountRaw: invoiceData.amount,
    invoiceAmountUSDC: invoiceAmountUSDC.toString(),
    usdcBalance: usdcBalance.toString(),
    ethBalanceWei: ethBalanceWei.toString(),
    maxEthInWei: maxAmountIn.toString(),
    slippageBps,
    poolKey,
    preparedTransaction: buildSwapAndPayTx(invoiceData.walletAddress, invoiceAmountUSDC, maxAmountIn),
  };
}

export const sepoliaMetaMaskConfig = {
  chainId: SEPOLIA_CHAIN_HEX,
  chainName: 'Sepolia',
  rpcUrls: ['https://rpc.sepolia.org'],
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};
