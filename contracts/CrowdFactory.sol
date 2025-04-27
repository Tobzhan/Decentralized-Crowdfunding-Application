// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./RewardNFT.sol";
import "./CrowdProject.sol";

contract CrowdFactory {
    address[] public projects;
    address public immutable nftContract;
    address public immutable tokenContract;

    event ProjectCreated(address indexed projectAddress);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        tokenContract = _token;
        // Deploy a single RewardNFT instance for all projects
        RewardNFT nft = new RewardNFT(address(this));
        nftContract = address(nft);
        // Grant this factory minting rights
        RewardNFT(nftContract).addMinter(address(this));
    }

    function getProjectsCount() external view returns (uint256) {
        return projects.length;
    }
    
    function getRewardNFTAddress() public view returns (address) {
        return nftContract;
    }

    function getFundingAddress() public view returns (address) {
        return tokenContract;
    }
    function createProject(
        string calldata name,
        string calldata description,
        uint256 fundingGoal,
        uint256 duration,
        string[] calldata rewardURIs,
        uint256[] calldata rewardThresholds
    ) external {
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length <= 200, "Description too long");
        require(fundingGoal > 0, "Goal must be positive");
        require(duration > 0, "Duration must be positive");
        require(rewardURIs.length == rewardThresholds.length, "Array length mismatch");

        // Prepare project config
        CrowdProject.ProjectConfig memory config = CrowdProject.ProjectConfig({
            name: name,
            description: description,
            fundingGoal: fundingGoal,
            deadline: block.timestamp + duration
        });

        // Deploy new CrowdProject
        CrowdProject project = new CrowdProject(
            tokenContract,
            nftContract,
            config,
            msg.sender, 
            rewardURIs,
            rewardThresholds
        );

        // Allow the new project to mint NFTs
        RewardNFT(nftContract).addMinter(address(project));

        projects.push(address(project));
        emit ProjectCreated(address(project));
    }
}
