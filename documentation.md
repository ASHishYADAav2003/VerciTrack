# Coffee Traceability System - Project Documentation

Welcome to the Coffee Traceability prototype documentation. This document outlines the project's architecture, the technologies powering it, and the team members responsible for each core component.

## 👥 Team Contributions & Architecture

The project is divided into three major technical pillars, each managed by a dedicated team member. 

### 1. Frontend Development
**Lead Developer:** Tanishq Singh

The frontend provides the user interface for farmers, administrators, and consumers to interact with the traceability platform. It is built focusing on a responsive, typed, and modern web experience.

**Technologies Used:**
- **React**: Powers the component-based UI and reactive state management.
- **TypeScript**: Ensures type safety, reducing runtime errors and improving code quality.
- **Vanilla CSS**: Used for custom, flexible, and aesthetic styling across the application components.

### 2. Blockchain & Smart Contracts
**Lead Developer:** Prerit Singh

The blockchain layer acts as the immutable ledger for the coffee traceability platform. It ensures that data regarding the origin, lab tests, and ownership of the coffee is tamper-proof and fully transparent.

**Technologies Used:**
- **Ethereum**: The core blockchain network used to deploy and interact with smart contracts.
- **Solidity** (Smart Contracts): Used to write the logic for registering coffee batches and updating their traceability status.
- **Hardhat**: The development environment used for compiling, testing, and deploying the Ethereum smart contracts.

### 3. AI & Data Processing
**Lead Developer:** Ashish Kumar

The AI and Data module is responsible for analyzing and ensuring the quality parameters of the coffee batches. Currently, the foundational data processing has been completed to prepare for more advanced machine learning integration.

**Current Status & Technologies:**
- **Data Preprocessing**: Initial data cleaning, normalization, and preparation steps have been completed. This ensures that the lab analytics and quality metrics (such as moisture, acidity, and HMF) are ready to be ingested by the AI models.
- *(Future integrations will include the full Random Forest ML model for compliance scoring).*

---

*Note: This documentation will be continuously updated as the project evolves and new features are integrated.*
