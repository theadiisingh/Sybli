// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HumanityNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => bytes32) private _bioHashes;

    constructor() ERC721("HumanityNFT", "HUMAN") Ownable(msg.sender) {}

    function mint(address user, bytes32 bioHash) external onlyOwner {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        _safeMint(user, newTokenId);
        _bioHashes[newTokenId] = bioHash;
    }

    // --- THIS IS THE CORRECTED SOULBOUND LOGIC ---
    // We override the _update function instead of _beforeTokenTransfer.
    // This function is called for all token movements (mint, transfer, burn).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // This line ensures that tokens can only be created ("minted", from address 0)
        // or destroyed ("burned", to address 0). Regular transfers are blocked.
        require(
            from == address(0) || to == address(0),
            "Soulbound: Transfer disabled"
        );

        return super._update(to, tokenId, auth);
    }

    function bioHashOf(uint256 tokenId) external view returns (bytes32) {
        return _bioHashes[tokenId];
    }
}