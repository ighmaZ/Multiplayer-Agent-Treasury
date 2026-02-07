// components/chat/MessageList.tsx
// Displays chat messages and agent results with premium UI design

'use client';

import { formatUnits } from 'viem';
import { 
  FileText, 
  Shield, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Wallet,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react';
import { AgentState } from '@/app/lib/agents/state';

interface MessageListProps {
  state: AgentState | null;
  isLoading: boolean;
  onApprove?: () => void;
  isApproving?: boolean;
}

function formatTokenAmount(value: string | null | undefined, decimals: number, symbol: string) {
  if (!value) return 'N/A';
  try {
    return `${formatUnits(BigInt(value), decimals)} ${symbol}`;
  } catch {
    return `${value} ${symbol}`;
  }
}

// Step indicator component for visual progress
function StepIndicator({ step, isComplete, isActive }: { step: number; isComplete: boolean; isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
        ${isComplete 
          ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-white shadow-lg shadow-zinc-900/30' 
          : isActive 
            ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-white ring-2 ring-zinc-400/50 ring-offset-2 ring-offset-white' 
            : 'bg-zinc-100 text-zinc-400'
        }
      `}>
        {isComplete ? <CheckCircle className="h-4 w-4" /> : step}
      </div>
    </div>
  );
}

// Card wrapper with consistent styling
function Card({ 
  children, 
  className = '', 
  gradient = false,
  accentColor = 'zinc'
}: { 
  children: React.ReactNode; 
  className?: string; 
  gradient?: boolean;
  accentColor?: 'zinc' | 'blue' | 'yellow' | 'red';
}) {
  const accentStyles = {
    zinc: 'border-zinc-200/80 hover:border-zinc-300',
    blue: 'border-[#ccf437]/40 bg-gradient-to-br from-[#ccf437]/10/80 to-[#ccf437]/15/50',
    yellow: 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/50',
    red: 'border-red-200 bg-gradient-to-br from-red-50/80 to-rose-50/50'
  };

  return (
    <div className={`
      group relative overflow-hidden rounded-2xl border bg-white p-6 
      shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl
      transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)]
      ${accentStyles[accentColor]}
      ${gradient ? 'bg-gradient-to-br from-white via-white to-zinc-50/80' : ''}
      ${className}
    `}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/0 to-zinc-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.02]" />
      <div className="relative">{children}</div>
    </div>
  );
}

// Card header component
function CardHeader({ 
  icon: Icon, 
  title, 
  step,
  isComplete = true,
  badge
}: { 
  icon: React.ElementType; 
  title: string; 
  step: number;
  isComplete?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <StepIndicator step={step} isComplete={isComplete} isActive={!isComplete} />
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-600 shadow-sm ring-1 ring-zinc-200/50">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-semibold text-zinc-900">{title}</span>
        </div>
      </div>
      {badge}
    </div>
  );
}

// Data field component for consistent styling
function DataField({ 
  label, 
  value, 
  isCode = false,
  highlight = false,
  size = 'default'
}: { 
  label: string; 
  value: React.ReactNode; 
  isCode?: boolean;
  highlight?: boolean;
  size?: 'default' | 'large';
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {isCode ? (
        <code className="inline-flex items-center rounded-lg bg-gradient-to-r from-zinc-50 to-zinc-100/50 px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200/60 font-mono">
          {value}
        </code>
      ) : (
        <span className={`
          ${size === 'large' ? 'text-lg font-bold' : 'text-sm font-medium'}
          ${highlight ? 'text-zinc-900' : 'text-zinc-700'}
        `}>
          {value}
        </span>
      )}
    </div>
  );
}

export function MessageList({ state, isLoading, onApprove, isApproving }: MessageListProps) {
  if (!state && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 shadow-inner">
            <FileText className="h-7 w-7 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Upload an invoice PDF to get started</p>
        </div>
      </div>
    );
  }

  const hasInvoice = Boolean(state?.invoiceData);
  const hasSecurity = Boolean(state?.securityScan);
  const hasPayment = Boolean(state?.paymentPlan);
  const hasRecommendation = Boolean(state?.recommendation);

  return (
    <div className="flex flex-col gap-5">
      {/* Processing Status */}
      {isLoading && (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-300/60 bg-gradient-to-r from-zinc-100/80 via-zinc-50/50 to-transparent p-5">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.03),transparent)] animate-[shimmer_2s_infinite]" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg shadow-zinc-900/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            </div>
            <div>
              <span className="block text-sm font-semibold text-zinc-900">
                Processing invoice...
              </span>
              <span className="text-xs text-zinc-500">Extracting data and analyzing security</span>
            </div>
          </div>
        </div>
      )}

      {/* PDF Processor Result */}
      {state?.invoiceData && (
        <Card gradient>
          <CardHeader 
            icon={FileText} 
            title="Invoice Extracted" 
            step={1}
            isComplete={hasInvoice}
       
          />
          
          <div className="grid gap-4 sm:grid-cols-2">
            <DataField 
              label="Wallet Address" 
              value={`${state.invoiceData.walletAddress.slice(0, 10)}...${state.invoiceData.walletAddress.slice(-8)}`}
              isCode
            />
            <DataField 
              label="Amount" 
              value={state.invoiceData.amount}
              highlight
              size="large"
            />
            <DataField 
              label="Recipient" 
              value={state.invoiceData.recipient}
            />
            <DataField 
              label="Purpose" 
              value={state.invoiceData.purpose}
            />
          </div>
        </Card>
      )}

      {/* Security Scan Result */}
      {state?.securityScan && (
        <Card gradient>
          <CardHeader 
            icon={Shield} 
            title="Security Scan" 
            step={2}
            isComplete={hasSecurity}
            badge={
              <div className={`
                flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold
                ${state.securityScan.riskScore >= 70
                  ? 'bg-red-100 text-red-700'
                  : state.securityScan.riskScore >= 40
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#ccf437]/20 text-[#8ab320]'
                }
              `}>
                {state.securityScan.riskScore >= 70 ? 'High Risk' : state.securityScan.riskScore >= 40 ? 'Medium Risk' : 'Low Risk'}
              </div>
            }
          />

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600">Risk Assessment</span>
              <span className={`
                text-2xl font-bold tabular-nums
                ${state.securityScan.riskScore >= 70
                  ? 'text-red-600'
                  : state.securityScan.riskScore >= 40
                  ? 'text-amber-600'
                  : 'text-[#a8cc2a]'
                }
              `}>
                {state.securityScan.riskScore}<span className="text-sm font-medium text-zinc-400">/100</span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  state.securityScan.riskScore >= 70
                    ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-lg shadow-red-500/30'
                    : state.securityScan.riskScore >= 40
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30'
                    : 'bg-gradient-to-r from-[#ccf437] to-[#a8cc2a] shadow-lg shadow-[#ccf437]/30'
                }`}
                style={{ width: `${Math.max(state.securityScan.riskScore, 3)}%` }}
              />
            </div>
          </div>

          {state.securityScan.warnings.length > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 ring-1 ring-amber-200/60">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Warnings Detected</span>
              </div>
              <div className="space-y-2">
                {state.securityScan.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm text-amber-800">
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                    <span className="leading-relaxed">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Payment Plan */}
      {state?.paymentPlan && (
        <Card gradient>
          <CardHeader 
            icon={Wallet} 
            title="Payment Plan" 
            step={3}
            isComplete={hasPayment}
            badge={
              <div className={`
                flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide
                ${state.paymentPlan.status === 'READY'
                  ? 'bg-[#ccf437]/20 text-[#8ab320] ring-1 ring-[#ccf437]/40'
                  : state.paymentPlan.status === 'INSUFFICIENT_FUNDS'
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-red-100 text-red-700 ring-1 ring-red-200'
                }
              `}>
                <div className={`h-1.5 w-1.5 rounded-full ${
                  state.paymentPlan.status === 'READY' ? 'bg-[#ccf437] animate-pulse' : 
                  state.paymentPlan.status === 'INSUFFICIENT_FUNDS' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                {state.paymentPlan.status}
              </div>
            }
          />

          {/* Method highlight */}
          <div className="mb-5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-4 text-white shadow-lg">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Payment Method</div>
            <div className="flex items-center gap-2 text-base font-semibold">
              {state.paymentPlan.method === 'DIRECT_USDC_TRANSFER' ? (
                <>
                  <span>Direct USDC Transfer</span>
                </>
              ) : (
                <>
                  <span>Swap ETH</span>
                  <ArrowRight className="h-4 w-4 text-white/70" />
                  <span>USDC</span>
                  <span className="ml-1 text-xs font-medium text-zinc-400">(Exact Output)</span>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DataField 
              label="Invoice Amount" 
              value={state.paymentPlan.invoiceAmountUSDC
                ? formatTokenAmount(state.paymentPlan.invoiceAmountUSDC, 6, 'USDC')
                : state.invoiceData?.amount}
              highlight
            />
            <DataField 
              label="Slippage Tolerance" 
              value={`${(state.paymentPlan.slippageBps / 100).toFixed(2)}%`}
            />
            <DataField 
              label="USDC Balance" 
              value={formatTokenAmount(state.paymentPlan.usdcBalance, 6, 'USDC')}
            />
            <DataField 
              label="ETH Balance" 
              value={formatTokenAmount(state.paymentPlan.ethBalanceWei, 18, 'ETH')}
            />
            {state.paymentPlan.maxEthInWei && (
              <DataField 
                label="Max ETH Required" 
                value={formatTokenAmount(state.paymentPlan.maxEthInWei, 18, 'ETH')}
                highlight
              />
            )}
            <DataField 
              label="Recipient" 
              value={`${state.paymentPlan.recipientAddress.slice(0, 10)}...${state.paymentPlan.recipientAddress.slice(-8)}`}
              isCode
            />
          </div>

          {state.paymentPlan.reason && (
            <div className="mt-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 ring-1 ring-amber-200/60">
              <div className="flex items-start gap-2.5 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <span className="leading-relaxed">{state.paymentPlan.reason}</span>
              </div>
            </div>
          )}

          {state.paymentPlan.preparedTransaction && (
            <div className="mt-5 rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Prepared Transaction</span>
              </div>
              <div className="space-y-2 font-mono text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">To:</span>
                  <code className="rounded bg-white px-2 py-0.5 ring-1 ring-zinc-200">{state.paymentPlan.preparedTransaction.to}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Value:</span>
                  <code className="rounded bg-white px-2 py-0.5 ring-1 ring-zinc-200">{formatTokenAmount(state.paymentPlan.preparedTransaction.value, 18, 'ETH')}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Purpose:</span>
                  <span className="text-zinc-700">{state.paymentPlan.preparedTransaction.description}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {state.paymentPlan.status === 'READY' && state.paymentPlan.preparedTransaction && onApprove && (
              <button
                onClick={onApprove}
                disabled={isApproving || Boolean(state.paymentPlan.submittedTxHash)}
                className={`
                  group relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all duration-200
                  ${isApproving || state.paymentPlan.submittedTxHash
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-zinc-900 to-black text-white shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/30 hover:-translate-y-0.5 active:translate-y-0'
                  }
                `}
              >
                {state.paymentPlan.submittedTxHash ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-[#ccf437]" />
                    Transaction Submitted
                  </>
                ) : isApproving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Awaiting MetaMask...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Approve & Pay in MetaMask
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            )}

            {state.paymentPlan.submittedTxHash && (
              <div className="flex items-center gap-2 rounded-xl bg-[#ccf437]/10 px-4 py-3 ring-1 ring-[#ccf437]/40/60">
                <CheckCircle className="h-4 w-4 text-[#a8cc2a]" />
                <span className="text-sm font-medium text-[#6b8c18]">Transaction submitted:</span>
                <code className="text-xs text-[#8ab320] font-mono">
                  {state.paymentPlan.submittedTxHash.slice(0, 10)}...{state.paymentPlan.submittedTxHash.slice(-8)}
                </code>
                <ExternalLink className="h-3.5 w-3.5 text-[#a8cc2a] ml-auto cursor-pointer hover:text-[#6b8c18]" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* CFO Recommendation */}
      {state?.recommendation && (
        <Card 
          accentColor={
            state.recommendation.recommendation === 'APPROVE' ? 'blue' :
            state.recommendation.recommendation === 'REVIEW' ? 'yellow' : 'red'
          }
        >
          <CardHeader 
            icon={Brain} 
            title="CFO Recommendation" 
            step={4}
            isComplete={hasRecommendation}
         
          />

          {/* Large recommendation badge */}
          <div className={`
            mb-5 inline-flex items-center gap-3 rounded-2xl px-5 py-3
            ${state.recommendation.recommendation === 'APPROVE'
              ? 'bg-gradient-to-r from-[#ccf437]/20 to-[#ccf437]/25 ring-1 ring-[#ccf437]/40'
              : state.recommendation.recommendation === 'REVIEW'
              ? 'bg-gradient-to-r from-amber-100 to-yellow-100 ring-1 ring-amber-200'
              : 'bg-gradient-to-r from-red-100 to-rose-100 ring-1 ring-red-200'
            }
          `}>
            {state.recommendation.recommendation === 'APPROVE' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ccf437] text-black shadow-lg shadow-[#ccf437]/40">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900">APPROVE</div>
                  <div className="text-xs text-zinc-600">Recommended for payment</div>
                </div>
              </>
            )}
            {state.recommendation.recommendation === 'REVIEW' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-amber-800">REVIEW</div>
                  <div className="text-xs text-amber-600">Requires manual review</div>
                </div>
              </>
            )}
            {state.recommendation.recommendation === 'REJECT' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/30">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-red-800">REJECT</div>
                  <div className="text-xs text-red-600">Payment not recommended</div>
                </div>
              </>
            )}
          </div>

          <p className="mb-5 text-sm text-zinc-700 leading-relaxed">
            {state.recommendation.summary}
          </p>

          <div className={`
            rounded-xl p-4
            ${state.recommendation.recommendation === 'APPROVE'
              ? 'bg-[#ccf437]/10/50 ring-1 ring-[#ccf437]/40/50'
              : state.recommendation.recommendation === 'REVIEW'
              ? 'bg-amber-50/50 ring-1 ring-amber-200/50'
              : 'bg-red-50/50 ring-1 ring-red-200/50'
            }
          `}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Analysis Details
            </div>
            <div className="space-y-2.5">
              {state.recommendation.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className={`
                    mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full
                    ${state.recommendation.recommendation === 'APPROVE'
                      ? 'bg-[#ccf437]'
                      : state.recommendation.recommendation === 'REVIEW'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                    }
                  `} />
                  <span className="text-zinc-700 leading-relaxed">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {state?.error && (
        <Card accentColor="red">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-inner">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="block text-sm font-semibold text-red-900 mb-1">
                Error Occurred
              </span>
              <p className="text-sm text-red-700 leading-relaxed">
                {state.error}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
