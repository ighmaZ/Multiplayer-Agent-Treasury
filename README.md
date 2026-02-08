# Tresora

AI treasury copilot for Modern Web3 CFO.

Tresora takes a vendor invoice PDF and turns it into an execution-ready treasury plan:
extract invoice details, run wallet risk checks, prepare swap/bridge/transfer steps, and route for approval.

## Why This Matters

Treasury ops for crypto teams are still manual and slow. Tresora compresses that process into a guided, auditable flow so teams can move faster with clearer risk signals.

## What It Does (in 30 seconds)

1. Upload an invoice PDF.
2. Extract payment fields with Gemini (wallet, amount, recipient, purpose).
3. Run an Etherscan-based wallet risk scan.
4. Build a payment plan and CFO recommendation (`APPROVE`, `REVIEW`, `REJECT`).
5. If approved, build a treasury execution plan:
   - direct transfer, or
   - swap on Sepolia + bridge to Arc Testnet + transfer.

## Flow

- Multi-step agent workflow with streaming progress (SSE).
- PDF invoice extraction via Gemini.
- Wallet risk scoring via Etherscan heuristics.
- Treasury planning for testnet wallets.
- Optional execution through Circle developer-controlled wallets.
- Treasury dashboard for balances + recent transactions.


## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS v4
- Agents/LLM: LangGraph, LangChain, Gemini
- Onchain: Viem, Uniswap v4 SDK + Universal Router
- Wallet/Settlement: Circle Developer-Controlled Wallets + Bridge Kit
- Security data: Etherscan API

## Quick Start

### 1) Install

```bash
pnpm install
```

### 2) Create env file

```bash
cp .env.example .env.local
```

### 3) Minimum env vars (run core demo flow)

```env
GOOGLE_API_KEY=your_key
ETHERSCAN_API_KEY=your_key
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
```

### 4) Run

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Full Execution Setup (Circle)

Add these to `.env.local` if you want real plan execution through Circle wallets:

```env
CIRCLE_API_KEY=your_key
CIRCLE_ENTITY_SECRET=your_secret
NEXT_PUBLIC_CIRCLE_ETH_SEPOLIA_WALLET_ID=your_wallet_id
NEXT_PUBLIC_CIRCLE_ARC_WALLET_ID=your_wallet_id
CIRCLE_ETH_SEPOLIA_WALLET_ADDRESS=0x...
CIRCLE_ARC_WALLET_ADDRESS=0x...
```

## Project Structure

```text
app/
  api/                   # streaming and treasury endpoints
  components/            # chat + dashboard UI
  lib/agents/            # LangGraph flow + nodes
  lib/services/          # Gemini, Etherscan, Circle, treasury logic
  types/                 # shared TypeScript interfaces
```



