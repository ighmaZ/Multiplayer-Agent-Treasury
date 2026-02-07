'use client';

import { DollarSign, Wallet, Coins } from 'lucide-react';

interface StatCardsProps {
  totalValueUsd: number;
  walletCount: number;
  assetCount: number;
}

export function StatCards({ totalValueUsd, walletCount, assetCount }: StatCardsProps) {
  const stats = [
    {
      label: 'Total Value',
      value: `$${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
    {
      label: 'Wallets',
      value: walletCount.toString(),
      icon: Wallet,
    },
    {
      label: 'Assets',
      value: assetCount.toString(),
      icon: Coins,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              {stat.label}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ccf437]/20 text-[#8ba300]">
              <stat.icon size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
