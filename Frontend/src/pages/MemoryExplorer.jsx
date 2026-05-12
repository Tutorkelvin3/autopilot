import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { readMemory } from '../services/walrusService';
import { getStats, formatTime } from '../agent/memory';
import { STRATEGY_META, ACTION_META } from '../agent/brain';
import { WALRUS } from '../constants/tokens';

export default function MemoryExplorer() {
  const { blobId }       = useParams();
  const [memory,   setMemory]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showRaw,  setShowRaw]  = useState(false);

  useEffect(() => {
    if (!blobId) { setLoading(false); return; }
    readMemory(blobId)
      .then(setMemory)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [blobId]);

  if (loading) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <div className="spinner" style={{ width:32, height:32, margin:'0 auto 16px' }} />
      <p className="c-2">Loading memory from Walrus…</p>
    </div>
  );

  if (error) return (
    <div className="page" style={{ maxWidth:600 }}>
      <div className="alert alert-error">❌ {error}</div>
      <Link to="/dashboard" className="btn btn-secondary mt-16">← Back to Dashboard</Link>
    </div>
  );

  if (!memory) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🐋</div>
      <h2>No memory found</h2>
      <p className="c-2">Blob ID: <code>{blobId}</code></p>
    </div>
  );

  const stats    = getStats(memory);
  const stratKey = memory.strategy?.type || 'balanced';
  const sMeta    = STRATEGY_META[stratKey] || STRATEGY_META.balanced;

  return (
    <div className="page" style={{ maxWidth:860 }}>
      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize:24 }}>🧠 Agent Memory Explorer</h1>
          <div className="text-sm c-muted mt-8">
            Stored on Walrus Testnet ·{' '}
            <a href={`${WALRUS.AGGREGATOR}/v1/${blobId}`} target="_blank" rel="noreferrer" style={{ color:'var(--cyan)' }}>
              View Raw Blob ↗
            </a>
          </div>
        </div>
        <div className="flex-row">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRaw(r => !r)}>
            {showRaw ? 'Formatted View' : '{ } Raw JSON'}
          </button>
          <Link to="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
        </div>
      </div>

      {showRaw ? (
        <div className="card">
          <pre style={{ fontSize:12, color:'var(--text-2)', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
            {JSON.stringify(memory, null, 2)}
          </pre>
        </div>
      ) : (
        <>
          {/* Identity */}
          <div className="card mb-16">
            <h3 className="mb-16">Agent Identity</h3>
            <div className="grid-3">
              <div className="stat-card">
                <div className="stat-label">Name</div>
                <div style={{ fontWeight:700, fontSize:18 }}>{memory.agentName || '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Strategy</div>
                <div style={{ fontWeight:700, fontSize:18 }}>{sMeta.emoji} {sMeta.label}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Target APY</div>
                <div style={{ fontWeight:700, fontSize:18, color:'var(--green)' }}>{sMeta.targetAPY}%</div>
              </div>
            </div>
            <hr className="divider" />
            <div className="grid-3">
              {[
                ['Cycles Run',    stats?.cyclesRun],
                ['Trades Done',   stats?.tradesExecuted],
                ['Success Rate',  `${stats?.successRate}%`],
              ].map(([k, v]) => (
                <div key={k} className="stat-card">
                  <div className="stat-label">{k}</div>
                  <div style={{ fontWeight:700, fontSize:20 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Thought */}
          <div className="thought-box mb-16">
            &ldquo;{memory.lastThought || 'No cycles run yet.'}&rdquo;
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8 }}>
              Last updated: {formatTime(memory.lastUpdated)}
            </div>
          </div>

          {/* Strategy config */}
          <div className="card mb-16">
            <h3 className="mb-16">Strategy Configuration</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {[
                ['Type',                  memory.strategy?.type],
                ['Risk Level',            memory.strategy?.risk],
                ['Target APY',            `${memory.strategy?.targetAPY}%`],
                ['Rebalance Threshold',   `${memory.strategy?.rebalanceThreshold}%`],
                ['Preferred Assets',      (memory.strategy?.preferredAssets || []).join(', ')],
                ['Schema Version',        memory.schemaVersion || 1],
              ].map(([k,v]) => (
                <div key={k} className="flex-between" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:14 }}>
                  <span className="c-muted">{k}</span>
                  <span style={{ fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent trades */}
          <div className="card mb-16">
            <div className="flex-between mb-16">
              <h3>Trade History</h3>
              <span className="badge badge-info">{memory.trades?.length || 0} records</span>
            </div>
            {(!memory.trades || memory.trades.length === 0) ? (
              <p className="c-muted text-sm">No trades recorded yet.</p>
            ) : (
              memory.trades.slice(0, 10).map((t, i) => {
                const meta = ACTION_META[t.action] || ACTION_META.HOLD;
                return (
                  <div key={t.id || i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div className={`trade-icon ${meta.className}`}>{meta.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{meta.label}</div>
                      <div className="text-sm c-2">{t.reasoning}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{formatTime(t.timestamp)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Blob info */}
          <div className="card">
            <h3 className="mb-12">Walrus Blob Info</h3>
            <div style={{ fontSize:13 }}>
              <div className="flex-between" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span className="c-muted">Blob ID</span>
                <code style={{ fontSize:12, color:'var(--cyan)', wordBreak:'break-all', maxWidth:400 }}>{blobId}</code>
              </div>
              <div className="flex-between" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span className="c-muted">Epochs</span>
                <span>10 (testnet)</span>
              </div>
              <div className="flex-between" style={{ padding:'8px 0' }}>
                <span className="c-muted">Created</span>
                <span>{formatTime(memory.createdAt)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}