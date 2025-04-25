import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ConnectWallet from './components/ConnectWallet';
import ProjectList from './components/ProjectList';
import CreateProject from './components/CreateProject';

function App() {
  return (
    <Router>
      <div className="p-4">
        <nav className="mb-4">
          <Link to="/" className="mr-4">Home</Link>
          <Link to="/browse" className="mr-4">Browse Projects</Link>
          <Link to="/create">Create Project</Link>
        </nav>
        <ConnectWallet />
        <Routes>
          <Route path="/" element={<h1>Welcome to Crowdfund DApp</h1>} />
          <Route path="/browse" element={<ProjectList />} />
          <Route path="/create" element={<CreateProject />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;