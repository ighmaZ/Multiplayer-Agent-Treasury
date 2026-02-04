// components/chat/MessageList.tsx
// Displays chat messages and agent results

'use client';

import { AgentState } from '@/app/lib/agents/state';
import { FileText, Shield, Brain, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface MessageListProps {
  state: AgentState | null;
  isLoading: boolean;
}

export function MessageList({ state, isLoading }: MessageListProps) {
  if (!state && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        <p className="text-sm">Upload an invoice PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Processing Status */}
      {isLoading && (
        <div className="rounded-xl border border-dashed border-[#ccf437] bg-[#ccf437]/10 p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
            <span className="text-sm font-medium text-black">
              Processing invoice...
            </span>
          </div>
        </div>
      )}

      {/* PDF Processor Result */}
      {state?.invoiceData && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
               <FileText className="h-4 w-4" />
            </div>
            <span className="font-semibold text-zinc-900">
              Invoice Extracted
            </span>
          </div>
          
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Wallet</span>
              <code className="rounded bg-zinc-50 px-2 py-1 text-xs text-zinc-600 border border-zinc-100 font-mono">
                {state.invoiceData.walletAddress.slice(0, 10)}...{state.invoiceData.walletAddress.slice(-8)}
              </code>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Amount</span>
              <span className="font-semibold text-zinc-900">{state.invoiceData.amount}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recipient</span>
              <span className="text-zinc-700">{state.invoiceData.recipient}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Purpose</span>
              <span className="truncate text-zinc-700">{state.invoiceData.purpose}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Scan Result */}
      {state?.securityScan && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                <Shield className="h-4 w-4" />
            </div>
            <span className="font-semibold text-zinc-900">
              Security Scan
            </span>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500">Risk Score</span>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-32 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    state.securityScan.riskScore >= 70
                      ? 'bg-red-500'
                      : state.securityScan.riskScore >= 40
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${state.securityScan.riskScore}%` }}
                />
              </div>
              <span
                className={`text-sm font-bold ${
                    state.securityScan.riskScore >= 70
                    ? 'text-red-600'
                    : state.securityScan.riskScore >= 40
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {state.securityScan.riskScore}/100
              </span>
            </div>
          </div>

          {state.securityScan.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
              <div className="space-y-2">
                {state.securityScan.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CFO Recommendation */}
      {state?.recommendation && (
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            state.recommendation.recommendation === 'APPROVE'
              ? 'border-green-200 bg-green-50/50'
              : state.recommendation.recommendation === 'REVIEW'
              ? 'border-yellow-200 bg-yellow-50/50'
              : 'border-red-200 bg-red-50/50'
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                 state.recommendation.recommendation === 'APPROVE'
                  ? 'bg-green-100 text-green-700'
                  : state.recommendation.recommendation === 'REVIEW'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
                <Brain className="h-4 w-4" />
            </div>
            <span className="font-semibold text-zinc-900">
              CFO Recommendation
            </span>
          </div>

          <div className="mb-4 flex items-center gap-2">
            {state.recommendation.recommendation === 'APPROVE' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-lg font-bold text-green-700">
                  APPROVE
                </span>
              </>
            )}
            {state.recommendation.recommendation === 'REVIEW' && (
              <>
                <HelpCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-lg font-bold text-yellow-700">
                  REVIEW
                </span>
              </>
            )}
            {state.recommendation.recommendation === 'REJECT' && (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-lg font-bold text-red-700">
                  REJECT
                </span>
              </>
            )}
          </div>

          <p className="mb-4 text-sm text-zinc-700 leading-relaxed">
            {state.recommendation.summary}
          </p>

          <div className="space-y-2 pl-1 border-l-2 border-zinc-200 ml-1">
            {state.recommendation.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs pl-3">
                 <span className="text-zinc-600 leading-snug">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900">
              Error
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700">
            {state.error}
          </p>
        </div>
      )}
    </div>
  );
}

