// scripts/3-create-treasury-wallets.ts
// Step 3: Create treasury wallets on ETH-SEPOLIA and ARC-TESTNET
//
// Prerequisites:
//   - CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local
//   - Entity secret registered (step 2)
//
// Run: npx tsx scripts/3-create-treasury-wallets.ts

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  console.error('❌ Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env.local');
  process.exit(1);
}

async function main() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  console.log('🏦 Creating Treasury Wallet Set...\n');

  // Create wallet set
  const walletSetResponse = await client.createWalletSet({
    name: 'Agent Treasury',
  });

  const walletSetId = walletSetResponse.data?.walletSet?.id;
  if (!walletSetId) {
    console.error('❌ Failed to create wallet set:', walletSetResponse);
    process.exit(1);
  }
  console.log('✅ Wallet Set created:', walletSetId);

  // Create wallets on both chains
  console.log('\n📦 Creating wallets on ETH-SEPOLIA and ARC-TESTNET...\n');

  const walletsResponse = await client.createWallets({
    accountType: 'EOA',
    blockchains: ['ETH-SEPOLIA', 'ARC-TESTNET'],
    count: 1,
    walletSetId,
  });

  const wallets = walletsResponse.data?.wallets;
  if (!wallets || wallets.length === 0) {
    console.error('❌ Failed to create wallets:', walletsResponse);
    process.exit(1);
  }

  console.log('✅ Wallets created!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const wallet of wallets) {
    console.log(`\n  Chain:    ${wallet.blockchain}`);
    console.log(`  Address:  ${wallet.address}`);
    console.log(`  Wallet ID: ${wallet.id}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nAdd these to your .env.local:\n');
  console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);

  for (const wallet of wallets) {
    const chainKey = wallet.blockchain === 'ETH-SEPOLIA' ? 'SEPOLIA' : 'ARC';
    console.log(`CIRCLE_${chainKey}_WALLET_ID=${wallet.id}`);
    console.log(`CIRCLE_${chainKey}_WALLET_ADDRESS=${wallet.address}`);
  }

  console.log('\n💧 Next: Fund your wallets with testnet tokens');
  console.log('   Sepolia ETH: https://sepoliafaucet.com/');
  console.log('   Arc USDC:    https://faucet.circle.com/ (select Arc Testnet)');
}

main().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  process.exit(1);
});
