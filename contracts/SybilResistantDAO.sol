// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HumanityNFT.sol";

contract SybilResistantDAO {
    HumanityNFT public humanityNFT;
    uint256 public proposalCount;

    mapping(uint256 => uint256) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 proposalId);

    constructor(address _nftAddress) {
        humanityNFT = HumanityNFT(_nftAddress);
    }

    // --- NEW FUNCTION ---
    // A simple function to create a new proposal.
    // In a real DAO, this would have more complex rules.
    function createProposal() external {
        proposalCount++;
        emit ProposalCreated(proposalCount);
    }

    function vote(uint256 proposalId) external {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        require(humanityNFT.balanceOf(msg.sender) > 0, "Not human verified");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId] += 1;
    }

    function getVotes(uint256 proposalId) external view returns (uint256) {
        return votes[proposalId];
    }

    function hasUserVoted(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }
}