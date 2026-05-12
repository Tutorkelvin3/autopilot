import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AgentSetup from './pages/AgentSetup';
import AgentDashboard from './pages/AgentDashboard';
import MemoryExplorer from './pages/MemoryExplorer';

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