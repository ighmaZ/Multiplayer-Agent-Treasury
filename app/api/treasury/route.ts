// app/api/treasury/route.ts
// GET endpoint returning treasury dashboard data

import { NextResponse } from 'next/server';
import { getWalletTokenBalances, getTransactions } from '@/app/lib/services/circleService';
import type { TreasuryDashboardData, WalletData, TreasuryTransaction, TokenBalance } from '@/app/types/treasury';

const WALLETS_CONFIG = [
  {
    id: process.env.CIRCLE_BASE_SEPOLIA_WALLET_ID!,
    address: process.env.CIRCLE_BASE_SEPOLIA_WALLET_ADDRESS!,
    name: 'Base Sepolia',
    blockchain: 'BASE-SEPOLIA',
  },
  {
    id: process.env.CIRCLE_ARC_WALLET_ID!,
    address: process.env.CIRCLE_ARC_WALLET_ADDRESS!,
    name: 'Arc Testnet',
    blockchain: 'ARC-TESTNET',
  },
];

const WALLET_LABELS: Record<string, string> = {};
for (const w of WALLETS_CONFIG) {
  WALLET_LABELS[w.id] = w.name;
}

function tokenAmountToUsd(symbol: string, amount: string): number {
  const val = parseFloat(amount) || 0;
  // Stablecoins are ~1:1 USD. ETH approximated for testnet display only.
  if (symbol === 'USDC' || symbol === 'EURC' || symbol === 'USD') return val;
  if (symbol === 'ETH') return val * 2500; // rough approximation
  return val;
}

export async function GET() {
  try {
    // Fetch balances for each wallet + transactions in parallel
    const [basSepoliaBalances, arcBalances, transactions] = await Promise.all([
      getWalletTokenBalances(WALLETS_CONFIG[0].id),
      getWalletTokenBalances(WALLETS_CONFIG[1].id),
      getTransactions(
        WALLETS_CONFIG.map((w) => w.id),
        { pageSize: 20 }
      ),
    ]);

    const balancesByWallet = [basSepoliaBalances, arcBalances];

    // Build wallet data
    const wallets: WalletData[] = WALLETS_CONFIG.map((config, i) => {
      const rawBalances = balancesByWallet[i] || [];
      const balances: TokenBalance[] = rawBalances.map((b: any) => {
        const symbol = b.token?.symbol || b.token?.name || 'Unknown';
        const amount = b.amount || '0';
        return {
          token: symbol,
          amount,
          amountUsd: tokenAmountToUsd(symbol, amount),
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

    // Build transactions
    const txList: TreasuryTransaction[] = (transactions || []).map((tx: any) => ({
      id: tx.id,
      txHash: tx.txHash || null,
      state: tx.state || 'UNKNOWN',
      txType: tx.transactionType || 'UNKNOWN',
      operation: tx.operation || 'TRANSFER',
      amount: tx.amounts?.[0] || '0',
      token: tx.tokenId || '',
      sourceAddress: tx.sourceAddress || '',
      destinationAddress: tx.destinationAddress || '',
      createDate: tx.createDate || '',
      blockchain: tx.blockchain || '',
      walletName: WALLET_LABELS[tx.walletId] || tx.walletId || '',
      networkFee: tx.networkFee || null,
    }));

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
