// lib/agents/nodes/paymentPlanner.ts
// Builds a swap/payment plan using Uniswap v4 SDK

import { buildPaymentPlan } from '@/app/lib/services/paymentPlanner';
import { AgentState, addLog } from '../state';

/**
 * Payment Planner Node
 * Computes wallet balances, swap quotes, and prepared MetaMask transaction data.
 */
export async function paymentPlannerNode(state: AgentState): Promise<AgentState> {
  console.log('💳 Payment Planner Node: Preparing swap plan...');

  try {
    let updatedState = addLog(
      state,
      'paymentPlan',
      'running',
      'Fetching balances and building swap plan...'
    );

    if (!state.invoiceData) {
      throw new Error('No invoice data available for payment planning');
    }

    if (!state.payerAddress) {
      throw new Error('No payer wallet address provided for payment planning');
    }

    const paymentPlan = await buildPaymentPlan(state.invoiceData, state.payerAddress);

    updatedState = {
      ...updatedState,
      paymentPlan,
      currentStep: 'analyzing',
    };

    updatedState = addLog(
      updatedState,
      'paymentPlan',
      'success',
      `Payment plan: ${paymentPlan.method} (${paymentPlan.status})`,
      {
        status: paymentPlan.status,
        method: paymentPlan.method,
        prepared: Boolean(paymentPlan.preparedTransaction),
      }
    );

    console.log('✅ Payment Planner Node: Completed');
    return updatedState;
  } catch (error) {
    console.error('❌ Payment Planner Node Error:', error);

    const errorState = addLog(
      state,
      'paymentPlan',
      'error',
      error instanceof Error ? error.message : 'Unknown error during payment planning'
    );

    return {
      ...errorState,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
