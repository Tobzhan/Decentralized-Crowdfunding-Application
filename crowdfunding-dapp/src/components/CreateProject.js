import React, { useState } from 'react';
import { ethers } from 'ethers';
import CrowdFactoryABI from '../abis/CrowdFactory.json';

const FACTORY_ADDRESS = process.env.REACT_APP_FACTORY_ADDRESS;

export default function CreateProject() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    goal: '',
    duration: '',
    uris: '',
    thresholds: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!FACTORY_ADDRESS) {
    return (
      <p style={{ color: '#ef4444', fontWeight: '600' }}>
        Error: Factory address not configured.
      </p>
    );
  }

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    if (!window.ethereum) return alert('MetaMask not installed');
    setSubmitting(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const { name, description, goal, duration, uris, thresholds } = form;
      if (!name.trim()) return alert('Project name is required');

      const uriArr = uris.trim() ? uris.split(',').map(u => u.trim()) : [];
      const threshArr = thresholds.trim()
        ? thresholds.split(',').map(t => ethers.utils.parseEther(t.trim()))
        : [];
      if (uriArr.length !== threshArr.length) {
        return alert('Mismatch: URIs and thresholds count must match');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        CrowdFactoryABI,
        signer
      );

      const tx = await factory.createProject(
        name,
        description,
        ethers.utils.parseEther(goal || '0'),
        Number(duration || 0),
        uriArr,
        threshArr
      );
      await tx.wait();

      alert('🎉 Project created successfully!');
      setForm({ name: '', description: '', goal: '', duration: '', uris: '', thresholds: '' });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="project-card">
      <h3>Create New Project</h3>
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Project Name"
        className="input"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Project Description"
        className="textarea"
        rows={4}
      />
      <input
        name="goal"
        value={form.goal}
        onChange={handleChange}
        placeholder="Funding Goal (FND)"
        className="input"
      />
      <input
        name="duration"
        value={form.duration}
        onChange={handleChange}
        placeholder="Duration (seconds)"
        className="input"
      />
      <input
        name="uris"
        value={form.uris}
        onChange={handleChange}
        placeholder="Reward URIs (comma-separated)"
        className="input"
      />
      <input
        name="thresholds"
        value={form.thresholds}
        onChange={handleChange}
        placeholder="Thresholds (comma-separated, in FND)"
        className="input"
      />
      <div className="actions">
        <button
          onClick={submit}
          disabled={submitting}
          className="button button-primary"
        >
          {submitting ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
