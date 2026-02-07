// app/api/treasury/execute/route.ts
// POST endpoint to execute a payment via Circle wallet (replaces MetaMask signing)

import { NextRequest, NextResponse } from 'next/server';
import { executeTransfer, executeContractCall } from '@/app/lib/services/circleService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, tokenId, amount, destinationAddress, contractAddress, callData } = body;

    // Contract execution (e.g., Uniswap swap)
    if (contractAddress && callData) {
      const tx = await executeContractCall({
        walletId,
        contractAddress,
        callData,
        amount,
      });

      if (!tx) {
        return NextResponse.json({ error: 'Failed to execute contract call' }, { status: 500 });
      }

      return NextResponse.json({
        transactionId: tx.id,
        txHash: null,
        state: tx.state,
      });
    }

    // Simple token transfer
    if (!walletId || !tokenId || !amount || !destinationAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: walletId, tokenId, amount, destinationAddress' },
        { status: 400 }
      );
    }

    const tx = await executeTransfer({
      walletId,
      tokenId,
      amount,
      destinationAddress,
    });

    if (!tx) {
      return NextResponse.json({ error: 'Failed to execute transfer' }, { status: 500 });
    }

    return NextResponse.json({
      transactionId: tx.id,
      txHash: null,
      state: tx.state,
    });
  } catch (error) {
    console.error('Treasury Execute Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute transaction' },
      { status: 500 }
    );
  }
}
