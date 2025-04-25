const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdFactory", function() {
  let fnd, factory, owner, alice;
  const goal = ethers.parseEther("100");
  const duration = 3600;
  const uris = ["uri1", "uri2"];
  const thresholds = [ethers.parseEther("10"), ethers.parseEther("50")];

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
    const FND = await ethers.getContractFactory("FND");
    fnd = await FND.deploy(ethers.parseEther("1000"));
    if (fnd.waitForDeployment) await fnd.waitForDeployment(); else await fnd.deployed();

    const Factory = await ethers.getContractFactory("CrowdFactory");
    factory = await Factory.deploy(await fnd.getAddress());
    if (factory.waitForDeployment) await factory.waitForDeployment(); else await factory.deployed();
  });

  it("initializes correct token and NFT addresses", async function() {
    expect(await factory.getFundingAddress()).to.equal(await fnd.getAddress());
    const nftAddr = await factory.getRewardNFTAddress();
    expect(nftAddr).to.match(/^0x[0-9a-fA-F]{40}$/);
  });

  it("starts with zero projects", async function() {
    expect(await factory.getProjectsCount()).to.equal(0);
  });

  it("creates new CrowdProject correctly", async function() {
    const tx = await factory.connect(alice).createProject(
      "Proj1", "Desc", goal, duration, uris, thresholds
    );
    await expect(tx).to.emit(factory, "ProjectCreated");

    expect(await factory.getProjectsCount()).to.equal(1);
    const projectAddress = await factory.projects(0);
    expect(projectAddress).to.match(/^0x[0-9a-fA-F]{40}$/);

    const Project = await ethers.getContractFactory("CrowdProject");
    const project = Project.attach(projectAddress);
    expect(await project.getProjectName()).to.equal("Proj1");
    expect(await project.getFundingGoal()).to.equal(goal);

    const block = await ethers.provider.getBlock(await tx.blockNumber);
    expect((await project.getDeadline()) - BigInt(block.timestamp)).to.equal(BigInt(duration));
  });
});
