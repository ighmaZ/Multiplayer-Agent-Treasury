// lib/agents/state.ts
// LangGraph agent state definition

import { InvoiceData, SecurityScan, CFORecommendation } from '@/app/types';

/**
 * Agent state that flows through the LangGraph workflow
 * This state is passed between nodes and accumulates results
 */
export interface AgentState {
  // Input
  pdfBuffer: Buffer | null;
  fileName: string;
  
  // Processing status for visualization
  currentStep: 'idle' | 'extracting' | 'scanning' | 'analyzing' | 'complete' | 'error';
  
  // Results from each agent
  invoiceData: InvoiceData | null;
  securityScan: SecurityScan | null;
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
 * Initial state factory
 */
export function createInitialState(pdfBuffer: Buffer, fileName: string): AgentState {
  return {
    pdfBuffer,
    fileName,
    currentStep: 'idle',
    invoiceData: null,
    securityScan: null,
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
