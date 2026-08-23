const hre = require("hardhat");

async function main() {
  // In a real scenario, this would be the backend's relayer wallet address
  // For testing, we just use the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const QualityLedger = await hre.ethers.getContractFactory("QualityLedger");
  const qualityLedger = await QualityLedger.deploy(deployer.address);

  await qualityLedger.waitForDeployment();

  console.log("QualityLedger deployed to:", await qualityLedger.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
