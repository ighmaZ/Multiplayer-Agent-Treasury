'use client';

import { Globe } from 'lucide-react';
import type { WalletData } from '@/app/types/treasury';

interface WalletBreakdownProps {
  wallets: WalletData[];
}

const CHAIN_COLORS: Record<string, string> = {
  'BASE-SEPOLIA': 'bg-blue-500',
  'ARC-TESTNET': 'bg-emerald-500',
};

export function WalletBreakdown({ wallets }: WalletBreakdownProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {wallets.map((wallet) => (
        <div
          key={wallet.id}
          className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-3 w-3 rounded-full ${CHAIN_COLORS[wallet.blockchain] || 'bg-zinc-400'}`} />
            <div>
              <div className="font-semibold text-zinc-900">{wallet.name}</div>
              <div className="text-xs font-mono text-zinc-400">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm font-bold text-zinc-900">
                ${wallet.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Token balances */}
          <div className="space-y-2">
            {wallet.balances.length === 0 ? (
              <div className="text-xs text-zinc-400 py-2">No tokens found</div>
            ) : (
              wallet.balances.map((balance, i) => (
                <div
                  key={`${balance.token}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-600 border border-zinc-200">
                      {balance.token.slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-zinc-700">{balance.token}</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{balance.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
