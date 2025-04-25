const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RewardNFT", function() {
  let rewardNFT, owner, minter, other;

  beforeEach(async () => {
    [owner, minter, other] = await ethers.getSigners();
    const RewardNFTFactory = await ethers.getContractFactory("RewardNFT");
    rewardNFT = await RewardNFTFactory.deploy(owner.address);
    // wait for deployment
    if (rewardNFT.waitForDeployment) await rewardNFT.waitForDeployment(); else await rewardNFT.deployed();
  });

  it("has correct name and symbol", async function() {
    expect(await rewardNFT.name()).to.equal("CrowdReward");
    expect(await rewardNFT.symbol()).to.equal("CRWD");
  });

  it("owner can add minter", async function() {
    await rewardNFT.connect(owner).addMinter(minter.address);
    expect(await rewardNFT.allowedMinters(minter.address)).to.be.true;
  });

  it("non-owner cannot add minter", async function() {
    await expect(
      rewardNFT.connect(other).addMinter(other.address)
    ).to.be.revertedWithCustomError(rewardNFT, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("minter can mint NFT and set URI", async function() {
    await rewardNFT.connect(owner).addMinter(minter.address);
    const tokenURI = "ipfs://QmTestUri";
    await expect(rewardNFT.connect(minter).mint(other.address, tokenURI))
      .to.emit(rewardNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, other.address, 0);

    expect(await rewardNFT.ownerOf(0)).to.equal(other.address);
    expect(await rewardNFT.tokenURI(0)).to.equal(tokenURI);
  });

  it("non-minter cannot mint", async function() {
    await expect(
      rewardNFT.connect(other).mint(other.address, "uri")
    ).to.be.revertedWith("Unauthorized");
  });
});
