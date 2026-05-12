import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import AgentSetup from './pages/AgentSetup.jsx';
import AgentDashboard from './pages/AgentDashboard.jsx';
import MemoryExplorer from './pages/MemoryExplorer.jsx';
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"                   element={<Landing />} />
          <Route path="/setup"              element={<AgentSetup />} />
          <Route path="/dashboard"          element={<AgentDashboard />} />
          <Route path="/dashboard/:agentId" element={<AgentDashboard />} />
          <Route path="/memory/:blobId"     element={<MemoryExplorer />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}