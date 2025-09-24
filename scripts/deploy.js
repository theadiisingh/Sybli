const hre = require("hardhat");
const fs = require("fs"); // Import the Node.js file system module

async function main() {
  console.log("Starting deployment...");

  // Deploy all contracts as before
  const HumanityNFT = await hre.ethers.getContractFactory("HumanityNFT");
  const humanityNFT = await HumanityNFT.deploy();
  await humanityNFT.waitForDeployment();
  console.log(`✅ HumanityNFT deployed to: ${humanityNFT.target}`);

  const HumanityRegistry = await hre.ethers.getContractFactory("HumanityRegistry");
  const humanityRegistry = await HumanityRegistry.deploy(humanityNFT.target);
  await humanityRegistry.waitForDeployment();
  console.log(`✅ HumanityRegistry deployed to: ${humanityRegistry.target}`);

  console.log("Transferring ownership of HumanityNFT to HumanityRegistry...");
  const tx = await humanityNFT.transferOwnership(humanityRegistry.target);
  await tx.wait();
  console.log("Ownership transferred successfully.");

  const SybilResistantDAO = await hre.ethers.getContractFactory("SybilResistantDAO");
  const sybilResistantDAO = await SybilResistantDAO.deploy(humanityNFT.target);
  await sybilResistantDAO.waitForDeployment();
  console.log(`✅ SybilResistantDAO deployed to: ${sybilResistantDAO.target}`);

  const BiometricOracle = await hre.ethers.getContractFactory("BiometricOracle");
  const biometricOracle = await BiometricOracle.deploy();
  await biometricOracle.waitForDeployment();
  console.log(`✅ BiometricOracle deployed to: ${biometricOracle.target}`);

  console.log("\nDeployment complete! 🎉");

  // --- NEW CODE ---
  // Create an object with all the deployed contract addresses
  const addresses = {
    humanityNFT: humanityNFT.target,
    humanityRegistry: humanityRegistry.target,
    sybilResistantDAO: sybilResistantDAO.target,
    biometricOracle: biometricOracle.target,
  };

  // Save the addresses to a JSON file
  fs.writeFileSync(
    "deployment-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nSaved deployment addresses to deployment-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});