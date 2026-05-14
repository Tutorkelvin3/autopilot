import React from 'react';
import { Link } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { loadAgents } from '../services/agentservice';

const FEATURES = [
  { icon: '🧠', title: 'Groq AI Brain',      desc: 'Every cycle, Claude reads your portfolio state, analyses market conditions, and decides the optimal DeFi action.' },
  { icon: '🐋', title: 'Walrus Memory',         desc: 'Full agent memory — trade history, strategy, performance — stored permanently on Walrus decentralised storage.' },
  { icon: '📊', title: 'DeepBook Execution',    desc: "Trades placed on Sui's native CLOB order book for best-price discovery and deep liquidity." },
  { icon: '🌿', title: 'Yield Optimisation',    desc: 'Idle assets automatically routed between Scallop and Navi protocols to maximise APY.' },
  { icon: '🔐', title: 'Self-Custody',          desc: 'You keep your keys. Agent operates within strict on-chain permission limits you control.' },
  { icon: '⚡', title: 'Sui-Native Speed',      desc: 'Sub-second finality means the agent acts on opportunities before they disappear.' },
];

export default function Landing() {
  const account = useCurrentAccount();
  const agents  = loadAgents();

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="mb-24">
          <span className="badge badge-purple">Built on Sui Testnet · Sui Overflow 2026</span>
        </div>
        <h1 className="hero-title">
          Your DeFi,<br /><span className="gradient-text">on Autopilot.</span>
        </h1>
        <p className="hero-subtitle">
          Deploy an autonomous AI agent that manages your Sui portfolio —
          trading on DeepBook, optimising yield on Scallop, and remembering everything on Walrus.
        </p>
        <div className="hero-cta">
          <Link to="/setup" className="btn btn-primary btn-lg">🚀 Launch New Agent</Link>
          {account && agents.length > 0 && (
            <Link to="/dashboard" className="btn btn-secondary btn-lg">📊 My Agents ({agents.length})</Link>
          )}
        </div>
        <div className="tech-pills">
          {['Sui Testnet','Walrus Storage','DeepBook V3','Scallop Yield','Groq AI','Move Smart Contracts'].map(t => (
            <span key={t} className="tech-pill">{t}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background:'var(--bg-secondary)', padding:'80px 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <h2 style={{ textAlign:'center', fontSize:32, marginBottom:8 }}>How It Works</h2>
          <p style={{ textAlign:'center', color:'var(--text-2)', marginBottom:48 }}>
            Three layers of intelligence running on Sui
          </p>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Loop */}
      <section style={{ padding:'80px 24px', maxWidth:680, margin:'0 auto', textAlign:'center' }}>
        <h2 style={{ fontSize:28, marginBottom:24 }}>The Agent Loop</h2>
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--r-xl)', padding:36,
          fontFamily:'monospace', textAlign:'left',
          lineHeight:2.2, fontSize:14, color:'var(--text-2)',
        }}>
          {[
            ['1.', 'Read strategy + history from ', 'Walrus'],
            ['2.', 'Fetch price data from ',         'DeepBook'],
            ['3.', 'Fetch APY rates from ',           'Scallop / Navi'],
            ['4.', 'Ask ',                            'Groq AI', ' → TRADE / DEPOSIT_YIELD / REBALANCE / HOLD'],
            ['5.', 'Execute on ',                     'Sui', ' via PTB'],
            ['6.', 'Write updated memory back to ',   'Walrus'],
            ['7.', 'Update blobId on-chain → repeat every 5 min', ''],
          ].map(([num, pre, bold, post]) => (
            <div key={num}>
              <span style={{ color:'var(--cyan)' }}>{num}</span>{' '}
              {pre}<strong style={{ color:'var(--text-1)' }}>{bold}</strong>{post || ''}
            </div>
          ))}
        </div>
        <Link to="/setup" className="btn btn-primary btn-lg mt-24">
          Deploy Your Agent →
        </Link>
      </section>
    </div>
  );
}