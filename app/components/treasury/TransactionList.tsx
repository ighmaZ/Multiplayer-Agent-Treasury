'use client';

import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { TreasuryTransaction } from '@/app/types/treasury';

interface TransactionListProps {
  transactions: TreasuryTransaction[];
}

const STATE_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  COMPLETE: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Complete' },
  COMPLETED: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Completed' },
  CONFIRMED: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Confirmed' },
  PENDING: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  CONFIRMING: { icon: Clock, color: 'text-amber-500', label: 'Confirming' },
  FAILED: { icon: XCircle, color: 'text-rose-500', label: 'Failed' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="font-semibold text-zinc-900">Recent Transactions</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-12 text-center text-zinc-400 text-sm">
          No transactions yet
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {transactions.map((tx) => {
            const isInbound = tx.txType === 'INBOUND';
            const stateConfig = STATE_CONFIG[tx.state] || STATE_CONFIG.PENDING;
            const StateIcon = stateConfig.icon;
            const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;

            return (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3">
                {/* Direction icon */}
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                    isInbound ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <DirectionIcon size={16} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">
                      {isInbound ? 'Received' : 'Sent'}
                    </span>
                    <span className="text-xs text-zinc-400">{tx.walletName}</span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {isInbound ? 'From' : 'To'}: {truncateAddress(isInbound ? tx.sourceAddress : tx.destinationAddress)}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-semibold ${isInbound ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    {isInbound ? '+' : '-'}{tx.amount}{tx.token ? ` ${tx.token}` : ''}
                  </div>
                  <div className="text-xs text-zinc-400">{formatDate(tx.createDate)}</div>
                </div>

                {/* Status */}
                <div className={`flex-shrink-0 ${stateConfig.color}`}>
                  <StateIcon size={16} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
