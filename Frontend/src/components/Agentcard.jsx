import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { STRATEGY_META, codeToStrategy } from '../agent/Brain';
import { formatTime } from '../agent/Memory';

export default function AgentCard({ agent, memory, onSelect, selected }) {
  const sk   = codeToStrategy(agent?.strategy ?? 1);
  const meta = STRATEGY_META[sk] || STRATEGY_META.balanced;

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--purple)' : undefined,
        transition: 'all .2s',
      }}
      onClick={onSelect}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      <div className="flex-between mb-16">
        <div>
          <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-display)' }}>
            {meta.emoji} {memory?.agentName || 'Agent'}
          </div>
          <div className="text-sm c-2" style={{ marginTop:4 }}>
            {meta.label} · {meta.targetAPY}% target APY
          </div>
        </div>
        <StatusBadge statusCode={agent?.status ?? 0} />
      </div>

      <div className="grid-3" style={{ marginBottom:16 }}>
        <div className="stat-card">
          <div className="stat-label">Cycles</div>
          <div className="stat-value" style={{ fontSize:20 }}>{memory?.cyclesRun || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trades</div>
          <div className="stat-value" style={{ fontSize:20 }}>{memory?.performance?.tradesExecuted || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Active</div>
          <div className="stat-value" style={{ fontSize:12, marginTop:6 }}>{formatTime(memory?.lastUpdated)}</div>
        </div>
      </div>

      {memory?.lastThought && (
        <div className="thought-box">&ldquo;{memory.lastThought}&rdquo;</div>
      )}

      <div className="flex-row mt-16">
        <Link to={`/dashboard/${agent?.agentObjectId}`} className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>
          Open Dashboard
        </Link>
        {memory?.blobId && (
          <Link to={`/memory/${memory.blobId}`} className="btn btn-secondary btn-sm" onClick={e => e.stopPropagation()}>
            View Memory
          </Link>
        )}
      </div>
    </div>
  );
}