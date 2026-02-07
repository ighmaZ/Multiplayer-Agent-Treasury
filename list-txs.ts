
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function listRecentTransactions() {
  const walletId = process.env.NEXT_PUBLIC_CIRCLE_ETH_SEPOLIA_WALLET_ID;
  console.log(`Wallet ID: ${walletId}`);
  
  if (!walletId) {
    console.error('Wallet ID not found in .env');
    return;
  }

  console.log(`Fetching transactions for wallet: ${walletId}...`);
  
  try {
    const response = await client.listTransactions({
      walletIds: [walletId],
      pageSize: 5
    });

    const transactions = response.data?.transactions;
    
    if (!transactions || transactions.length === 0) {
      console.log('No transactions found.');
      return;
    }

    console.log('\n--- Recent Transactions ---');
    // @ts-ignore
    transactions.forEach((tx) => {
      console.log(`\nID:        ${tx.id}`);
      console.log(`Type:      ${tx.transactionType}`);
      console.log(`State:     ${tx.state}`);
      console.log(`Created:   ${tx.createDate}`);
      if (tx.txHash) console.log(`Tx Hash:   ${tx.txHash}`);
      // @ts-ignore
      if (tx.errorReason) console.log(`Error:     ${tx.errorReason}`);
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
}

listRecentTransactions();
