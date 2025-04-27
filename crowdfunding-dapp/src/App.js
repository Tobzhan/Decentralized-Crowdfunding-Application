import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet';
import ProjectList from './components/ProjectList';
import CreateProject from './components/CreateProject';
import './App.css';

export default function App() {
  const [account, setAccount] = useState(null);

  return (
    <Router>
      <div className="container">
        {/* Header */}
        <header className="header">
          <h1>Crowdfund DApp</h1>
          <ConnectWallet onConnect={setAccount} />
        </header>

        {/* If not connected, show prompt */}
        {!account ? (
          <main className="no-wallet">
            <p>Please connect your wallet to access the application.</p>
          </main>
        ) : (
          <>
            {/* Navigation */}
            <nav className="nav">
              <Link to="/">Home</Link>
              <Link to="/browse">Browse Projects</Link>
              <Link to="/create">Create Project</Link>
            </nav>

            {/* Main Content */}
            <main>
              <Routes>
                <Route path="/" element={<h2>Welcome to Crowdfund DApp</h2>} />
                <Route path="/browse" element={<ProjectList />} />
                <Route path="/create" element={<CreateProject />} />
              </Routes>
            </main>
          </>
        )}
      </div>
    </Router>
  );
}
