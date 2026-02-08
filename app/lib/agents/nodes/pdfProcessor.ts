// lib/agents/nodes/pdfProcessor.ts
// PDF Processor Agent Node - Extracts invoice data from PDF

import { extractInvoiceFromPDF } from '@/app/lib/services/geminiService';
import { AgentState, addLog } from '../state';

/**
 * PDF Processor Node
 * Extracts wallet address, amount, recipient, and purpose from invoice PDF
 */
export async function pdfProcessorNode(state: AgentState): Promise<AgentState> {
  console.log('📄 PDF Processor Node: Starting extraction...');
  
  try {
    // Update state to show we're extracting
    let updatedState = addLog(
      state,
      'pdfProcessor',
      'running',
      'Extracting invoice data from PDF...'
    );
    
    // Check if we have PDF data
    if (!state.pdfBuffer) {
      throw new Error('No PDF buffer provided');
    }
    
    // Extract invoice data using Gemini
    const invoiceData = await extractInvoiceFromPDF(state.pdfBuffer, state.fileName);
    
    // Check if wallet address was found
    if (invoiceData.walletAddress === 'NOT_FOUND') {
      throw new Error('Could not extract wallet address from invoice');
    }
    
    // Validate Ethereum address format
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(invoiceData.walletAddress);
    if (!isValidAddress) {
      throw new Error(`Invalid Ethereum address format: ${invoiceData.walletAddress}`);
    }
    
    // Update state with extracted data
    updatedState = {
      ...updatedState,
      invoiceData,
      currentStep: 'scanning',
    };
    
    // Add success log
    updatedState = addLog(
      updatedState,
      'pdfProcessor',
      'success',
      `Extracted wallet: ${invoiceData.walletAddress.substring(0, 10)}...`,
      { walletAddress: invoiceData.walletAddress, amount: invoiceData.amount }
    );
    
    console.log('✅ PDF Processor Node: Extraction complete');
    return updatedState;
    
  } catch (error) {
    console.error('❌ PDF Processor Node Error:', error);
    
    // Add error log
    const errorState = addLog(
      state,
      'pdfProcessor',
      'error',
      error instanceof Error ? error.message : 'Unknown error during extraction'
    );
    
    return {
      ...errorState,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
