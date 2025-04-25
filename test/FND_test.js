const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FND Token", function () {
  let FND, fnd, owner, user1;

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();
    FND = await ethers.getContractFactory("FND");
    fnd = await FND.deploy(ethers.parseEther("1000000"));
  });

  it("Should have correct metadata", async function () {
    expect(await fnd.name()).to.equal("Crowd Funding Token");
    expect(await fnd.symbol()).to.equal("FND");
    expect(await fnd.decimals()).to.equal(18);
  });

  it("Should mint initial supply to owner", async function () {
    const balance = await fnd.balanceOf(owner.address);
    expect(balance).to.equal(ethers.parseEther("1000000"));
  });

  it("Should transfer tokens between accounts", async function () {
    await fnd.transfer(user1.address, ethers.parseEther("100"));
    expect(await fnd.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
  });
});