// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => bool) public allowedMinters;

    constructor(address initialOwner) 
        ERC721("CrowdReward", "CRWD")
        Ownable(initialOwner)
    {}

    function addMinter(address minter) external onlyOwner {
        allowedMinters[minter] = true;
    }

    function mint(address to, string memory tokenURI) external {
        require(allowedMinters[msg.sender], "Unauthorized");
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}