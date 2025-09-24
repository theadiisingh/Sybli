// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BiometricOracle {
    mapping(address => bytes32) public latestHashes;

    function submitBiometricHash(bytes32 bioHash) external {
        latestHashes[msg.sender] = bioHash;
    }

    function getBiometricHash(address user) external view returns (bytes32) {
        return latestHashes[user];
    }
}
