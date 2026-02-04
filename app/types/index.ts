// types/index.ts

// Invoice data extracted from PDF
export interface InvoiceData {
  walletAddress: string;  // Ethereum address
  amount: string;         // e.g., "5000 USDC"
  recipient: string;      // Vendor/company name
  purpose: string;        // What the payment is for
}

// Etherscan security scan result
export interface SecurityScan {
  riskScore: number;           // 0-100 calculated score
  isContract: boolean;         // Is it a contract or EOA?
  isVerified: boolean;         // Contract verified on Etherscan?
  hasMaliciousLabel: boolean;  // Tagged as malicious?
  transactionCount: number;    // Total transactions
  firstTransaction: string;    // Date of first tx
  warnings: string[];          // List of warnings
  etherscanLabels: string[];   // Etherscan labels (e.g., "Binance", "Scam")
}

// CFO Assistant recommendation
export interface CFORecommendation {
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  summary: string;             // Human-readable summary
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string[];           // Bullet points explaining the decision
}

// Complete agent workflow state
export interface AgentState {
  // Input
  pdfFile: File | null;
  
  // Processing
  currentStep: 'idle' | 'extracting' | 'scanning' | 'analyzing' | 'complete';
  
  // Results
  invoiceData: InvoiceData | null;
  securityScan: SecurityScan | null;
  recommendation: CFORecommendation | null;
  
  // Errors
  error: string | null;
}

// Agent trace for visualization
export interface AgentTrace {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: Date;
  data?: any;
  logs: string[];
}
