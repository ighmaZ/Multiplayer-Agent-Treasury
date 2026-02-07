import 'dotenv/config'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { createCircleWalletsAdapter } from '@circle-fin/adapter-circle-wallets'
import { inspect } from 'util'

/**
 * Test CCTP Bridge: Sepolia USDC → Arc Testnet
 *
 * Uses Circle Bridge Kit with the Circle Wallets adapter
 * to bridge USDC from ETH Sepolia to Arc Testnet via CCTP v2.
 *
 * Prerequisites:
 * - USDC balance on Sepolia (we have 0.1 from the swap test)
 * - Circle API key and entity secret in .env.local
 */

const SEPOLIA_WALLET_ADDRESS = process.env.CIRCLE_ETH_SEPOLIA_WALLET_ADDRESS!
const ARC_WALLET_ADDRESS = process.env.CIRCLE_ARC_WALLET_ADDRESS!

async function main() {
  console.log('=== CCTP Bridge Test: Sepolia USDC → Arc Testnet ===\n')
  console.log(`Source (Sepolia):  ${SEPOLIA_WALLET_ADDRESS}`)
  console.log(`Destination (Arc): ${ARC_WALLET_ADDRESS}`)
  console.log()

  // Initialize Bridge Kit
  const kit = new BridgeKit()

  // Create Circle Wallets adapter (uses developer-controlled wallets)
  const adapter = createCircleWalletsAdapter({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  })

  const BRIDGE_AMOUNT = '0.05' // Bridge 0.05 USDC (keep some for testing)

  console.log(`Bridging ${BRIDGE_AMOUNT} USDC from Ethereum Sepolia → Arc Testnet...\n`)

  try {
    const result = await kit.bridge({
      from: {
        adapter,
        chain: 'Ethereum_Sepolia',
        address: SEPOLIA_WALLET_ADDRESS,
      },
      to: {
        adapter,
        chain: 'Arc_Testnet',
        address: ARC_WALLET_ADDRESS,
      },
      amount: BRIDGE_AMOUNT,
    })

    console.log('🎉 Bridge transaction result:')
    console.log(inspect(result, false, null, true))
  } catch (err: any) {
    console.error('❌ Bridge failed:', inspect(err, false, null, true))

    // If chain name is wrong, try alternate names
    if (err?.message?.includes('chain') || err?.message?.includes('unsupported')) {
      console.log('\nRetrying with alternate chain name "Ethereum Sepolia"...')
      try {
        const result = await kit.bridge({
          from: {
            adapter,
            chain: 'Ethereum Sepolia' as any,
            address: SEPOLIA_WALLET_ADDRESS,
          },
          to: {
            adapter,
            chain: 'Arc_Testnet',
            address: ARC_WALLET_ADDRESS,
          },
          amount: BRIDGE_AMOUNT,
        })
        console.log('🎉 Bridge transaction result:')
        console.log(inspect(result, false, null, true))
      } catch (err2) {
        console.error('❌ Retry also failed:', inspect(err2, false, null, true))
      }
    }
  }
}

main().catch(console.error)
