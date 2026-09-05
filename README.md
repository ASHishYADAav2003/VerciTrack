# HAV Coffee Traceability System

A full-stack prototype that tracks coffee batches from farm to market using blockchain, AI, and machine learning. Built to improve transparency, authenticity verification, and quality assurance in the coffee supply chain.

---

## What It Does

- **Registers coffee batches on an Ethereum smart contract** with full lab quality data
- **Reads lab report PDFs automatically** using Claude AI — fields are extracted and pre-filled in the form
- **Scores coffee quality** using a custom Random Forest ML model trained on EU coffee regulations
- **Admin panel** for registering, approving, editing, and analysing batches
- **Farmer portal** for submitting batches and tracking orders
- **Public marketplace** where customers can browse and purchase coffee
- **QR verification page** — each batch gets a public URL with blockchain-verified lab data
- **Lab analytics dashboard** with correlation analysis, similarity search, and ML predictions

---

## Technologies

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React, TypeScript |
| Blockchain | Solidity smart contract, Hardhat (local Ethereum network) |
| AI / PDF | Claude AI by Anthropic (`@anthropic-ai/sdk`) |
| Machine Learning | Custom Random Forest — EU coffee compliance scoring |
| Wallet | MetaMask (signs blockchain transactions) |
| Styling | Tailwind CSS |
| Runtime | Node.js 18+ |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org)
- [MetaMask](https://metamask.io) browser extension

---

## How to Run

**1. Install dependencies** (first time only)
```bash
npm install
```

**2. Set up environment** (first time only)

Create a file called `.env.local` in the project root:
```
ANTHROPIC_API_KEY=your_key_here
```
Get a free API key at [console.anthropic.com](https://console.anthropic.com). Without it, PDF auto-fill falls back to text parsing — the app still works.

**3. Start the local blockchain** — keep this terminal open
```bash
npm run chain
```

**4. Start the web app** — in a second terminal
```bash
npm run dev
```

**5. Open in browser**
```
http://localhost:3000
```

**6. Configure MetaMask**

| Setting | Value |
|---|---|
| Network name | Hardhat Localhost |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Currency | ETH |

Import a test account using one of the private keys printed in the terminal when `npm run chain` starts.

---

## Project Structure

```
app/
  admin/          — Admin panel (register, approvals, analytics, lab analytics)
  farmer/      — Farmer portal (register batches, view orders)
  marketplace/    — Public product listing
  product/        — Individual product pages
  verify/         — Public blockchain verification pages
  api/            — Next.js API routes

blockchain/
  contracts/      — CoffeeTraceability.sol (Solidity smart contract)

lib/
  mlScorer.ts     — Random Forest quality model
  labAnalytics.ts — EU compliance rules, correlation, similarity analysis
  contractConfig.ts — Contract ABI and address

data/             — JSON data store (lab history, batches, ML records)
scripts/          — Blockchain deploy scripts
```

---

## Note on the Blockchain

The local Hardhat network resets every time `npm run chain` is restarted — all on-chain data is lost. Off-chain data (lab history, ML training records, analytics) persists in the `data/` folder between sessions.

For a permanent deployment the contract can be deployed to a public testnet (e.g. Sepolia) using `npm run deploy:sepolia` with a configured `.env.local`.

---

## Author

Hana Voca — hhv23@bath.ac.uk
