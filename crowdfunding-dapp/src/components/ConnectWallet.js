import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function ConnectWallet({ onConnect }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      web3.getSigner().getAddress()
        .then(addr => {
          setAccount(addr);
          if (onConnect) onConnect(addr);
        })
        .catch(() => {});
    }
  }, [onConnect]);

  const connect = async () => {
    if (!window.ethereum) return alert('MetaMask not installed');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    if (onConnect) onConnect(accounts[0]);
  };

  return (
    <div className="mb-4">
      {account
        ? <span>Connected: {account}</span>
        : <button onClick={connect} className="px-4 py-2 bg-blue-500 text-white rounded">Connect MetaMask</button>
      }
    </div>
  );
}