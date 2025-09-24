const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HumanityRegistry", function () {
  // Declare variables that will be used in all our tests
  let humanityNFT, humanityRegistry;
  let owner, user1, user2;
  let bioHash1, bioHash2;

  // `beforeEach` runs before each test, giving us a clean state
  beforeEach(async function () {
    // Get test accounts from Hardhat
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the HumanityNFT contract
    const HumanityNFT = await ethers.getContractFactory("HumanityNFT");
    humanityNFT = await HumanityNFT.deploy();

    // Deploy the HumanityRegistry contract, linking it to the NFT contract
    const HumanityRegistry = await ethers.getContractFactory("HumanityRegistry");
    humanityRegistry = await HumanityRegistry.deploy(humanityNFT.target);

    // --- CRITICAL STEP ---
    // The HumanityRegistry needs permission to mint NFTs.
    // We transfer ownership of the NFT contract to the Registry contract.
    await humanityNFT.transferOwnership(humanityRegistry.target);

    // Create some sample bioHashes for testing
    bioHash1 = ethers.keccak256(ethers.toUtf8Bytes("unique_biometric_data_1"));
    bioHash2 = ethers.keccak256(ethers.toUtf8Bytes("unique_biometric_data_2"));
  });

  // Test Case #1: Successful Registration
  it("Should allow a new user to register with a unique bioHash and receive an NFT", async function () {
    // user1 calls the registerHumanity function
    await humanityRegistry.connect(user1).registerHumanity(bioHash1);

    // --- Assertions ---
    // Check if user1 is marked as registered
    expect(await humanityRegistry.isRegistered(user1.address)).to.be.true;
    // Check if the bioHash is correctly stored
    expect(await humanityRegistry.getBioHash(user1.address)).to.equal(bioHash1);
    // Check if user1 now owns exactly one Humanity NFT
    expect(await humanityNFT.balanceOf(user1.address)).to.equal(1);
  });

  // Test Case #2: Blocking Duplicate BioHashes
  it("Should REVERT if another user tries to register with an existing bioHash", async function () {
    // user1 registers successfully first
    await humanityRegistry.connect(user1).registerHumanity(bioHash1);

    // Now, user2 tries to register with the SAME bioHash
    // We expect this transaction to be reverted with a specific error message
    await expect(
      humanityRegistry.connect(user2).registerHumanity(bioHash1)
    ).to.be.revertedWith("BioHash already used");
  });

  // Test Case #3: Blocking a User from Registering Twice
  it("Should REVERT if a user tries to register a second time", async function () {
    // user1 registers successfully with their first bioHash
    await humanityRegistry.connect(user1).registerHumanity(bioHash1);

    // Now, user1 tries to register AGAIN with a different bioHash
    // We expect this to fail
    await expect(
      humanityRegistry.connect(user1).registerHumanity(bioHash2)
    ).to.be.revertedWith("Already registered");
  });
});