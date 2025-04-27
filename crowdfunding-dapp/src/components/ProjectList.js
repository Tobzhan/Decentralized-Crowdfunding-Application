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
  const [withdrawingAddr, setWithdrawingAddr] = useState(null);
  const [refundingAddr, setRefundingAddr] = useState(null);

  // Log wallet connection
  useEffect(() => {
    if (window.ethereum) {
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      web3.getSigner().getAddress()
        .then(addr => {
          console.log('👤 Connected user:', addr);
          setUser(addr);
        })
        .catch(() => {
          console.log('⚠️ Unable to get user address');
          setUser(null);
        });
    }
  }, []);

  // Load all projects from the factory
  const loadProjects = async () => {
    if (!window.ethereum || !FACTORY_ADDRESS || !user) return;
    const web3 = new ethers.providers.Web3Provider(window.ethereum);
    const factory = new ethers.Contract(FACTORY_ADDRESS, CrowdFactoryABI, web3);
    const count = await factory.getProjectsCount();
    const loaded = [];

    for (let i = 0; i < Number(count); i++) {
      const addr = await factory.projects(i);
      const project = new ethers.Contract(addr, CrowdProjectABI, web3);
      const [name, description, goal, totalPledged, deadline, creator, pledgedByUser, fundsWithdrawn] = await Promise.all([
        project.getProjectName(),
        project.getProjectDescription(),
        project.getFundingGoal(),
        project.totalPledged(),
        project.getDeadline(),
        project.creator(),
        project.pledges(user),
        project.fundsWithdrawn()
      ]);

      loaded.push({
        address: addr,
        name,
        description,
        goal,
        totalPledged,
        deadline: deadline.toNumber(),
        creator,
        pledgedByUser,
        fundsWithdrawn
      });
    }

    setProjects(loaded);
  };

  // Refresh whenever user changes
  useEffect(() => {
    loadProjects();
  }, [user]);

  // Debug: log state changes
  useEffect(() => {
    console.log('📦 Current projects array:', projects);
  }, [projects]);

  // Withdraw funds (project creator)
  const handleWithdraw = async (address) => {
    console.log('💸 Attempting withdraw for', address);
    setWithdrawingAddr(address);
    try {
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      const signer = web3.getSigner();
      const project = new ethers.Contract(address, CrowdProjectABI, signer);
      await project.withdrawFunds();
      console.log('✅ Withdraw transaction sent for', address);
      loadProjects();
    } catch (err) {
      console.error('❌ Withdraw error:', err);
    } finally {
      setWithdrawingAddr(null);
    }
  };

  // Claim refund (backer)
  const handleRefund = async (address) => {
    console.log('↩️ Attempting refund for', address);
    setRefundingAddr(address);
    try {
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      const signer = web3.getSigner();
      const project = new ethers.Contract(address, CrowdProjectABI, signer);
      await project.claimRefund();
      console.log('✅ Refund transaction sent for', address);
      loadProjects();
    } catch (err) {
      console.error('❌ Refund error:', err);
    } finally {
      setRefundingAddr(null);
    }
  };

  if (!FACTORY_ADDRESS) return <p>Error: Factory address not configured.</p>;

  return (
    <div>
      {projects.length === 0 && <p>No projects found</p>}
      <div>
        {projects.map(p => {
          const now = Math.floor(Date.now() / 1000);
          const timeLeft = Math.max(p.deadline - now, 0);
          const goalMet = p.totalPledged.gte(p.goal);
          const expired = timeLeft === 0;
          const isCreator = user?.toLowerCase() === p.creator.toLowerCase();

          let statusColor = '#2563eb'; let statusText = 'Active';
          if (p.fundsWithdrawn) { statusColor = '#16a34a'; statusText = 'Funds Successfully Withdrawn, project closed'; }
          else if (expired && goalMet) { statusColor = '#16a34a'; statusText = 'Goal Met, Waiting author to get tokens'; }
          else if (expired && !goalMet) { statusColor = '#dc2626'; statusText = 'Failed, you can take your invested tokens back'; }
          else if (goalMet) { statusColor = '#d97706'; statusText = 'Funding Locked'; }

          const durationStr = expired ? 'Expired' : (() => {
            const d = Math.floor(timeLeft/86400); let s = timeLeft%86400;
            const h = Math.floor(s/3600); s%=3600; const m = Math.floor(s/60); s%=60;
            return [d>0?`${d}d`:null, h>0?`${h}h`:null, m>0?`${m}m`:null, `${s}s`].filter(Boolean).join(' ');
          })();

          return (
            <div key={p.address} className="project-card">
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <p><strong>Goal:</strong> {ethers.utils.formatEther(p.goal)} FND</p>
              <p><strong>Pledged:</strong> {ethers.utils.formatEther(p.totalPledged)} FND</p>
              <p><strong>Your Pledge:</strong> {ethers.utils.formatEther(p.pledgedByUser)} FND</p>
              <p><strong>Time Left:</strong> {durationStr}</p>
              <p><strong>Address:</strong> {p.address}</p>
              <p><span style={{color: statusColor}}>{statusText}</span></p>

              <div className="actions">
                {!expired && !goalMet && <FundProject projectAddress={p.address} refresh={loadProjects} />}
                {expired && goalMet && isCreator && <button onClick={() => handleWithdraw(p.address)} className="button button-green">Withdraw</button>}
                {expired && !goalMet && p.pledgedByUser.gt(0) && !p.fundsWithdrawn &&  <button onClick={() => handleRefund(p.address)} className="button button-red">Refund</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
