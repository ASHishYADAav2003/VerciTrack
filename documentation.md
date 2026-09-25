# IEEE-Style Project Documentation: VerciTrack - A Blockchain and AI-Integrated Framework for Coffee Traceability and Quality Assurance

**Member 1:** [Name of Member 1] (Blockchain Development)  
**Member 2:** [Name of Member 2] (Artificial Intelligence & Computer Vision)  
**Member 3:** [Name of Member 3] (Frontend & Backend Integration)  

---

## Abstract
The global coffee supply chain suffers from systemic opacity, making it vulnerable to counterfeiting, adulteration, and unfair trade practices. This project introduces VerciTrack, an end-to-end decentralized framework integrating Artificial Intelligence (AI) and Blockchain technology to ensure provenance, transparency, and quality assurance in coffee trading. A deep learning computer vision model classifies coffee bean quality (Premium, Longberry, Peaberry, Defect), while a Solidity-based smart contract deployed on a local Ethereum network permanently anchors this data to an immutable ledger. Interfacing via a Next.js full-stack application, the system allows consumers to verify coffee authenticity by scanning a dynamically generated QR Code containing the cryptographic hash of the AI results and InterPlanetary File System (IPFS) CID.

## 1. Introduction
Agricultural supply chains lack trustless verification mechanisms. Consumers rely heavily on third-party certifications, which are easily counterfeited. This major project addresses the traceability problem by combining computer vision for automated quality control with blockchain for immutable data storage. This documentation serves as a comprehensive overview of the research and development pipeline spanning a 3-month period, demonstrating a clear proof-of-concept for the final year major project.

## 2. Team Contributions
The project was divided into three core subsystems, assigned as follows:

- **Member 1 (Blockchain Developer):** Engineered and deployed the `CoffeeTraceability.sol` smart contract. Handled on-chain data architecture to ensure only critical, verifiable data—such as Image Hash (SHA-256), AI Result Hash, IPFS CID, and Assessor addresses—is stored on-chain. Conducted gas optimization, testing, and local deployment via the Hardhat framework.
- **Member 2 (AI/ML Engineer):** Curated the coffee bean dataset and trained a convolutional neural network (CNN). Developed the FastAPI backend service (`ai-service`) to handle image acquisition, preprocessing, and real-time inference, dynamically calculating quality grades and defect percentages based on model predictions.
- **Member 3 (Full-Stack Developer):** Designed the Next.js and TailwindCSS user interface. Developed the farmer dashboard's AI workflow integration (Image Acquisition → AI Inference → QR Code Generation) and implemented the Prisma/SQLite database to handle heavy off-chain metadata (e.g., origin, farmer details, marketplace listing).

## 3. Project Timeline & Gradual Progress
The development was executed in an iterative, agile methodology over the span of 3 months.

### Month 1: Research, Architecture, and Data Collection
- **Weeks 1-2:** Conducted a literature review on existing blockchain supply chains and AI in agriculture. Defined the system architecture and data segregation strategy (On-Chain vs Off-Chain).
- **Weeks 3-4:** **Member 2** collected and augmented the dataset of coffee beans across four classes (Premium, Peaberry, Longberry, Defect). **Member 1** drafted the initial Smart Contract structure. **Member 3** initialized the Next.js repository and designed Figma wireframes for the farmer and consumer dashboards.

### Month 2: Subsystem Development and AI Training
- **Weeks 1-2:** **Member 2** trained the CNN model using TensorFlow/Keras, optimizing for high validation accuracy and preventing overfitting. The model was exported as an `.h5` file. **Member 1** finalized `CoffeeTraceability.sol` and wrote automated Hardhat deployment scripts.
- **Weeks 3-4:** **Member 3** and **Member 2** collaborated to develop the FastAPI service (`ai-service/app/main.py`), exposing the ML model via a REST API. **Member 3** began building the Next.js frontend architecture and state management.

### Month 3: Integration, Testing, and Deployment
- **Weeks 1-2:** End-to-end integration began. **Member 3** connected the Next.js frontend to both the FastAPI AI service (via HTTP requests) and the local Ethereum node (via `viem` and `ethers.js`).
- **Weeks 3-4:** **Member 3** implemented the AI Image Acquisition UI with micro-animations. The team resolved integration bugs, including `EADDRINUSE` port conflicts and absolute path loading issues for the AI model. The QR Code generation flow—tying the database metadata to the on-chain immutable hashes—was finalized. The academic documentation was authored to prepare for project defense and future publication.

## 4. Methodology

### A. Artificial Intelligence & Computer Vision
The computer vision pipeline is built on TensorFlow and deployed via a high-performance FastAPI microservice. 
1. **Preprocessing:** Input images are normalized and resized to `224x224` pixels to match the input tensor requirements of the network.
2. **Inference:** The model extracts feature vectors and computes a softmax probability distribution across the defined classes.
3. **Evaluation:** The system calculates the defect percentage. If the detected class is 'Defect', the batch is assigned a lower Quality Grade (e.g., Grade C), whereas acceptable beans receive Grade A.

### B. Blockchain & Smart Contracts
Data anchoring is handled by a Solidity Smart Contract (`CoffeeTraceability.sol`). To minimize gas fees, heavy data is stored off-chain in a relational database (SQLite/PostgreSQL) or IPFS. The contract enforces data integrity by storing:
- `batchId` (Unique Identifier)
- `imageHash` (Cryptographic SHA-256 hash of the source image)
- `aiResultHash` (SHA-256 Hash of the AI inference output)
- `ipfsCID` (Decentralized storage pointer)
- `timestamp` & `assessorAddress`

### C. Frontend and Backend Integration
The user interface is a highly responsive Next.js application employing modern web aesthetics. 
- **Farmer Dashboard:** A 3-step dynamic pipeline visually guides the farmer through uploading an image, awaiting the AI response (complete with simulated scanning animations), and generating the blockchain QR code.
- **Consumer Verification:** By scanning the generated QR code, users fetch data that is cross-verified between the off-chain database and the Hardhat local blockchain, ensuring the physical package matches the digital twin without tampering.

## 5. Results and Discussion
The integrated system successfully demonstrates a trustless verification flow. The AI model operates with low latency on the CPU, classifying beans accurately. The blockchain integration confirms that once a batch is registered, critical AI parameters and images cannot be tampered with by bad actors without altering the cryptographic hashes on the ledger, establishing a single source of truth.

## 6. Future Scope
This prototype lays the groundwork for a full-scale deployment and potential publication. Future iterations will:
1. Migrate the Smart Contract from the local Hardhat network to a public Testnet (e.g., Base Sepolia or Polygon Amoy).
2. Upload images directly to IPFS (via Pinata API) instead of utilizing local mock storage.
3. Optimize the AI model using quantization (e.g., TensorFlow Lite) for edge-device deployment directly on farmers' smartphones.

## 7. References
[1] Nakamoto, S., "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008.  
[2] Krizhevsky, A., Sutskever, I., & Hinton, G. E., "ImageNet classification with deep convolutional neural networks," *Communications of the ACM*, 2017.  
[3] Wood, G., "Ethereum: A Secure Decentralised Generalised Transaction Ledger," 2014.  
[4] "Next.js Documentation," Vercel, [Online]. Available: https://nextjs.org/docs.  
