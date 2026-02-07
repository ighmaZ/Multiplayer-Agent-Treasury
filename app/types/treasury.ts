// types/treasury.ts
// Treasury dashboard types

export interface TokenBalance {
  token: string;        // "USDC", "EURC", "ETH"
  amount: string;       // raw amount string
  amountUsd: number;    // USD-equivalent value
  blockchain: string;   // "BASE-SEPOLIA", "ARC-TESTNET"
}

export interface WalletData {
  id: string;
  address: string;
  name: string;         // "Base Sepolia" or "Arc Testnet"
  blockchain: string;
  balances: TokenBalance[];
  totalValueUsd: number;
}

export interface TreasuryTransaction {
  id: string;
  txHash: string | null;
  state: string;        // "COMPLETED", "PENDING", "FAILED", etc.
  txType: string;       // "INBOUND", "OUTBOUND"
  operation: string;    // "TRANSFER", "CONTRACT_EXECUTION"
  amount: string;
  token: string;
  sourceAddress: string;
  destinationAddress: string;
  createDate: string;
  blockchain: string;
  walletName: string;
  networkFee: string | null;
}

export interface TreasuryDashboardData {
  totalValueUsd: number;
  walletCount: number;
  assetCount: number;
  wallets: WalletData[];
  transactions: TreasuryTransaction[];
  lastUpdated: string;
}
