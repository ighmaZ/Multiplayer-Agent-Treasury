// scripts/1-generate-entity-secret.ts
// Step 1: Generate a 32-byte Entity Secret for Circle developer-controlled wallets
//
// Run: npx tsx scripts/1-generate-entity-secret.ts

import { generateEntitySecret } from '@circle-fin/developer-controlled-wallets';

console.log('🔑 Generating Circle Entity Secret...\n');

const entitySecret = generateEntitySecret();

console.log('✅ Entity Secret generated!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  IMPORTANT: Copy this value and add it to your .env.local');
console.log('⚠️  Store it securely (password manager). Circle cannot recover it.\n');
console.log('Next step: Add CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET to .env.local');
console.log('Then run: npx tsx scripts/2-register-entity-secret.ts');
