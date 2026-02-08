// lib/services/etherscanService.ts
// Arc wallet security scanning using Arc RPC + ArcScan metadata

import { createPublicClient, defineChain, http, isAddress, type Address } from 'viem';

import { SecurityScan } from '@/app/types';

const ARCSCAN_API_KEY = process.env.ARCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '';
const ARCSCAN_BASE_URL = process.env.ARCSCAN_API_URL || 'https://testnet.arcscan.app/api';
const ARC_RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ARC_TESTNET_CHAIN_ID = 5042002;

const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
    public: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
});

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_RPC_URL),
});

interface RiskScoreInput {
  isContract: boolean;
  isVerified: boolean;
  hasMaliciousLabel: boolean;
  transactionCount: number;
  labels: string[];
  walletAgeDays: number | null;
}

interface ArcScanResponse<T> {
  status?: string;
  message?: string;
  result?: T;
}

interface SourceCodeResult {
  SourceCode?: string;
  ContractName?: string;
}

interface TransactionListItem {
  timeStamp?: string;
}

function clampScore(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
}

function parseFirstTransactionIso(items: TransactionListItem[]): string {
  if (items.length === 0) {
    return '';
  }

  const oldestTxTimestamp = Number.parseInt(items[0].timeStamp ?? '0', 10);
  if (!Number.isFinite(oldestTxTimestamp) || oldestTxTimestamp <= 0) {
    return '';
  }

  return new Date(oldestTxTimestamp * 1000).toISOString();
}

function parseWalletAgeDays(firstTransactionIso: string): number | null {
  if (!firstTransactionIso) {
    return null;
  }

  const firstTxTime = new Date(firstTransactionIso).getTime();
  if (!Number.isFinite(firstTxTime)) {
    return null;
  }

  const diff = Date.now() - firstTxTime;
  return diff >= 0 ? Math.floor(diff / MS_PER_DAY) : null;
}

function buildArcScanUrl(query: string): string {
  const searchParams = new URLSearchParams(query);
  if (ARCSCAN_API_KEY) {
    searchParams.set('apikey', ARCSCAN_API_KEY);
  }
  return `${ARCSCAN_BASE_URL}?${searchParams.toString()}`;
}

async function fetchArcScan<T>(query: string): Promise<ArcScanResponse<T>> {
  const response = await fetch(buildArcScanUrl(query), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`ArcScan request failed (${response.status})`);
  }

  return (await response.json()) as ArcScanResponse<T>;
}

async function fetchArcScanSafe<T>(query: string): Promise<ArcScanResponse<T> | null> {
  try {
    return await fetchArcScan<T>(query);
  } catch (error) {
    console.warn('⚠️ ArcScan metadata request failed:', error);
    return null;
  }
}

/**
 * Calculate risk score based on Arc data
 * Returns score 0-100 (70+ is high risk)
 */
function calculateRiskScore(data: RiskScoreInput): number {
  let score = 0;

  // Label data is limited on ArcScan free tiers; add a small uncertainty floor.
  if (data.labels.length === 0) {
    score += 5;
  }

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

  // No on-chain activity means no historical confidence.
  if (data.transactionCount === 0) {
    score += 25;
  }

  // Low transaction count = suspicious (+15)
  if (data.transactionCount > 0 && data.transactionCount < 10) {
    score += 15;
  }

  // Very new address (less than 100 txs) (+10)
  if (data.transactionCount >= 10 && data.transactionCount < 100) {
    score += 10;
  }

  // Newly created wallet/contract has elevated uncertainty.
  if (data.walletAgeDays !== null) {
    if (data.walletAgeDays < 30) {
      score += 15;
    } else if (data.walletAgeDays < 90) {
      score += 8;
    }
  }

  return clampScore(score);
}

/**
 * Scan wallet address using Arc data (RPC + ArcScan metadata)
 * Returns security assessment with risk score
 */
export async function scanWalletAddress(address: string): Promise<SecurityScan> {
  try {
    console.log(`🔍 Scanning wallet: ${address}`);

    // Validate Ethereum address format
    if (!isAddress(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    const walletAddress = address as Address;

    const [bytecode, transactionCount, sourceCodeData, txListData] = await Promise.all([
      arcClient.getBytecode({ address: walletAddress }),
      arcClient.getTransactionCount({ address: walletAddress }),
      fetchArcScanSafe<SourceCodeResult[]>(
        `module=contract&action=getsourcecode&address=${address}`
      ),
      fetchArcScanSafe<TransactionListItem[] | string>(
        `module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=asc`
      ),
    ]);

    const isContract = Boolean(bytecode && bytecode !== '0x' && bytecode !== '0x0');

    const sourceCodeResult = Array.isArray(sourceCodeData?.result) ? sourceCodeData.result[0] : undefined;
    const sourceCode = sourceCodeResult?.SourceCode?.trim() ?? '';
    const isVerified = isContract && sourceCode.length > 0;

    const txList = Array.isArray(txListData?.result) ? txListData.result : [];
    const firstTransaction = parseFirstTransactionIso(txList);
    const walletAgeDays = parseWalletAgeDays(firstTransaction);

    const labels: string[] = [];
    let hasMaliciousLabel = false;

    if (sourceCodeResult?.ContractName?.trim()) {
      labels.push(sourceCodeResult.ContractName.trim());
    }

    if (labels.length > 0) {
      const maliciousKeywords = ['scam', 'phish', 'hack', 'exploit', 'fake', 'fraud'];
      if (maliciousKeywords.some(keyword => labels.some(label => label.toLowerCase().includes(keyword)))) {
        hasMaliciousLabel = true;
      }
    }

    // Calculate risk score
    const riskScore = calculateRiskScore({
      isContract,
      isVerified,
      hasMaliciousLabel,
      transactionCount,
      labels,
      walletAgeDays,
    });

    // Generate warnings
    const warnings: string[] = [];
    if (isContract && !isVerified) {
      warnings.push('⚠️ Contract is not verified on ArcScan');
    }
    if (hasMaliciousLabel) {
      warnings.push('🚨 Address has been flagged as malicious');
    }
    if (transactionCount === 0) {
      warnings.push('⚠️ Address has no outgoing transaction history');
    } else if (transactionCount < 10) {
      warnings.push('⚠️ Address has very low transaction history');
    }
    if (walletAgeDays !== null && walletAgeDays < 30) {
      warnings.push('⚠️ Address activity started less than 30 days ago');
    }
    if (labels.length === 0 && transactionCount > 0) {
      warnings.push('ℹ️ Limited ArcScan labeling metadata available for this address');
    }
    if (!sourceCodeData || !txListData) {
      warnings.push('ℹ️ ArcScan metadata is partially unavailable; score is based mostly on on-chain activity');
    }

    console.log(`✅ Scan complete. Risk score: ${riskScore}/100`);

    return {
      riskScore,
      isContract,
      isVerified,
      hasMaliciousLabel,
      transactionCount,
      firstTransaction,
      warnings,
      etherscanLabels: labels
    };

  } catch (error) {
    console.error('❌ Arc scan error:', error);
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
