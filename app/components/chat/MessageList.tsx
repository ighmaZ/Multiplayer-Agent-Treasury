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
    <div className="space-y-4">
      {/* Processing Status */}
      {isLoading && (
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Processing invoice...
            </span>
          </div>
        </div>
      )}

      {/* PDF Processor Result */}
      {state?.invoiceData && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Invoice Extracted
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Wallet:</span>
              <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {state.invoiceData.walletAddress.slice(0, 10)}...{state.invoiceData.walletAddress.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Amount:</span>
              <span className="font-medium">{state.invoiceData.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Recipient:</span>
              <span>{state.invoiceData.recipient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Purpose:</span>
              <span className="max-w-[200px] truncate text-right">{state.invoiceData.purpose}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Scan Result */}
      {state?.securityScan && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Security Scan
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-500">Risk Score:</span>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-24 rounded-full ${
                  state.securityScan.riskScore >= 70
                    ? 'bg-red-200'
                    : state.securityScan.riskScore >= 40
                    ? 'bg-yellow-200'
                    : 'bg-green-200'
                }`}
              >
                <div
                  className={`h-full rounded-full ${
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
            <div className="space-y-1">
              {state.securityScan.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CFO Recommendation */}
      {state?.recommendation && (
        <div
          className={`rounded-lg border p-4 ${
            state.recommendation.recommendation === 'APPROVE'
              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
              : state.recommendation.recommendation === 'REVIEW'
              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'
              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              CFO Recommendation
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2">
            {state.recommendation.recommendation === 'APPROVE' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  APPROVE
                </span>
              </>
            )}
            {state.recommendation.recommendation === 'REVIEW' && (
              <>
                <HelpCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                  REVIEW
                </span>
              </>
            )}
            {state.recommendation.recommendation === 'REJECT' && (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-lg font-bold text-red-700 dark:text-red-400">
                  REJECT
                </span>
              </>
            )}
          </div>

          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            {state.recommendation.summary}
          </p>

          <div className="space-y-1">
            {state.recommendation.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1 w-1 rounded-full bg-zinc-400" />
                <span className="text-zinc-600 dark:text-zinc-400">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">
              Error
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {state.error}
          </p>
        </div>
      )}
    </div>
  );
}
