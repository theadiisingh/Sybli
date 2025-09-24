// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISybilResistantDAO {
    function vote(uint256 proposalId) external;
    function hasUserVoted(uint256 proposalId, address user) external view returns (bool);
    function getVotes(uint256 proposalId) external view returns (uint256);
}
