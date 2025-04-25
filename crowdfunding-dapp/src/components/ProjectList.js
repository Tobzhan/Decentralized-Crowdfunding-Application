import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CrowdFactoryABI from '../abis/CrowdFactory.json';
import CrowdProjectABI from '../abis/CrowdProject.json';
import FundProject from './FundProject';

const FACTORY_ADDRESS = process.env.REACT_APP_FACTORY_ADDRESS;
if (!FACTORY_ADDRESS) console.error('Missing REACT_APP_FACTORY_ADDRESS in .env');

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      web3.getSigner().getAddress()
        .then(addr => setUser(addr))
        .catch(() => setUser(null));
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (!window.ethereum || !FACTORY_ADDRESS || !user) return;
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      const factory = new ethers.Contract(FACTORY_ADDRESS, CrowdFactoryABI, web3);
      const count = await factory.getProjectsCount();
      const loaded = [];

      for (let i = 0; i < Number(count); i++) {
        const addr = await factory.projects(i);
        const project = new ethers.Contract(addr, CrowdProjectABI, web3);
        const [alive, name, goal, pledged] = await Promise.all([
          project.isActive(),
          project.getProjectName(),
          project.getFundingGoal(),
          project.pledges(user)
        ]);
        if (alive) {
          loaded.push({ address: addr, name, goal, pledged });
        }
      }
      setProjects(loaded);
    }
    load();
  }, [user]);

  if (!FACTORY_ADDRESS) return <p>Error: Factory address not configured.</p>;

  return (
    <div>
      <h2 className="text-xl mb-2">Active Projects</h2>
      {projects.length === 0 && <p>No active projects</p>}
      <ul>
        {projects.map(p => (
          <li key={p.address} className="mb-4 border p-4 rounded">
            <strong>{p.name}</strong><br />
            Goal: {ethers.utils.formatEther(p.goal)} FND<br />
            You Pledged: {ethers.utils.formatEther(p.pledged)} FND<br />
            Address: {p.address}<br />
            <FundProject projectAddress={p.address} refresh={() => {}} />
          </li>
        ))}
      </ul>
    </div>
  );
}