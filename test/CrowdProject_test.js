const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdProject", function() {
  let fnd, rewardNFT, project;
  let owner, backer1, backer2;
  const goal = ethers.parseEther("100");
  const duration = 3600;
  const uris = ["uri1", "uri2"];
  const thresholds = [ethers.parseEther("10"), ethers.parseEther("50")];

  beforeEach(async () => {
    [owner, backer1, backer2] = await ethers.getSigners();
    const FND = await ethers.getContractFactory("FND");
    fnd = await FND.deploy(ethers.parseEther("1000"));
    if (fnd.waitForDeployment) await fnd.waitForDeployment(); else await fnd.deployed();

    const RewardNFT = await ethers.getContractFactory("RewardNFT");
    rewardNFT = await RewardNFT.deploy(owner.address);
    if (rewardNFT.waitForDeployment) await rewardNFT.waitForDeployment(); else await rewardNFT.deployed();

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + duration + 1;

    const Project = await ethers.getContractFactory("CrowdProject");
    const config = {
      name: "TestProject",
      description: "Desc",
      fundingGoal: goal,
      deadline: deadline
    };
    project = await Project.deploy(
      await fnd.getAddress(),
      await rewardNFT.getAddress(),
      config,
      uris,
      thresholds
    );
    if (project.waitForDeployment) await project.waitForDeployment(); else await project.deployed();

    await rewardNFT.connect(owner).addMinter(await project.getAddress());
    await fnd.transfer(backer1.address, ethers.parseEther("100"));
    await fnd.transfer(backer2.address, ethers.parseEther("100"));
  });

  it("rejects pledge without approval (allowance test)", async function() {
    await expect(
      project.connect(backer1).pledge(ethers.parseEther("10"))
    ).to.be.revertedWith("Insufficient allowance");
  });

  it("accepts pledges and mints NFTs correctly", async function() {
    await fnd.connect(backer1).approve(await project.getAddress(), ethers.parseEther("60"));
    await expect(project.connect(backer1).pledge(ethers.parseEther("60")))
      .to.emit(project, "Pledged")
      .withArgs(backer1.address, ethers.parseEther("60"));

    expect(await project.totalPledged()).to.equal(ethers.parseEther("60"));
    expect(await project.pledges(backer1.address)).to.equal(ethers.parseEther("60"));
    expect(await rewardNFT.ownerOf(0)).to.equal(backer1.address);
    expect(await rewardNFT.tokenURI(0)).to.equal("uri1");
    expect(await rewardNFT.ownerOf(1)).to.equal(backer1.address);
  });

  it("rejects pledges after deadline", async function() {
    await ethers.provider.send("evm_increaseTime", [duration + 2]);
    await ethers.provider.send("evm_mine");
    await fnd.connect(backer1).approve(await project.getAddress(), ethers.parseEther("10"));
    await expect(
      project.connect(backer1).pledge(ethers.parseEther("10"))
    ).to.be.revertedWith("Funding ended");
  });

  it("does not mint same reward twice", async function() {
    await fnd.connect(backer1).approve(await project.getAddress(), ethers.parseEther("20"));
    await project.connect(backer1).pledge(ethers.parseEther("15"));
    expect(await rewardNFT.tokenURI(0)).to.equal("uri1");
    await project.connect(backer1).pledge(ethers.parseEther("5"));
    // NFT id 1 should not exist, ownerOf should revert
    await expect(rewardNFT.ownerOf(1)).to.be.reverted;
  });

  it("allows creator to withdraw funds if goal met after deadline", async function() {
    await fnd.connect(backer1).approve(await project.getAddress(), goal);
    await project.connect(backer1).pledge(goal);
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    await expect(project.connect(owner).withdrawFunds())
      .to.emit(project, "FundsWithdrawn");
    expect(await project.isActive()).to.be.false;
  });

  it("cannot withdraw funds before deadline", async function() {
    await fnd.connect(backer1).approve(await project.getAddress(), goal);
    await project.connect(backer1).pledge(goal);
    await expect(
      project.connect(owner).withdrawFunds()
    ).to.be.revertedWith("Ongoing");
  });

  it("cannot withdraw if goal not met after deadline", async function() {
    await fnd.connect(backer2).approve(await project.getAddress(), ethers.parseEther("5"));
    await project.connect(backer2).pledge(ethers.parseEther("5"));
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");
    await expect(
      project.connect(owner).withdrawFunds()
    ).to.be.revertedWith("Goal not met");
  });

  it("allows backer to claim refund if goal not met after deadline", async function() {
    await fnd.connect(backer2).approve(await project.getAddress(), ethers.parseEther("10"));
    await project.connect(backer2).pledge(ethers.parseEther("10"));
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    await expect(project.connect(backer2).claimRefund())
      .to.emit(project, "RefundClaimed");
    expect(await project.isActive()).to.be.false;
  });
});