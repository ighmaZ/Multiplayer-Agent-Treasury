'use client';

import type { WalletData } from '@/app/types/treasury';

interface TokenHoldingsTableProps {
  wallets: WalletData[];
}

export function TokenHoldingsTable({ wallets }: TokenHoldingsTableProps) {
  // Aggregate tokens across all wallets
  const tokenMap = new Map<string, Record<string, string>>();

  for (const wallet of wallets) {
    for (const balance of wallet.balances) {
      if (!tokenMap.has(balance.token)) {
        tokenMap.set(balance.token, {});
      }
      tokenMap.get(balance.token)![wallet.name] = balance.amount;
    }
  }

  const walletNames = wallets.map((w) => w.name);

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="font-semibold text-zinc-900">Token Holdings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                Token
              </th>
              {walletNames.map((name) => (
                <th
                  key={name}
                  className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  {name}
                </th>
              ))}
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(tokenMap.entries()).map(([token, amounts]) => {
              const total = walletNames.reduce((sum, name) => {
                return sum + (parseFloat(amounts[name] || '0') || 0);
              }, 0);
              return (
                <tr key={token} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ccf437]/20 text-xs font-bold text-zinc-700">
                        {token.slice(0, 2)}
                      </div>
                      <span className="font-medium text-zinc-900">{token}</span>
                    </div>
                  </td>
                  {walletNames.map((name) => (
                    <td key={name} className="px-5 py-3 text-right font-mono text-zinc-600">
                      {amounts[name] || '—'}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-900">
                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                </tr>
              );
            })}
            {tokenMap.size === 0 && (
              <tr>
                <td colSpan={walletNames.length + 2} className="px-5 py-8 text-center text-zinc-400">
                  No tokens found in any wallet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
