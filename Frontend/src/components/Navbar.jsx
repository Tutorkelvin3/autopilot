import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit';

export default function Navbar() {
  const { pathname } = useLocation();
  const active = (path) => pathname === path || (path !== '/' && pathname.startsWith(path)) ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">⚡ AutoPilot</Link>
      <div className="navbar-links">
        <Link to="/"          className={`nav-link ${active('/')}`}>Home</Link>
        <Link to="/setup"     className={`nav-link ${active('/setup')}`}>New Agent</Link>
        <Link to="/dashboard" className={`nav-link ${active('/dashboard')}`}>Dashboard</Link>
        <ConnectButton />
      </div>
    </nav>
  );
}