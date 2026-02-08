// app/api/treasury/route.ts
// GET endpoint returning treasury dashboard data

import { NextResponse } from 'next/server';
import { getWalletTokenBalances, getTransactions } from '@/app/lib/services/circleService';
import type { TreasuryDashboardData, WalletData, TreasuryTransaction, TokenBalance } from '@/app/types/treasury';

const WALLETS_CONFIG = [
  {
    id: process.env.NEXT_PUBLIC_CIRCLE_ETH_SEPOLIA_WALLET_ID!,
    address: process.env.CIRCLE_ETH_SEPOLIA_WALLET_ADDRESS!,
    name: 'ETH Sepolia',
    blockchain: 'ETH-SEPOLIA',
  },
  {
    id: process.env.NEXT_PUBLIC_CIRCLE_ARC_WALLET_ID!,
    address: process.env.CIRCLE_ARC_WALLET_ADDRESS!,
    name: 'Arc Testnet',
    blockchain: 'ARC-TESTNET',
  },
];

const WALLET_LABELS: Record<string, string> = {};
for (const w of WALLETS_CONFIG) {
  WALLET_LABELS[w.id] = w.name;
}

// Circle token ID → symbol mapping (built from balance queries)
const TOKEN_ID_TO_SYMBOL: Record<string, string> = {};

// DIA Oracle API — fetch live USD prices for tokens
const DIA_API_BASE = 'https://api.diadata.org/v1/quotation';

interface DiaQuotation {
  Symbol: string;
  Price: number;
}

// Cache prices for 60 seconds to avoid hammering the API
let priceCache: { prices: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchLivePrices(): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL_MS) {
    return priceCache.prices;
  }

  const symbols = ['ETH', 'EURC'];
  const results: Record<string, number> = {
    USDC: 1, // USDC is pegged 1:1
    USD: 1,
  };

  const fetches = symbols.map(async (symbol) => {
    try {
      const res = await fetch(`${DIA_API_BASE}/${symbol}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data: DiaQuotation = await res.json();
        results[symbol] = data.Price;
      }
    } catch {
      // Fallback prices if DIA is unreachable
      if (symbol === 'ETH') results.ETH = 2500;
      if (symbol === 'EURC') results.EURC = 1.10;
    }
  });

  await Promise.all(fetches);

  priceCache = { prices: results, fetchedAt: Date.now() };
  return results;
}

function tokenAmountToUsd(symbol: string, amount: string, prices: Record<string, number>): number {
  const val = parseFloat(amount) || 0;

  // Normalize symbol — Circle returns "ETH-SEPOLIA" for testnet ETH
  const normalized = symbol.replace('-SEPOLIA', '').toUpperCase();

  if (prices[normalized] !== undefined) {
    return val * prices[normalized];
  }

  // Fallback: treat unknown tokens as 0
  return 0;
}

export async function GET() {
  try {
    // Fetch balances, transactions, and live prices in parallel
    const [ethSepoliaBalances, arcBalances, transactions, prices] = await Promise.all([
      getWalletTokenBalances(WALLETS_CONFIG[0].id),
      getWalletTokenBalances(WALLETS_CONFIG[1].id),
      getTransactions(
        WALLETS_CONFIG.map((w) => w.id),
        { pageSize: 20 }
      ),
      fetchLivePrices(),
    ]);

    const balancesByWallet = [ethSepoliaBalances, arcBalances];

    // Build token ID → symbol mapping from balance data
    for (const balances of balancesByWallet) {
      for (const b of balances as any[]) {
        if (b.token?.id && b.token?.symbol) {
          TOKEN_ID_TO_SYMBOL[b.token.id] = b.token.symbol;
        }
      }
    }

    // Build wallet data
    const wallets: WalletData[] = WALLETS_CONFIG.map((config, i) => {
      const rawBalances = balancesByWallet[i] || [];
      const balances: TokenBalance[] = rawBalances.map((b: any) => {
        const symbol = b.token?.symbol || b.token?.name || 'Unknown';
        const amount = b.amount || '0';
        return {
          token: symbol,
          amount,
          amountUsd: tokenAmountToUsd(symbol, amount, prices),
          blockchain: config.blockchain,
        };
      });
      const totalValueUsd = balances.reduce((sum, b) => sum + b.amountUsd, 0);
      return {
        id: config.id,
        address: config.address,
        name: config.name,
        blockchain: config.blockchain,
        balances,
        totalValueUsd,
      };
    });

    // Build transactions — resolve token IDs to symbols
    const txList: TreasuryTransaction[] = (transactions || []).map((tx: any) => {
      // Resolve token symbol from tokenId
      const tokenSymbol = tx.tokenId
        ? (TOKEN_ID_TO_SYMBOL[tx.tokenId] || tx.tokenId)
        : (tx.operation === 'CONTRACT_EXECUTION' ? 'ETH' : '');

      // Amount: use amounts[] array first, fall back to singular amount
      const amount = tx.amounts?.[0] || tx.amount || '0';

      return {
        id: tx.id,
        txHash: tx.txHash || null,
        state: tx.state || 'UNKNOWN',
        txType: tx.transactionType || 'UNKNOWN',
        operation: tx.operation || 'TRANSFER',
        amount,
        token: tokenSymbol,
        sourceAddress: tx.sourceAddress || '',
        destinationAddress: tx.destinationAddress || '',
        createDate: tx.createDate || '',
        blockchain: tx.blockchain || '',
        walletName: WALLET_LABELS[tx.walletId] || tx.walletId || '',
        networkFee: tx.networkFee || null,
      };
    });

    // Aggregate stats
    const totalValueUsd = wallets.reduce((sum, w) => sum + w.totalValueUsd, 0);
    const allTokens = new Set<string>();
    wallets.forEach((w) => w.balances.forEach((b) => allTokens.add(b.token)));

    const data: TreasuryDashboardData = {
      totalValueUsd,
      walletCount: wallets.length,
      assetCount: allTokens.size,
      wallets,
      transactions: txList,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Treasury API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch treasury data' },
      { status: 500 }
    );
  }
}
