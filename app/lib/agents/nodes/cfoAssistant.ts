// lib/agents/nodes/cfoAssistant.ts
// CFO Assistant Agent Node - Generates final recommendation

import { generateCFORecommendation } from '@/app/lib/services/geminiService';
import { AgentState, addLog } from '../state';

/**
 * CFO Assistant Node
 * Analyzes invoice data and security scan to provide final recommendation
 */
export async function cfoAssistantNode(state: AgentState): Promise<AgentState> {
  console.log('🤖 CFO Assistant Node: Generating recommendation...');
  
  try {
    // Update state to show we're analyzing
    let updatedState = addLog(
      state,
      'cfoAssistant',
      'running',
      'Analyzing data and generating recommendation...'
    );
    
    // Check if we have all required data
    if (!state.invoiceData) {
      throw new Error('No invoice data available for analysis');
    }
    
    if (!state.securityScan) {
      throw new Error('No security scan data available for analysis');
    }
    if (!state.paymentPlan) {
      throw new Error('No payment plan available for analysis');
    }
    
    // Generate recommendation using Gemini
    const recommendation = await generateCFORecommendation(
      state.invoiceData,
      {
        riskScore: state.securityScan.riskScore,
        isContract: state.securityScan.isContract,
        isVerified: state.securityScan.isVerified,
        hasMaliciousLabel: state.securityScan.hasMaliciousLabel,
        warnings: state.securityScan.warnings,
      },
      state.paymentPlan
    );
    
    // Update state with recommendation
    updatedState = {
      ...updatedState,
      recommendation,
      currentStep: 'complete',
    };
    
    // Add success log
    const recEmoji = recommendation.recommendation === 'APPROVE' 
      ? '✅' 
      : recommendation.recommendation === 'REVIEW' 
        ? '⚠️' 
        : '❌';
    
    updatedState = addLog(
      updatedState,
      'cfoAssistant',
      'success',
      `${recEmoji} Recommendation: ${recommendation.recommendation} - ${recommendation.summary}`,
      {
        recommendation: recommendation.recommendation,
        riskLevel: recommendation.riskLevel,
        summary: recommendation.summary,
      }
    );
    
    console.log('✅ CFO Assistant Node: Recommendation generated');
    return updatedState;
    
  } catch (error) {
    console.error('❌ CFO Assistant Node Error:', error);
    
    // Add error log
    const errorState = addLog(
      state,
      'cfoAssistant',
      'error',
      error instanceof Error ? error.message : 'Unknown error during analysis'
    );
    
    return {
      ...errorState,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
