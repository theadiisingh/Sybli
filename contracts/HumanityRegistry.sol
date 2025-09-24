// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HumanityNFT.sol";

contract HumanityRegistry {
    HumanityNFT public humanityNFT;

    mapping(address => bytes32) public humanBioHashes;
    mapping(bytes32 => bool) public registeredHashes;

    constructor(address _nftAddress) {
        humanityNFT = HumanityNFT(_nftAddress);
    }

    function registerHumanity(bytes32 bioHash) external {
        require(humanBioHashes[msg.sender] == 0, "Already registered");
        require(!registeredHashes[bioHash], "BioHash already used");

        humanBioHashes[msg.sender] = bioHash;
        registeredHashes[bioHash] = true;

        humanityNFT.mint(msg.sender, bioHash);
    }

    function isRegistered(address user) external view returns (bool) {
        return humanBioHashes[user] != 0;
    }

    function getBioHash(address user) external view returns (bytes32) {
        return humanBioHashes[user];
    }
}
