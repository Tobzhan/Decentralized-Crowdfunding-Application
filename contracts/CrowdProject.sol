// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RewardNFT.sol";

contract CrowdProject {
    struct RewardTier {
        uint96 threshold;
        string uri;
    }

    struct ProjectConfig {
        string name;
        string description;
        uint256 fundingGoal;
        uint256 deadline;
    }

    ProjectConfig private _config;
    RewardTier[] public rewardTiers;
    address public immutable creator;
    IERC20 public immutable fundingToken;
    RewardNFT public immutable rewardNFT;
    bool public fundsWithdrawn;
    uint256 public totalPledged;
    mapping(address => uint256) public pledges;
    mapping(address => mapping(uint256 => bool)) public claimedTier;

    event Pledged(address indexed backer, uint256 amount);
    event FundsWithdrawn(uint256 amount);
    event RefundClaimed(address indexed backer, uint256 amount);

    constructor(
        address token,
        address nft,
        ProjectConfig memory config,
        address projectCreator,
        string[] memory uris,
        uint256[] memory thresholds
    ) {
        require(bytes(config.name).length > 0, "Name required");
        require(config.deadline > block.timestamp, "Invalid deadline");
        require(uris.length == thresholds.length, "Array mismatch");

        _config = config;
        fundingToken = IERC20(token);
        rewardNFT = RewardNFT(nft);
        creator = projectCreator;

        for (uint i = 0; i < thresholds.length; i++) {
            rewardTiers.push(
                RewardTier({
                    threshold: uint96(thresholds[i]),
                    uri: uris[i]
                })
            );
        }
    }

    modifier onlyActive() {
        require(!fundsWithdrawn && block.timestamp < _config.deadline, "Project inactive");
        _;
    }

    function pledge(uint256 amount) external onlyActive {
        require(block.timestamp < _config.deadline, "Funding ended");

        fundingToken.transferFrom(msg.sender, address(this), amount);
        pledges[msg.sender] += amount;
        totalPledged += amount;

        _processRewards(msg.sender);
        emit Pledged(msg.sender, amount);
    }

    function _processRewards(address backer) internal {
        uint256 total = pledges[backer];
        for (uint i = 0; i < rewardTiers.length; i++) {
            if (!claimedTier[backer][i] && total >= rewardTiers[i].threshold) {
                rewardNFT.mint(backer, rewardTiers[i].uri);
                claimedTier[backer][i] = true;
            }
        }
    }

    function withdrawFunds() external {
        require(msg.sender == creator, "Unauthorized");
        require(block.timestamp >= _config.deadline, "Ongoing");
        require(totalPledged >= _config.fundingGoal, "Goal not met");
        require(!fundsWithdrawn, "Already withdrawn");

        fundsWithdrawn = true;
        uint256 amount = totalPledged;
        totalPledged = 0;

        fundingToken.transfer(creator, amount);
        emit FundsWithdrawn(amount);
    }

    function claimRefund() external {
        require(block.timestamp >= _config.deadline, "Funding ongoing");
        require(totalPledged < _config.fundingGoal, "Goal met");

        uint256 amount = pledges[msg.sender];
        require(amount > 0, "Nothing to refund");

        pledges[msg.sender] = 0;

        fundingToken.transfer(msg.sender, amount);
        emit RefundClaimed(msg.sender, amount);
    }

    function getProjectName() external view returns (string memory) {
        return _config.name;
    }

    function getProjectDescription() external view returns (string memory) {
        return _config.description;
    }

    function getFundingGoal() external view returns (uint256) {
        return _config.fundingGoal;
    }

    function getDeadline() external view returns (uint256) {
        return _config.deadline;
    }

    function getRewardTiersPaginated(uint start, uint count)
        external
        view
        returns (RewardTier[] memory)
    {
        require(start < rewardTiers.length, "Invalid start");
        uint end = start + count;
        if (end > rewardTiers.length) end = rewardTiers.length;

        RewardTier[] memory slice = new RewardTier[](end - start);
        for (uint i = start; i < end; i++) {
            slice[i - start] = rewardTiers[i];
        }
        return slice;
    }

    function isActive() external view returns (bool) {
        return (!fundsWithdrawn && block.timestamp < _config.deadline);
    }
}
