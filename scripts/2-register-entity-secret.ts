// scripts/2-register-entity-secret.ts
// Step 2: Register Entity Secret ciphertext with Circle
//
// Prerequisites:
//   - CIRCLE_API_KEY in .env.local (from Circle Console)
//   - CIRCLE_ENTITY_SECRET in .env.local (from step 1)
//
// Run: npx tsx scripts/2-register-entity-secret.ts

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import path from 'path';

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey) {
  console.error('❌ Missing CIRCLE_API_KEY in .env.local');
  console.error('   Get one from: https://console.circle.com/');
  process.exit(1);
}

if (!entitySecret) {
  console.error('❌ Missing CIRCLE_ENTITY_SECRET in .env.local');
  console.error('   Run step 1 first: npx tsx scripts/1-generate-entity-secret.ts');
  process.exit(1);
}

async function main() {
  console.log('🔐 Registering Entity Secret with Circle...\n');

  const recoveryPath = path.resolve(process.cwd());

  try {
    const response = await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: recoveryPath,
    });

    console.log('✅ Entity Secret registered successfully!\n');
    console.log('📁 Recovery file saved to:', recoveryPath);
    console.log('\n⚠️  IMPORTANT: Back up the recovery file in a safe location.');
    console.log('   It is the ONLY way to reset your Entity Secret if lost.\n');
    console.log('Next step: npx tsx scripts/3-create-treasury-wallets.ts');
  } catch (error: any) {
    console.error('❌ Registration failed:', error?.message || error);
    if (error?.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
