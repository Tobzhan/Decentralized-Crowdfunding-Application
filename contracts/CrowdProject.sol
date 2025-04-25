// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RewardNFT.sol";

contract CrowdProject {
    struct RewardTier {
        uint96 threshold;
        string uri;
        bool claimed;
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
    bool public alive = true;
    bool public fundsWithdrawn;
    uint256 public totalPledged;
    mapping(address => uint256) public pledges;

    event Pledged(address indexed backer, uint256 amount);
    event FundsWithdrawn(uint256 amount);
    event RefundClaimed(address indexed backer, uint256 amount);

    /**
     * @param token Address of ERC20 token used for funding
     * @param nft Address of RewardNFT contract
     * @param config Struct with project name, description, goal and deadline
     * @param uris Array of URIs for each reward tier
     * @param thresholds Array of funding thresholds for each reward tier
     */
    constructor(
        address token,
        address nft,
        ProjectConfig memory config,
        string[] memory uris,
        uint256[] memory thresholds
    ) {
        require(bytes(config.name).length > 0, "Name required");
        require(config.deadline > block.timestamp, "Invalid deadline");
        require(uris.length == thresholds.length, "Array mismatch");

        _config = config;
        fundingToken = IERC20(token);
        rewardNFT = RewardNFT(nft);
        creator = msg.sender;

        for (uint i = 0; i < thresholds.length; i++) {
            rewardTiers.push(
                RewardTier({
                    threshold: uint96(thresholds[i]),
                    uri: uris[i],
                    claimed: false
                })
            );
        }
    }

    modifier onlyActive() {
        require(alive, "Project inactive");
        _;
    }

    /**
     * @notice Pledge tokens to the project and mint any new reward NFTs
     */
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
            RewardTier storage tier = rewardTiers[i];
            if (!tier.claimed && total >= tier.threshold) {
                rewardNFT.mint(backer, tier.uri);
                tier.claimed = true;
            }
        }
    }

    /**
     * @notice Withdraw funds if goal met and deadline passed
     */
    function withdrawFunds() external onlyActive {
        require(msg.sender == creator, "Unauthorized");
        require(block.timestamp >= _config.deadline, "Ongoing");
        require(totalPledged >= _config.fundingGoal, "Goal not met");
        require(!fundsWithdrawn, "Already withdrawn");

        fundsWithdrawn = true;
        alive = false;
        uint256 amount = totalPledged;
        totalPledged = 0;

        fundingToken.transfer(creator, amount);
        emit FundsWithdrawn(amount);
    }

    /**
     * @notice Claim refund if goal not met and deadline passed
     */
    function claimRefund() external onlyActive {
        require(block.timestamp >= _config.deadline, "Funding ongoing");
        require(totalPledged < _config.fundingGoal, "Goal met");

        uint256 amount = pledges[msg.sender];
        require(amount > 0, "Nothing to refund");

        pledges[msg.sender] = 0;
        alive = false;

        fundingToken.transfer(msg.sender, amount);
        emit RefundClaimed(msg.sender, amount);
    }

    // View helpers
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
        return alive;
    }
}
