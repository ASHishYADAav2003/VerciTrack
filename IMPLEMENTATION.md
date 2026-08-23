# AI-Powered Blockchain Quality Grading System Implementation Plan

This document outlines the technical implementation plan for a fully web-based agricultural quality grading and traceability system. The system combines Artificial Intelligence (MobileNetV3) for image-based quality grading with Blockchain technology (Base Sepolia) to permanently and securely record the results. It is designed to be accessible via standard web browsers without requiring specialized hardware.

## User Review Required

> [!IMPORTANT]
> Please review the architecture and proposed technology stack to ensure it aligns perfectly with your expectations. Once approved, I can begin generating the initial codebase step-by-step.

## Open Questions

> [!WARNING]
> 1. **Specific Crop Focus**: Which specific agricultural product(s) are we starting with for the AI dataset (e.g., tomatoes, mangoes, potatoes, apples)?
> 2. **Wallet & Gas Fees**: We are using a dedicated backend relayer wallet on Base Sepolia. Do we already have this wallet set up with testnet ETH, or should we create one during the setup phase?
> 3. **Supabase & Pinata Setup**: Do you have existing accounts/API keys for Supabase and Pinata (IPFS), or will we need to set those up as we build the backend?

## Proposed Changes

The project will be developed across several distinct components, moving from data and AI models to the backend API, smart contracts, and finally the web frontend.

---

### Phase 1: AI Model Development & Dataset Preparation

This phase focuses on the computer vision aspect of the project.

#### [NEW] `ai/dataset_prep.py`
Script to download, clean, and organize the dataset of the chosen agricultural product into `train`, `val`, and `test` folders corresponding to Grade A, B, C, and Reject.

#### [NEW] `ai/train_mobilenet.py`
PyTorch script utilizing transfer learning on MobileNetV3. Will include data augmentation, training loop, validation, and saving the best model state (`.pth`).

#### [NEW] `ai/inference.py`
Utility script to load the trained model, take a new image as input, and return the predicted class (Grade) along with a confidence score.

#### [NEW] `ai/export_model.py`
Script to export the final model to ONNX or a format easily loadable by the FastAPI backend for fast inference.

---

### Phase 2: Blockchain Development (Smart Contracts)

This phase establishes the tamper-proof ledger for grading results.

#### [NEW] `blockchain/contracts/QualityLedger.sol`
A Solidity smart contract responsible for storing the core grading data.
- **Fields**: Batch ID, Quality Grade, Confidence Score (as basis points, e.g., 9437 for 94.37%), Image Hash, Result Hash, AI Model Version, IPFS URI, and Timestamp.
- **Access Control**: Only the backend's relayer wallet address will be authorized to write to this contract to prevent spam and manipulation.

#### [NEW] `blockchain/scripts/deploy.js`
Hardhat script to deploy the `QualityLedger` contract to the Base Sepolia testnet.

#### [NEW] `blockchain/hardhat.config.js`
Configuration for Hardhat, including the Base Sepolia network RPC URL and the deployer wallet private key.

---

### Phase 3: Backend Development & Storage (FastAPI)

This component acts as the bridge connecting the frontend, the AI model, the database, IPFS, and the blockchain.

#### [NEW] `backend/main.py`
The FastAPI application entry point, defining the core API routes (e.g., `/api/upload`, `/api/batch/{id}`).

#### [NEW] `backend/ai_service.py`
Service module that wraps the PyTorch inference logic to classify incoming images on the fly.

#### [NEW] `backend/storage_service.py`
Service module for handling IPFS uploads via the Pinata API and generating the SHA-256 hash of the image.

#### [NEW] `backend/db_service.py`
Service module for interacting with Supabase PostgreSQL to store complete batch details off-chain.

#### [NEW] `backend/blockchain_service.py`
Service module utilizing Web3.py to sign and send transactions to the deployed smart contract using the backend relayer wallet.

---

### Phase 4: Web Application (Next.js Frontend)

This is the user-facing web application that farmers, buyers, and consumers will interact with.

#### [NEW] `frontend/package.json`
Next.js project configured with React, TypeScript, and Tailwind CSS.

#### [NEW] `frontend/app/page.tsx`
Landing page explaining the system and offering login/registration options.

#### [NEW] `frontend/app/dashboard/page.tsx`
Main dashboard for authenticated users (farmers) to view their past batches and initiate new gradings.

#### [NEW] `frontend/app/scan/page.tsx`
Camera interface allowing users to capture a photo of the produce directly from their device browser. Will handle IndexedDB caching for offline support.

#### [NEW] `frontend/app/batch/[id]/page.tsx`
Public-facing verification page that displays the detailed off-chain data and compares it against the on-chain blockchain record for authenticity.

#### [NEW] `frontend/components/QRCodeGenerator.tsx`
React component utilizing `qrcode.react` to generate and display the unique QR code for a graded batch.

#### [NEW] `frontend/utils/offlineSync.ts`
Utility leveraging `Dexie.js` (IndexedDB wrapper) to store pending image uploads if the user is offline, and sync them when the connection is restored (PWA functionality).

## Verification Plan

### Automated Tests
- **AI Model**: Evaluate accuracy, precision, and recall on the isolated test dataset.
- **Smart Contracts**: Write Hardhat tests using Chai to verify access control, data formatting (decimals to basis points), and event emission.
- **Backend API**: Write Pytest test cases to simulate image uploads, verifying that the AI responds, Supabase records the entry, and a blockchain transaction is initiated.

### Manual Verification
- **End-to-End Flow**: Open the Next.js app on a mobile device, snap a photo of a fruit/vegetable, and trace the process: Image -> Backend -> AI Grade -> IPFS -> Supabase -> Base Sepolia -> QR Code generation.
- **QR Scanning**: Use a separate smartphone to scan the generated QR code to verify the public batch information page renders correctly.
- **Offline Capability**: Turn off Wi-Fi/Data on the mobile device, attempt to submit a grading, verify it saves locally, turn connection back on, and verify it automatically syncs and processes.
