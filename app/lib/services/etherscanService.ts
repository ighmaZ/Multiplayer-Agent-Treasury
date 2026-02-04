// lib/services/etherscanService.ts
// Etherscan API integration for wallet security scanning

import { SecurityScan } from '@/app/types';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

/**
 * Calculate risk score based on Etherscan data
 * Returns score 0-100 (70+ is high risk)
 */
function calculateRiskScore(data: {
  isContract: boolean;
  isVerified: boolean;
  hasMaliciousLabel: boolean;
  transactionCount: number;
  labels: string[];
}): number {
  let score = 0;

  // Contract not verified = HIGH risk (+40)
  if (data.isContract && !data.isVerified) {
    score += 40;
  }

  // Known malicious label = CRITICAL (+60)
  if (data.hasMaliciousLabel) {
    score += 60;
  }

  // Suspicious labels (+30)
  const suspiciousLabels = ['phish', 'hack', 'exploit', 'scam', 'fake'];
  const hasSuspiciousLabel = data.labels.some(label =>
    suspiciousLabels.some(suspicious => label.toLowerCase().includes(suspicious))
  );
  if (hasSuspiciousLabel) {
    score += 30;
  }

  // Low transaction count = suspicious (+15)
  if (data.transactionCount < 10) {
    score += 15;
  }

  // Very new address (less than 100 txs) (+10)
  if (data.transactionCount < 100) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Scan wallet address using Etherscan API
 * Returns security assessment with risk score
 */
export async function scanWalletAddress(address: string): Promise<SecurityScan> {
  try {
    console.log(`🔍 Scanning wallet: ${address}`);

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Fetch contract ABI (returns empty if not a contract or not verified)
    const abiResponse = await fetch(
      `${ETHERSCAN_BASE_URL}?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    const abiData = await abiResponse.json();

    const isContract = abiData.status === '1' || abiData.message !== 'NOTOK';
    const isVerified = abiData.status === '1' && abiData.result !== 'Contract source code not verified';

    // Fetch transaction count
    const txResponse = await fetch(
      `${ETHERSCAN_BASE_URL}?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
    );
    const txData = await txResponse.json();
    const transactionCount = parseInt(txData.result || '0', 16);

    // Fetch address labels (if available)
    const labelResponse = await fetch(
      `${ETHERSCAN_BASE_URL}?module=account&action=addresstag&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    const labelData = await labelResponse.json();
    const labels: string[] = [];
    let hasMaliciousLabel = false;

    if (labelData.status === '1' && labelData.result) {
      labels.push(labelData.result);
      const maliciousKeywords = ['scam', 'phish', 'hack', 'exploit', 'fake', 'fraud'];
      if (maliciousKeywords.some(keyword => labelData.result.toLowerCase().includes(keyword))) {
        hasMaliciousLabel = true;
      }
    }

    // Calculate risk score
    const riskScore = calculateRiskScore({
      isContract,
      isVerified,
      hasMaliciousLabel,
      transactionCount,
      labels
    });

    // Generate warnings
    const warnings: string[] = [];
    if (isContract && !isVerified) {
      warnings.push('⚠️ Contract is not verified on Etherscan');
    }
    if (hasMaliciousLabel) {
      warnings.push('🚨 Address has been flagged as malicious');
    }
    if (transactionCount < 10) {
      warnings.push('⚠️ Address has very low transaction history');
    }
    if (labels.length === 0 && transactionCount > 0) {
      warnings.push('ℹ️ No known labels for this address');
    }

    console.log(`✅ Scan complete. Risk score: ${riskScore}/100`);

    return {
      riskScore,
      isContract,
      isVerified,
      hasMaliciousLabel,
      transactionCount,
      firstTransaction: '', // Would need additional API call
      warnings,
      etherscanLabels: labels
    };

  } catch (error) {
    console.error('❌ Etherscan scan error:', error);
    throw error;
  }
}

/**
 * Get recommendation based on risk score
 * 0-39: APPROVE, 40-69: REVIEW, 70+: REJECT
 */
export function getRecommendationFromScore(score: number): {
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
} {
  if (score >= 70) {
    return { recommendation: 'REJECT', riskLevel: 'HIGH' };
  } else if (score >= 40) {
    return { recommendation: 'REVIEW', riskLevel: 'MEDIUM' };
  } else {
    return { recommendation: 'APPROVE', riskLevel: 'LOW' };
  }
}
