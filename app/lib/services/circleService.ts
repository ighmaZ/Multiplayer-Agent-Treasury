// lib/services/circleService.ts
// Circle developer-controlled wallets SDK wrapper (server-side only)

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

let clientInstance: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

function getClient() {
  if (!clientInstance) {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

    if (!apiKey || !entitySecret) {
      throw new Error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET');
    }

    clientInstance = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });
  }
  return clientInstance;
}

/**
 * Get token balances for a specific wallet
 */
export async function getWalletTokenBalances(walletId: string) {
  const client = getClient();
  const response = await client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
  });
  return response.data?.tokenBalances ?? [];
}

/**
 * List transactions for given wallet IDs
 */
export async function getTransactions(
  walletIds: string[],
  options?: { pageSize?: number; blockchain?: string }
) {
  const client = getClient();
  const response = await client.listTransactions({
    walletIds,
    ...(options?.blockchain && { blockchain: options.blockchain as any }),
    pageSize: options?.pageSize ?? 20,
  });
  return response.data?.transactions ?? [];
}

/**
 * Execute a token transfer from a Circle wallet
 */
export async function executeTransfer(params: {
  walletId: string;
  tokenId: string;
  amount: string;
  destinationAddress: string;
}) {
  const client = getClient();
  const response = await client.createTransaction({
    walletId: params.walletId,
    amount: [params.amount],
    destinationAddress: params.destinationAddress,
    tokenId: params.tokenId,
    fee: {
      type: 'level',
      config: { feeLevel: 'HIGH' },
    },
  });
  return response.data ?? null;
}

/**
 * Execute a contract call from a Circle wallet
 */
export async function executeContractCall(params: {
  walletId: string;
  contractAddress: string;
  callData: `0x${string}`;
  amount?: string;
}) {
  const client = getClient();
  const response = await client.createContractExecutionTransaction({
    walletId: params.walletId,
    contractAddress: params.contractAddress,
    callData: params.callData,
    ...(params.amount && { amount: params.amount }),
    fee: {
      type: 'level',
      config: { feeLevel: 'HIGH' },
    },
  });
  return response.data ?? null;
}
