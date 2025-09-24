const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SybilResistantDAO", function () {
  let humanityNFT, humanityRegistry, dao;
  let owner, verifiedUser, unverifiedUser;
  let bioHash;

  beforeEach(async function () {
    // Get test accounts
    [owner, verifiedUser, unverifiedUser] = await ethers.getSigners();

    // Deploy the full contract suite
    const HumanityNFT = await ethers.getContractFactory("HumanityNFT");
    humanityNFT = await HumanityNFT.deploy();

    const HumanityRegistry = await ethers.getContractFactory("HumanityRegistry");
    humanityRegistry = await HumanityRegistry.deploy(humanityNFT.target);

    const SybilResistantDAO = await ethers.getContractFactory("SybilResistantDAO");
    dao = await SybilResistantDAO.deploy(humanityNFT.target);

    // Grant minting permission to the Registry
    await humanityNFT.transferOwnership(humanityRegistry.target);

    // --- SETUP: Create a verified user ---
    // We need one user who has an NFT to be able to test voting.
    bioHash = ethers.keccak256(ethers.toUtf8Bytes("verified_user_bio_data"));
    await humanityRegistry.connect(verifiedUser).registerHumanity(bioHash);
    
    // --- SETUP: Create a proposal to vote on ---
    await dao.createProposal(); // This creates Proposal #1
  });

  // Test Case #1: Successful Vote
  it("Should allow a verified (NFT-holding) user to vote", async function () {
    // The verifiedUser casts a vote for proposal 1
    await dao.connect(verifiedUser).vote(1);

    // Assertions
    expect(await dao.getVotes(1)).to.equal(1);
    expect(await dao.hasUserVoted(1, verifiedUser.address)).to.be.true;
  });

  // Test Case #2: Blocking Unverified Users
  it("Should REVERT if an unverified user tries to vote", async function () {
    // The unverifiedUser (who has no NFT) tries to vote
    await expect(dao.connect(unverifiedUser).vote(1)).to.be.revertedWith(
      "Not human verified"
    );
  });

  // Test Case #3: Blocking Double Votes
  it("Should REVERT if a user tries to vote twice on the same proposal", async function () {
    // The verifiedUser votes successfully the first time
    await dao.connect(verifiedUser).vote(1);

    // The same user tries to vote again
    await expect(dao.connect(verifiedUser).vote(1)).to.be.revertedWith(
      "Already voted"
    );
  });
});