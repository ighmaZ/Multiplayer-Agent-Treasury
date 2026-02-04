// lib/agents/nodes/walletScanner.ts
// Wallet Scanner Agent Node - Checks wallet security using Etherscan

import { scanWalletAddress } from '@/app/lib/services/etherscanService';
import { AgentState, addLog } from '../state';

/**
 * Wallet Scanner Node
 * Scans the extracted wallet address for security risks
 */
export async function walletScannerNode(state: AgentState): Promise<AgentState> {
  console.log('🔍 Wallet Scanner Node: Starting security scan...');
  
  try {
    // Update state to show we're scanning
    let updatedState = addLog(
      state,
      'walletScanner',
      'running',
      'Scanning wallet security...'
    );
    
    // Check if we have invoice data with wallet address
    if (!state.invoiceData || !state.invoiceData.walletAddress) {
      throw new Error('No wallet address available for scanning');
    }
    
    const walletAddress = state.invoiceData.walletAddress;
    
    // Scan wallet using Etherscan API
    const securityScan = await scanWalletAddress(walletAddress);
    
    // Update state with scan results
    updatedState = {
      ...updatedState,
      securityScan,
      currentStep: 'analyzing',
    };
    
    // Add success log with risk info
    const riskEmoji = securityScan.riskScore >= 70 ? '🔴' : securityScan.riskScore >= 40 ? '🟡' : '🟢';
    updatedState = addLog(
      updatedState,
      'walletScanner',
      'success',
      `${riskEmoji} Risk Score: ${securityScan.riskScore}/100`,
      {
        riskScore: securityScan.riskScore,
        isContract: securityScan.isContract,
        isVerified: securityScan.isVerified,
        warnings: securityScan.warnings,
      }
    );
    
    console.log('✅ Wallet Scanner Node: Scan complete');
    return updatedState;
    
  } catch (error) {
    console.error('❌ Wallet Scanner Node Error:', error);
    
    // Add error log
    const errorState = addLog(
      state,
      'walletScanner',
      'error',
      error instanceof Error ? error.message : 'Unknown error during scan'
    );
    
    return {
      ...errorState,
      currentStep: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
