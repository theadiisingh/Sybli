// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHumanityRegistry {
    function registerHumanity(bytes32 bioHash) external;
    function isRegistered(address user) external view returns (bool);
    function getBioHash(address user) external view returns (bytes32);
}
