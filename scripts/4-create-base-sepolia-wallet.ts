// scripts/4-create-base-sepolia-wallet.ts
// Create a wallet on BASE-SEPOLIA within the existing wallet set
//
// Run: npx tsx scripts/4-create-base-sepolia-wallet.ts

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

if (!apiKey || !entitySecret || !walletSetId) {
  console.error('❌ Missing CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, or CIRCLE_WALLET_SET_ID in .env.local');
  process.exit(1);
}

async function main() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  console.log('📦 Creating wallet on BASE-SEPOLIA...\n');

  const walletsResponse = await client.createWallets({
    accountType: 'EOA',
    blockchains: ['BASE-SEPOLIA'],
    count: 1,
    walletSetId,
  });

  const wallets = walletsResponse.data?.wallets;
  if (!wallets || wallets.length === 0) {
    console.error('❌ Failed to create wallet:', walletsResponse);
    process.exit(1);
  }

  const wallet = wallets[0];
  console.log('✅ Wallet created!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Chain:      ${wallet.blockchain}`);
  console.log(`  Address:    ${wallet.address}`);
  console.log(`  Wallet ID:  ${wallet.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nUpdate your .env.local — replace the SEPOLIA entries with:\n');
  console.log(`CIRCLE_BASE_SEPOLIA_WALLET_ID=${wallet.id}`);
  console.log(`CIRCLE_BASE_SEPOLIA_WALLET_ADDRESS=${wallet.address}`);
  console.log('\n💧 Fund with Base Sepolia ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
}

main().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  process.exit(1);
});
