// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHumanityNFT {
    function mint(address user, bytes32 bioHash) external;
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwner(address owner) external view returns (uint256);
    function bioHashOf(uint256 tokenId) external view returns (bytes32);
}
