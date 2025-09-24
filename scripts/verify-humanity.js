const hre = require("hardhat");

// Import the saved addresses from the JSON file
const addresses = require("../deployment-addresses.json");

async function main() {
  // --- CONFIGURATION (NOW DYNAMIC) ---
  const registryAddress = addresses.humanityRegistry;
  // Get the second account provided by the local Hardhat node
  const [, userSigner] = await hre.ethers.getSigners();
  const userToRegister = userSigner.address;
  // -----------------------------------

  console.log(`Connecting to HumanityRegistry at ${registryAddress}...`);

  // Get the contract instance
  const humanityRegistry = await hre.ethers.getContractAt(
    "HumanityRegistry",
    registryAddress
  );

  // Create a new, unique bioHash for this user
  const bioHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes(`bio_for_${userToRegister}_${Date.now()}`)
  );

  console.log(`Registering user ${userToRegister} with bioHash ${bioHash}...`);

  // Call the registerHumanity function using the user's signer
  const tx = await humanityRegistry.connect(userSigner).registerHumanity(bioHash);
  await tx.wait(); // Wait for the transaction to be mined

  // Check if the user is now registered
  const isRegistered = await humanityRegistry.isRegistered(userToRegister);

  if (isRegistered) {
    console.log(`✅ Success! User ${userToRegister} has been registered.`);
  } else {
    console.log(`❌ Error! Failed to register user.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});