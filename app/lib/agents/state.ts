// lib/agents/state.ts
// LangGraph agent state definition

import { InvoiceData, SecurityScan, CFORecommendation, PaymentPlan } from '@/app/types';

/**
 * Agent state that flows through the LangGraph workflow
 * This state is passed between nodes and accumulates results
 */
export interface AgentState {
  // Input
  pdfBuffer: Buffer | null;
  fileName: string;
  payerAddress: string | null;
  
  // Processing status for visualization
  currentStep: 'idle' | 'extracting' | 'scanning' | 'planning' | 'analyzing' | 'complete' | 'error';
  
  // Results from each agent
  invoiceData: InvoiceData | null;
  securityScan: SecurityScan | null;
  paymentPlan: PaymentPlan | null;
  recommendation: CFORecommendation | null;
  
  // Trace logs for visualization
  logs: AgentLog[];
  
  // Errors
  error: string | null;
}

/**
 * Log entry for agent trace visualization
 */
export interface AgentLog {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: Date;
  message: string;
  data?: any;
}

/**
 * Enhanced thinking log for real-time AI reasoning display
 */
export interface ThinkingLog {
  id: string;
  step: 'pdfProcessor' | 'walletScanner' | 'paymentPlan' | 'cfoAssistant' | 'complete';
  status: 'pending' | 'thinking' | 'processing' | 'success' | 'error';
  title: string;
  icon: 'file' | 'shield' | 'wallet' | 'brain' | 'check';
  reasoning: string;
  details?: string[];
  progress?: number;
  data?: any;
  timestamp: Date;
}

/**
 * Initial state factory
 */
export function createInitialState(pdfBuffer: Buffer, fileName: string, payerAddress?: string): AgentState {
  return {
    pdfBuffer,
    fileName,
    payerAddress: payerAddress ?? null,
    currentStep: 'idle',
    invoiceData: null,
    securityScan: null,
    paymentPlan: null,
    recommendation: null,
    logs: [],
    error: null,
  };
}

/**
 * Helper to add a log entry to state
 */
export function addLog(
  state: AgentState,
  step: string,
  status: AgentLog['status'],
  message: string,
  data?: any
): AgentState {
  return {
    ...state,
    logs: [
      ...state.logs,
      {
        step,
        status,
        timestamp: new Date(),
        message,
        data,
      },
    ],
  };
}

/**
 * Create a thinking log entry for real-time streaming
 */
export function createThinkingLog(
  step: ThinkingLog['step'],
  status: ThinkingLog['status'],
  reasoning: string,
  options?: {
    title?: string;
    icon?: ThinkingLog['icon'];
    details?: string[];
    progress?: number;
    data?: any;
  }
): ThinkingLog {
  const stepConfig = {
    pdfProcessor: { title: 'Extracting Invoice Data', icon: 'file' as const },
    walletScanner: { title: 'Scanning Wallet Security', icon: 'shield' as const },
    paymentPlan: { title: 'Preparing Payment Plan', icon: 'wallet' as const },
    cfoAssistant: { title: 'Analyzing with CFO Assistant', icon: 'brain' as const },
    complete: { title: 'Analysis Complete', icon: 'check' as const },
  };

  const config = stepConfig[step];

  return {
    id: `${step}-${Date.now()}`,
    step,
    status,
    title: options?.title || config.title,
    icon: options?.icon || config.icon,
    reasoning,
    details: options?.details || [],
    progress: options?.progress,
    data: options?.data,
    timestamp: new Date(),
  };
}
