import React, { useState } from 'react';
import { ethers } from 'ethers';
import CrowdFactoryABI from '../abis/CrowdFactory.json';

const FACTORY_ADDRESS = process.env.REACT_APP_FACTORY_ADDRESS;

export default function CreateProject() {
  const [form, setForm] = useState({ name: '', description: '', goal: '', duration: '', uris: '', thresholds: '' });

  if (!FACTORY_ADDRESS) return <p>Error: Factory address not configured.</p>;

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  
  const submit = async () => {
    if (!window.ethereum) return alert('MetaMask not installed');
    const { name, description, goal, duration, uris, thresholds } = form;
    let uriArr = [], threshArr = [];
    if (uris.trim()) uriArr = uris.split(',').map(u => u.trim());
    if (thresholds.trim()) threshArr = thresholds.split(',').map(t => ethers.utils.parseEther(t.trim()));
    if (uriArr.length !== threshArr.length) return alert('URIs and thresholds count must match');

    const web3 = new ethers.providers.Web3Provider(window.ethereum);
    const signer = web3.getSigner();
    const factory = new ethers.Contract(FACTORY_ADDRESS, CrowdFactoryABI, signer);
    await factory.createProject(
      name,
      description,
      ethers.utils.parseEther(goal),
      Number(duration),
      uriArr,
      threshArr
    );
    alert('Project created');
  };

  return (
    <div>
      <h2 className="text-xl mb-2">Create New Project</h2>
      <div className="space-y-2">
        <input name="name" onChange={handleChange} placeholder="Name" className="w-full p-2 border rounded" />
        <textarea name="description" onChange={handleChange} placeholder="Description" className="w-full p-2 border rounded" />
        <input name="goal" onChange={handleChange} placeholder="Funding Goal (FND)" className="w-full p-2 border rounded" />
        <input name="duration" onChange={handleChange} placeholder="Duration (sec)" className="w-full p-2 border rounded" />
        <input name="uris" onChange={handleChange} placeholder="Reward URIs (comma)" className="w-full p-2 border rounded" />
        <input name="thresholds" onChange={handleChange} placeholder="Thresholds (comma)" className="w-full p-2 border rounded" />
        <button onClick={submit} className="px-4 py-2 bg-green-500 text-white rounded">Create</button>
      </div>
    </div>
  );
}
