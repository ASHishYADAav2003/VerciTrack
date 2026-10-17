/**
 * scripts/seed-data.ts
 * Comprehensive database, JSON, and blockchain data seeder for VerciTrack.
 * Populates realistic data for all user roles, batches, orders, lab records, and blockchain state.
 */
import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";
import fs from "fs/promises";
import path from "path";
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL } from "../lib/contractConfig";

const prisma = new PrismaClient();
const DEPLOYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  console.log("🌱 Starting VerciTrack realistic dummy data seeding...");

  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SEED USERS (Admin, Farmers in various states, Customers)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("👤 Seeding Users...");

  const usersData = [
    {
      id: "usr_admin_01",
      email: "admin@vercitrack.com",
      name: "Marcus Sterling (Lead Auditor)",
      role: "admin",
      status: "approved",
      passwordHash: "admin123",
      location: "Geneva, Switzerland",
      farmName: null,
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    {
      id: "usr_farmer_01",
      email: "abebe.bikila@yirgacheffe.eth",
      name: "Abebe Bikila",
      role: "farmer",
      status: "approved",
      passwordHash: "farmer123",
      location: "Yirgacheffe, Gedeo Zone, Ethiopia",
      farmName: "Yirgacheffe Highlands Estate",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    },
    {
      id: "usr_farmer_02",
      email: "sofia.martinez@antioquia.eth",
      name: "Sofia Martinez",
      role: "farmer",
      status: "approved",
      passwordHash: "farmer123",
      location: "Jericó, Antioquia, Colombia",
      farmName: "Finca Los Andes Organic",
      walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    },
    {
      id: "usr_farmer_03",
      email: "kinyanjui.mwangi@nyeri.eth",
      name: "Kinyanjui Mwangi",
      role: "farmer",
      status: "approved",
      passwordHash: "farmer123",
      location: "Nyeri Hill, Central Highlands, Kenya",
      farmName: "Mount Kenya Heritage Cooperative",
      walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    },
    {
      id: "usr_farmer_04",
      email: "amara.diallo@guinea.eth",
      name: "Amara Diallo",
      role: "farmer",
      status: "pending", // Ready for testing /admin/approvals
      passwordHash: "farmer123",
      location: "Mount Nimba Biosphere, Nzérékoré, Guinea",
      farmName: "Nimba High Altitude Agroforestry",
      walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    },
    {
      id: "usr_farmer_05",
      email: "lucas.silva@cerrado.eth",
      name: "Lucas Silva",
      role: "farmer",
      status: "pending", // Ready for testing /admin/approvals
      passwordHash: "farmer123",
      location: "Patrocínio, Cerrado Mineiro, Brazil",
      farmName: "Fazenda Santa Inês Specialty",
      walletAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    },
    {
      id: "usr_farmer_06",
      email: "viktor.vance@industrial.xyz",
      name: "Viktor Vance",
      role: "farmer",
      status: "rejected", // Ready for testing rejection handling
      passwordHash: "farmer123",
      location: "Industrial District 4",
      farmName: "Commodity Bulk Blenders",
      walletAddress: "0x976EA74026E72CD55542bB1059F43571d754639b",
    },
    {
      id: "usr_cust_01",
      email: "elena.rostova@nordicroast.se",
      name: "Elena Rostova",
      role: "customer",
      status: "approved",
      passwordHash: "customer123",
      location: "Stockholm, Sweden",
      farmName: null,
      walletAddress: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    },
    {
      id: "usr_cust_02",
      email: "marcus.vance@bluebottleroasters.com",
      name: "Marcus Vance",
      role: "customer",
      status: "approved",
      passwordHash: "customer123",
      location: "San Francisco, USA",
      farmName: null,
      walletAddress: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    },
    {
      id: "usr_cust_03",
      email: "kenji.sato@tokyocoffeelab.jp",
      name: "Kenji Sato",
      role: "customer",
      status: "approved",
      passwordHash: "customer123",
      location: "Shibuya, Tokyo, Japan",
      farmName: null,
      walletAddress: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    },
  ];

  // Prisma Users
  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
  }

  // users.json
  const usersJsonPath = path.join(dataDir, "users.json");
  await fs.writeFile(
    usersJsonPath,
    JSON.stringify(
      usersData.map((u) => ({
        ...u,
        approvalStatus: u.status,
      })),
      null,
      2
    )
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SEED COFFEE TYPES & PENDING TYPES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("☕ Seeding Coffee Types...");

  const coffeeTypes = [
    { name: "Arabica", code: "ARA", description: "High-altitude specialty Arabica with delicate malic acidity and floral jasmine aroma." },
    { name: "Gesha", code: "GSH", description: "World-renowned rare heirloom cultivar featuring intense bergamot, peach, and floral complexity." },
    { name: "Bourbon", code: "BRB", description: "Classic heritage variety famed for rich buttery sweetness, round body, and chocolate-caramel notes." },
    { name: "SL28", code: "SL28", description: "Iconic Kenyan selection celebrated for vibrant blackcurrant, phosphoric acidity, and juicy finish." },
    { name: "Typica", code: "TYP", description: "Foundational lineage offering pristine cup clarity, mild citric brightness, and honey sweetness." },
    { name: "Pacamara", code: "PCM", description: "Prized large-bean cross known for distinct guava, tropical fruit, and full velvety mouthfeel." },
    { name: "Robusta", code: "ROB", description: "High-elevation Canephora cultivated for dense espresso crema, deep cocoa, and spice profile." },
  ];

  for (const ct of coffeeTypes) {
    await prisma.coffeeType.upsert({
      where: { code: ct.code },
      update: { name: ct.name, description: ct.description, isKnown: true },
      create: { name: ct.name, code: ct.code, description: ct.description, isKnown: true },
    });
  }

  const knownTypesRecord: Record<string, string> = {};
  for (const ct of coffeeTypes) {
    knownTypesRecord[ct.name.toLowerCase()] = ct.name;
  }
  await fs.writeFile(path.join(dataDir, "coffeeTypes.json"), JSON.stringify(knownTypesRecord, null, 2));

  // Unknown types for testing /admin/coffee-types approvals
  const unknownTypes = [
    {
      raw: "sudan rume",
      suggested: "Sudan Rume",
      submitter: "Abebe Bikila",
      date: new Date().toISOString(),
      notes: "Wild landrace cultivar from Boma Plateau with intense cardamom and ginger spice notes.",
    },
    {
      raw: "wush wush",
      suggested: "Wush Wush",
      submitter: "Sofia Martinez",
      date: new Date().toISOString(),
      notes: "Rare low-yield Ethiopian variety featuring exotic papaya, passion fruit, and dense sweetness.",
    },
  ];
  await fs.writeFile(path.join(dataDir, "unknownCoffeeTypes.json"), JSON.stringify(unknownTypes, null, 2));

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SEED BATCHES & METRICS (Database & JSON)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📦 Seeding Batches & Lab Records...");

  const batches = [
    {
      batchId: "HON-ETH-ARA-26-0001",
      coffeeType: "Arabica",
      origin: "Yirgacheffe, Ethiopia",
      farmerName: "Abebe Bikila",
      harvestYear: 2026,
      description: "Grade 1 Washed heirloom lot grown at 2,150m. Delicate white peach, jasmine florals, and bergamot finish.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0001.png",
      weight: "120 kg",
      price: 28.5,
      approvalStatus: "approved",
      qualityStatus: "passed",
      qualityScore: 96,
      qualityTier: "Exceptional",
      producerDeclaration: "100% shade-grown organic Ethiopian heirloom, spring water washed, African raised-bed sun-dried.",
      certificateUrl: "/certificates/CERT-HON-ETH-ARA-26-0001.pdf",
      pdfHash: "0x8fa134d4715b7e3b1c67e891c32fa7e56b3e59012a4b87e2b19cf390aa129e01",
      humidity: 10.8,
      hmf: 2.8,
      diastase: 22.4,
      freeAcidity: 14.1,
      proline: 680,
      conductivity: 0.32,
      fructoseGlucose: 74.5,
      reducingSugars: 68.2,
      sucrose: 1.2,
      ash: 0.18,
      isotopicDiff: 0.08,
      colour: 35,
      residuesClean: true,
      onChain: true,
      jarSizeG: 500,
      totalStock: 120,
      wholesaleQty: 100,
      wholesaleUnit: "kg",
    },
    {
      batchId: "HON-COL-GSH-26-0002",
      coffeeType: "Gesha",
      origin: "Antioquia, Colombia",
      farmerName: "Sofia Martinez",
      harvestYear: 2026,
      description: "Competition micro-lot Gesha grown at 1,980m. Vibrant notes of Meyer lemon, lemongrass, and apricot honey.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0002.png",
      weight: "60 kg",
      price: 48.0,
      approvalStatus: "approved",
      qualityStatus: "passed",
      qualityScore: 98,
      qualityTier: "Exceptional",
      producerDeclaration: "Hand-picked red-cherries only. 48hr slow anaerobic honey process followed by shaded parabolic drying.",
      certificateUrl: "/certificates/CERT-HON-COL-GSH-26-0002.pdf",
      pdfHash: "0x91bb4021cfd485e9b7201c13d749a5b3a4a7536d71b3e8e7c10b48f93ea91234",
      humidity: 11.2,
      hmf: 1.9,
      diastase: 26.1,
      freeAcidity: 12.5,
      proline: 740,
      conductivity: 0.28,
      fructoseGlucose: 78.0,
      reducingSugars: 71.4,
      sucrose: 0.9,
      ash: 0.16,
      isotopicDiff: 0.05,
      colour: 30,
      residuesClean: true,
      onChain: true,
      jarSizeG: 250,
      totalStock: 60,
      wholesaleQty: 50,
      wholesaleUnit: "kg",
    },
    {
      batchId: "HON-KEN-SL28-26-0003",
      coffeeType: "SL28",
      origin: "Nyeri Hill, Kenya",
      farmerName: "Kinyanjui Mwangi",
      harvestYear: 2026,
      description: "Volcanic soil SL28 AA lot. Complex blackcurrant cordial, crisp red apple, and sparkling phosphoric acidity.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0003.png",
      weight: "90 kg",
      price: 34.0,
      approvalStatus: "approved",
      qualityStatus: "passed",
      qualityScore: 94,
      qualityTier: "Exceptional",
      producerDeclaration: "Double-fermentation washed method with Mount Kenya glacier run-off water.",
      certificateUrl: "/certificates/CERT-HON-KEN-SL28-26-0003.pdf",
      pdfHash: "0x7bc2109aa7482f534e891b24c18402ff678912e345b6a78c90123ef123456789",
      humidity: 10.9,
      hmf: 3.2,
      diastase: 20.8,
      freeAcidity: 16.0,
      proline: 610,
      conductivity: 0.35,
      fructoseGlucose: 72.0,
      reducingSugars: 66.0,
      sucrose: 1.4,
      ash: 0.22,
      isotopicDiff: 0.12,
      colour: 40,
      residuesClean: true,
      onChain: true,
      jarSizeG: 500,
      totalStock: 90,
      wholesaleQty: 75,
      wholesaleUnit: "kg",
    },
    {
      batchId: "HON-GUA-BRB-26-0004",
      coffeeType: "Bourbon",
      origin: "Antigua, Guatemala",
      farmerName: "Sofia Martinez",
      harvestYear: 2026,
      description: "Traditional shaded Bourbon grown under Gravilea trees. Milk chocolate, caramelized hazelnut, and sweet orange.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0005.png",
      weight: "150 kg",
      price: 22.0,
      approvalStatus: "approved",
      qualityStatus: "passed",
      qualityScore: 88,
      qualityTier: "Premium",
      producerDeclaration: "100% Antigua volcanic basin certified single estate Bourbon.",
      certificateUrl: "/certificates/CERT-HON-GUA-BRB-26-0004.pdf",
      pdfHash: "0x44fa781290bb34e1256789abcdef0123456789abcdef0123456789abcdef0123",
      humidity: 11.6,
      hmf: 6.4,
      diastase: 16.5,
      freeAcidity: 22.3,
      proline: 490,
      conductivity: 0.42,
      fructoseGlucose: 68.5,
      reducingSugars: 63.1,
      sucrose: 2.1,
      ash: 0.28,
      isotopicDiff: 0.22,
      colour: 48,
      residuesClean: true,
      onChain: true,
      jarSizeG: 1000,
      totalStock: 150,
      wholesaleQty: 120,
      wholesaleUnit: "kg",
    },
    {
      batchId: "HON-ETH-TYP-26-0005",
      coffeeType: "Typica",
      origin: "Sidama, Ethiopia",
      farmerName: "Abebe Bikila",
      harvestYear: 2026,
      description: "Natural sun-dried Typica lot. Berry forward with red wine, dried fig, and mild dark chocolate.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0006.png",
      weight: "200 kg",
      price: 18.5,
      approvalStatus: "approved",
      qualityStatus: "caution",
      qualityScore: 68,
      qualityTier: "Good",
      producerDeclaration: "Natural process with extended fermentation window.",
      certificateUrl: null,
      pdfHash: null,
      humidity: 13.5, // Slightly elevated moisture triggers caution
      hmf: 18.5,
      diastase: 11.0,
      freeAcidity: 32.0,
      proline: 380,
      conductivity: 0.55,
      fructoseGlucose: 62.0,
      reducingSugars: 58.0,
      sucrose: 3.5,
      ash: 0.45,
      isotopicDiff: 0.45,
      colour: 55,
      residuesClean: true,
      onChain: true,
      jarSizeG: 500,
      totalStock: 200,
      wholesaleQty: 150,
      wholesaleUnit: "kg",
    },
    {
      batchId: "HON-IND-ROB-26-0006",
      coffeeType: "Robusta",
      origin: "Industrial Transit Terminal",
      farmerName: "Viktor Vance",
      harvestYear: 2025,
      description: "Non-compliant sample failing EU moisture & adulteration safety standards.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0007.png",
      weight: "500 kg",
      price: 7.5,
      approvalStatus: "rejected",
      qualityStatus: "failed",
      qualityScore: 28,
      qualityTier: "Non-Compliant",
      producerDeclaration: "Commercial blend.",
      certificateUrl: null,
      pdfHash: null,
      humidity: 21.8, // Breaches regulatory threshold
      hmf: 58.0,      // Exceeds 40 mg/kg limit
      diastase: 4.5,
      freeAcidity: 56.0,
      proline: 180,
      conductivity: 0.95,
      fructoseGlucose: 48.0,
      reducingSugars: 45.0,
      sucrose: 7.8,
      ash: 0.85,
      isotopicDiff: 1.45, // Adulteration flag
      colour: 75,
      residuesClean: false,
      onChain: false,
      jarSizeG: 1000,
      totalStock: 0,
      wholesaleQty: 0,
      wholesaleUnit: "kg",
    },
  ];

  // 1. Prisma Batch records
  for (const b of batches) {
    const { onChain, jarSizeG, totalStock, wholesaleQty, wholesaleUnit, ...prismaData } = b;
    await prisma.batch.upsert({
      where: { batchId: b.batchId },
      update: { ...prismaData, approvedAt: new Date() },
      create: { ...prismaData, approvedAt: new Date() },
    });
  }

  // 2. data/marketplaceBatches.json
  const marketplaceBatches = batches.map((b) => ({
    batchId: b.batchId,
    name: `${b.origin} ${b.coffeeType}`,
    coffeeType: b.coffeeType,
    origin: b.origin,
    farmerName: b.farmerName,
    price: b.price,
    weight: b.weight,
    description: b.description,
    image: b.image,
    approvalStatus: b.approvalStatus,
    qualityStatus: b.qualityStatus,
    approvedAt: new Date().toISOString(),
  }));
  await fs.writeFile(path.join(dataDir, "marketplaceBatches.json"), JSON.stringify(marketplaceBatches, null, 2));

  // 3. data/batchExtras.json
  const batchExtras: Record<string, any> = {};
  for (const b of batches) {
    batchExtras[b.batchId] = {
      description: b.description,
      price: b.price,
      image: b.image,
      certificateUrl: b.certificateUrl,
      pdfHash: b.pdfHash,
      jarSizeG: b.jarSizeG,
      weight: b.weight,
      totalStock: b.totalStock,
      wholesaleQty: b.wholesaleQty,
      wholesaleUnit: b.wholesaleUnit,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };
  }
  await fs.writeFile(path.join(dataDir, "batchExtras.json"), JSON.stringify(batchExtras, null, 2));

  // 4. data/pendingBatches.json (For testing /admin/batch-approvals)
  const pendingBatches = [
    {
      batchId: "HON-ETH-ARA-26-0007",
      farmerName: "Abebe Bikila",
      origin: "Guji Zone, Oromia, Ethiopia",
      coffeeType: "Arabica",
      harvestYear: 2026,
      producerDeclaration: "Guji highlands micro-lot with 72-hour anaerobic fermentation.",
      pdfHash: "0x33445566778899aabbccddeeff00112233445566778899aabbccddeeff001122",
      pdfName: "Guji-MicroLot-2026.pdf",
      certificateUrl: "/certificates/CERT-HON-ETH-ARA-26-0007.pdf",
      humidity: 10.6,
      hmf: 2.1,
      colour: 32,
      diastase: 24.5,
      freeAcidity: 13.0,
      proline: 710,
      conductivity: 0.31,
      fructoseGlucose: 76.0,
      reducingSugars: 70.0,
      sucrose: 1.1,
      ash: 0.17,
      isotopicDiff: 0.06,
      qualityScore: 97,
      qualityTier: "Exceptional",
      qualityStatus: "Passed",
      price: 36.0,
      wholesaleQty: 80,
      wholesaleUnit: "kg",
      jarSizeG: 500,
      totalStock: 80,
      weight: "80 kg",
      description: "Rare Guji natural anaerobically fermented with explosive blueberry jam and lavender notes.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0008.png",
      source: "farmer",
      approvalStatus: "pending",
      createdAt: new Date().toISOString(),
      onChain: false,
    },
    {
      batchId: "HON-COL-PCM-26-0008",
      farmerName: "Sofia Martinez",
      origin: "Huila, Colombia",
      coffeeType: "Pacamara",
      harvestYear: 2026,
      producerDeclaration: "Single tree lot Pacamara from high ridge elevation (2,050m).",
      pdfHash: null,
      pdfName: null,
      certificateUrl: null,
      humidity: 11.4,
      hmf: 3.5,
      colour: 38,
      diastase: 19.8,
      freeAcidity: 15.2,
      proline: 630,
      conductivity: 0.36,
      fructoseGlucose: 70.5,
      reducingSugars: 64.8,
      sucrose: 1.5,
      ash: 0.21,
      isotopicDiff: 0.14,
      qualityScore: 92,
      qualityTier: "Exceptional",
      qualityStatus: "Passed",
      price: 42.0,
      wholesaleQty: 50,
      wholesaleUnit: "kg",
      jarSizeG: 250,
      totalStock: 50,
      weight: "50 kg",
      description: "Huila Pacamara exhibiting luscious tropical guava, ripe stone fruit, and dark honey.",
      image: "/batch-photos/batch-HON-ALB-MFL-26-0009.png",
      source: "farmer",
      approvalStatus: "pending",
      createdAt: new Date().toISOString(),
      onChain: false,
    },
  ];
  await fs.writeFile(path.join(dataDir, "pendingBatches.json"), JSON.stringify(pendingBatches, null, 2));

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SEED ORDERS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🛒 Seeding Orders...");

  const ordersData = [
    {
      id: "ord-2026-001",
      batchId: "HON-ETH-ARA-26-0001",
      coffeeType: "Arabica",
      farmerName: "Abebe Bikila",
      customer: "Elena Rostova",
      customerName: "Elena Rostova",
      customerEmail: "elena.rostova@nordicroast.se",
      quantity: 15,
      price: 28.5,
      total: 427.5,
      status: "delivered",
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      buyerWallet: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      createdAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      id: "ord-2026-002",
      batchId: "HON-COL-GSH-26-0002",
      coffeeType: "Gesha",
      farmerName: "Sofia Martinez",
      customer: "Marcus Vance",
      customerName: "Marcus Vance",
      customerEmail: "marcus.vance@bluebottleroasters.com",
      quantity: 10,
      price: 48.0,
      total: 480.0,
      status: "shipped",
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      buyerWallet: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: "ord-2026-003",
      batchId: "HON-KEN-SL28-26-0003",
      coffeeType: "SL28",
      farmerName: "Kinyanjui Mwangi",
      customer: "Kenji Sato",
      customerName: "Kenji Sato",
      customerEmail: "kenji.sato@tokyocoffeelab.jp",
      quantity: 20,
      price: 34.0,
      total: 680.0,
      status: "processing",
      txHash: "0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      buyerWallet: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: "ord-2026-004",
      batchId: "HON-GUA-BRB-26-0004",
      coffeeType: "Bourbon",
      farmerName: "Sofia Martinez",
      customer: "Elena Rostova",
      customerName: "Elena Rostova",
      customerEmail: "elena.rostova@nordicroast.se",
      quantity: 25,
      price: 22.0,
      total: 550.0,
      status: "confirmed",
      txHash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      buyerWallet: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      createdAt: new Date(Date.now() - 4 * 3600000),
    },
  ];

  // Prisma Orders
  for (const o of ordersData) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {
        batchId: o.batchId,
        customer: o.customer,
        quantity: o.quantity,
        price: o.price,
        status: o.status,
        createdAt: o.createdAt,
      },
      create: {
        id: o.id,
        batchId: o.batchId,
        customer: o.customer,
        quantity: o.quantity,
        price: o.price,
        status: o.status,
        createdAt: o.createdAt,
      },
    });
  }

  // data/orders.json
  await fs.writeFile(
    path.join(dataDir, "orders.json"),
    JSON.stringify(
      ordersData.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      })),
      null,
      2
    )
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SEED LAB ANALYTICS & TRAINING RECORDS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🔬 Seeding Lab History & Analytics Records...");

  const labRecords = [
    { batchId: "HON-ETH-ARA-26-0001", coffeeType: "Arabica", humidity: 10.8, hmf: 2.8, diastase: 22.4, freeAcidity: 14.1, proline: 680, conductivity: 0.32, fructoseGlucose: 74.5, reducingSugars: 68.2, sucrose: 1.2, ash: 0.18, isotopicDiff: 0.08, colour: 35, residuesClean: true, isAuthentic: true },
    { batchId: "HON-COL-GSH-26-0002", coffeeType: "Gesha",   humidity: 11.2, hmf: 1.9, diastase: 26.1, freeAcidity: 12.5, proline: 740, conductivity: 0.28, fructoseGlucose: 78.0, reducingSugars: 71.4, sucrose: 0.9, ash: 0.16, isotopicDiff: 0.05, colour: 30, residuesClean: true, isAuthentic: true },
    { batchId: "HON-KEN-SL28-26-0003", coffeeType: "SL28",   humidity: 10.9, hmf: 3.2, diastase: 20.8, freeAcidity: 16.0, proline: 610, conductivity: 0.35, fructoseGlucose: 72.0, reducingSugars: 66.0, sucrose: 1.4, ash: 0.22, isotopicDiff: 0.12, colour: 40, residuesClean: true, isAuthentic: true },
    { batchId: "HON-GUA-BRB-26-0004", coffeeType: "Bourbon", humidity: 11.6, hmf: 6.4, diastase: 16.5, freeAcidity: 22.3, proline: 490, conductivity: 0.42, fructoseGlucose: 68.5, reducingSugars: 63.1, sucrose: 2.1, ash: 0.28, isotopicDiff: 0.22, colour: 48, residuesClean: true, isAuthentic: true },
    { batchId: "HON-ETH-TYP-26-0005", coffeeType: "Typica",  humidity: 13.5, hmf: 18.5, diastase: 11.0, freeAcidity: 32.0, proline: 380, conductivity: 0.55, fructoseGlucose: 62.0, reducingSugars: 58.0, sucrose: 3.5, ash: 0.45, isotopicDiff: 0.45, colour: 55, residuesClean: true, isAuthentic: true },
    { batchId: "HON-IND-ROB-26-0006", coffeeType: "Robusta", humidity: 21.8, hmf: 58.0, diastase: 4.5, freeAcidity: 56.0, proline: 180, conductivity: 0.95, fructoseGlucose: 48.0, reducingSugars: 45.0, sucrose: 7.8, ash: 0.85, isotopicDiff: 1.45, colour: 75, residuesClean: false, isAuthentic: false },
    { batchId: "HON-LAB-HIST-0001",   coffeeType: "Arabica", humidity: 10.5, hmf: 2.2, diastase: 23.0, freeAcidity: 13.8, proline: 690, conductivity: 0.30, fructoseGlucose: 75.0, reducingSugars: 69.0, sucrose: 1.1, ash: 0.17, isotopicDiff: 0.07, colour: 34, residuesClean: true, isAuthentic: true },
    { batchId: "HON-LAB-HIST-0002",   coffeeType: "Gesha",   humidity: 11.0, hmf: 1.8, diastase: 27.5, freeAcidity: 11.9, proline: 760, conductivity: 0.27, fructoseGlucose: 79.2, reducingSugars: 72.5, sucrose: 0.8, ash: 0.15, isotopicDiff: 0.04, colour: 28, residuesClean: true, isAuthentic: true },
    { batchId: "HON-LAB-HIST-0003",   coffeeType: "Bourbon", humidity: 11.4, hmf: 5.1, diastase: 18.2, freeAcidity: 19.5, proline: 520, conductivity: 0.39, fructoseGlucose: 69.8, reducingSugars: 64.2, sucrose: 1.8, ash: 0.25, isotopicDiff: 0.18, colour: 45, residuesClean: true, isAuthentic: true },
    { batchId: "HON-LAB-HIST-0004",   coffeeType: "SL28",    humidity: 10.7, hmf: 3.0, diastase: 21.4, freeAcidity: 15.5, proline: 630, conductivity: 0.33, fructoseGlucose: 73.1, reducingSugars: 67.4, sucrose: 1.3, ash: 0.20, isotopicDiff: 0.10, colour: 38, residuesClean: true, isAuthentic: true },
  ];

  for (const lr of labRecords) {
    await prisma.labRecord.upsert({
      where: { batchId: lr.batchId },
      update: lr,
      create: lr,
    });
  }

  // data/mlBatchRecords.json
  const mlRecords = labRecords.map((r, i) => ({
    batchId: r.batchId,
    coffeeType: r.coffeeType,
    humidity: r.humidity,
    hmf: r.hmf,
    diastase: r.diastase,
    freeAcidity: r.freeAcidity,
    proline: r.proline,
    conductivity: r.conductivity,
    fructoseGlucose: r.fructoseGlucose,
    reducingSugars: r.reducingSugars,
    sucrose: r.sucrose,
    ash: r.ash,
    isotopicDiff: r.isotopicDiff,
    ruleScore: r.isAuthentic ? 90 + (i % 8) : 30,
    addedAt: new Date().toISOString(),
  }));
  await fs.writeFile(path.join(dataDir, "mlBatchRecords.json"), JSON.stringify(mlRecords, null, 2));

  // ───────────────────────────────────────────────────────────────────────────
  // 6. SEED SETTINGS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("⚙️  Seeding Site Settings...");

  const settings = {
    heroTitle: "VerciTrack Coffee Provenance & Quality",
    heroSubtitle: "Immutable blockchain provenance and AI-verified quality analytics for single-origin specialty coffee.",
    heroImageUrl: "/hero-bg.png",
    platformName: "VerciTrack",
    minAcceptableScore: "70",
    contactEmail: "audit@vercitrack.com",
    autoApprovalThreshold: "85",
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await fs.writeFile(path.join(dataDir, "siteSettings.json"), JSON.stringify(settings, null, 2));

  // ───────────────────────────────────────────────────────────────────────────
  // 7. SEED SMART CONTRACT ON-CHAIN BATCHES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🔗 Registering Batches On-Chain (Hardhat)...");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    console.log(`Connecting to contract at: ${CONTRACT_ADDRESS}`);
    let currentNonce = await provider.getTransactionCount(wallet.address, "latest");
    console.log(`Current deployer nonce: ${currentNonce}`);

    for (const b of batches) {
      if (!b.onChain) continue;

      try {
        const core = await contract.getBatchCore(b.batchId);
        if (core && core[6] === true) {
          console.log(`  ✓ Batch ${b.batchId} already registered on-chain.`);
          continue;
        }
      } catch {
        // Not registered yet, proceed to register
      }

      console.log(`  Registering ${b.batchId} on-chain...`);

      const extParams: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
        BigInt(Math.round((b.diastase ?? 15) * 10)),
        BigInt(Math.round((b.freeAcidity ?? 15) * 10)),
        BigInt(Math.round(b.proline ?? 500)),
        BigInt(Math.round((b.conductivity ?? 0.3) * 1000)),
        BigInt(Math.round((b.fructoseGlucose ?? 70) * 10)),
        BigInt(Math.round((b.reducingSugars ?? 65) * 10)),
        BigInt(Math.round((b.sucrose ?? 1.5) * 10)),
        BigInt(Math.round((b.ash ?? 0.2) * 1000)),
        BigInt(Math.round((b.isotopicDiff ?? 0.1) * 100)),
      ];

      const priceWei = ethers.parseEther(((b.price ?? 20) * 0.0005).toFixed(6)); // ~0.01 ETH

      const tx = await contract.registerBatch(
        b.batchId,
        b.farmerName,
        b.origin,
        b.coffeeType,
        b.pdfHash ?? "",
        b.producerDeclaration ?? "",
        BigInt(Math.round((b.humidity ?? 11) * 10)),
        BigInt(Math.round((b.hmf ?? 3) * 10)),
        BigInt(Math.round(b.colour ?? 35)),
        BigInt(b.harvestYear ?? 2026),
        extParams,
        BigInt(b.qualityScore ?? 90),
        b.qualityTier ?? "Exceptional",
        priceWei,
        BigInt(b.jarSizeG ?? 500),
        BigInt(b.totalStock ?? 100),
        { nonce: currentNonce++ }
      );

      await tx.wait();
      console.log(`  ✓ On-Chain Tx confirmed for ${b.batchId}: ${tx.hash}`);

      // Update Prisma with on-chain tx hash
      await prisma.batch.update({
        where: { batchId: b.batchId },
        data: { txHash: tx.hash },
      });
    }
  } catch (err: any) {
    console.warn("⚠️  Could not register batches on blockchain:", err?.message || err);
    console.warn("   (Ensure hardhat node is running if on-chain testing is desired)");
  }

  console.log("\n🎉 ALL REALISTIC DUMMY DATA SEEDED SUCCESSFULLY!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
