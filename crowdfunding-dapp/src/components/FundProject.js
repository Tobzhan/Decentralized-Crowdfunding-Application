import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ERC20ABI from '../abis/FND.json';
import CrowdProjectABI from '../abis/CrowdProject.json';

export default function FundProject({ projectAddress, refresh }) {
  const [amount, setAmount] = useState('');
  const [allowance, setAllowance] = useState(ethers.BigNumber.from(0));
  const [balance, setBalance] = useState(ethers.BigNumber.from(0));

  const FND_ADDRESS = process.env.REACT_APP_FND_ADDRESS;
  if (!FND_ADDRESS) console.error('Missing REACT_APP_FND_ADDRESS in .env');

  useEffect(() => {
    async function load() {
      if (!window.ethereum || !FND_ADDRESS) return;
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      const signer = web3.getSigner();
      const token = new ethers.Contract(FND_ADDRESS, ERC20ABI, web3);
      const user = await signer.getAddress();
      const bal = await token.balanceOf(user);
      const allo = await token.allowance(user, projectAddress);
      setBalance(bal);
      setAllowance(allo);
    }
    load();
  }, [projectAddress, amount]);

  const handleApprove = async () => {
    const web3 = new ethers.providers.Web3Provider(window.ethereum);
    const signer = web3.getSigner();
    const token = new ethers.Contract(FND_ADDRESS, ERC20ABI, signer);
    const bnAmount = ethers.utils.parseEther(amount);
    await token.approve(projectAddress, bnAmount);
    setAllowance(bnAmount);
    if (refresh) refresh();
    alert(`Approved ${amount} FND`);
  };

  const handleFund = async () => {
    const web3 = new ethers.providers.Web3Provider(window.ethereum);
    const signer = web3.getSigner();
    const project = new ethers.Contract(projectAddress, CrowdProjectABI, signer);
    const bnAmount = ethers.utils.parseEther(amount);
    if (allowance.lt(bnAmount)) return alert('Insufficient allowance');
    try {
      const tx = await project.pledge(bnAmount, { gasLimit: 500000 });
      await tx.wait();
      alert(`Pledged ${amount} FND`);
      if (refresh) refresh();
    } catch (err) {
      console.error(err);
      alert('Transaction failed: ' + (err.error?.message || err.message));
    }
  };

  return (
    <div className="actions">
      <input
        type="text"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount"
        className="input"
      />
      <button onClick={handleApprove} className="button button-green">
        Approve
      </button>
      <button onClick={handleFund} className="button button-primary">
        Fund
      </button>
      <div className="mt-1" style={{ fontSize: '0.9rem' }}>
        Balance: {FND_ADDRESS && ethers.utils.formatEther(balance)} FND
        {' '}| Allowance: {ethers.utils.formatEther(allowance)} FND
      </div>
    </div>
  );
}