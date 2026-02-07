'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { StatCards } from '@/app/components/treasury/StatCards';
import { WalletBreakdown } from '@/app/components/treasury/WalletBreakdown';
import { TokenHoldingsTable } from '@/app/components/treasury/TokenHoldingsTable';
import { TransactionList } from '@/app/components/treasury/TransactionList';
import type { TreasuryDashboardData } from '@/app/types/treasury';

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/treasury');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch treasury data');
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-100" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center max-w-md">
          <p className="text-sm font-medium text-rose-600 mb-3">{error}</p>
          <button
            onClick={() => fetchData()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Treasury</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Multi-chain wallet overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <StatCards
          totalValueUsd={data.totalValueUsd}
          walletCount={data.walletCount}
          assetCount={data.assetCount}
        />

        {/* Wallet breakdown */}
        <WalletBreakdown wallets={data.wallets} />

        {/* Token holdings table */}
        <TokenHoldingsTable wallets={data.wallets} />

        {/* Recent transactions */}
        <TransactionList transactions={data.transactions} />
      </div>
    </div>
  );
}
