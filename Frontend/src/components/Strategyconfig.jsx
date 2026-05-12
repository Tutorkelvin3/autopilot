import React from 'react';
import { ACTION_META } from '../agent/brain';
import { formatTime } from '../agent/memory';

export default function TradeLog({ trades = [] }) {
  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
      <p>No cycles run yet. Hit <strong>Run Cycle</strong> to start.</p>
    </div>
  );

  return (
    <div>
      {trades.slice(0, 25).map((t, i) => {
        const meta = ACTION_META[t.action] || ACTION_META.HOLD;
        return (
          <div key={t.id || i} className="trade-item">
            <div className={`trade-icon ${meta.className}`}>{meta.icon}</div>
            <div className="trade-body">
              <div className="trade-action">{meta.label}</div>
              <div className="trade-reason">{t.reasoning}</div>
              {t.txHash && (
                <a
                  href={`https://suiexplorer.com/txblock/${t.txHash}?network=testnet`}
                  target="_blank" rel="noreferrer"
                  className="trade-time" style={{ color: 'var(--cyan)' }}
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
            <div className="trade-time">{formatTime(t.timestamp)}</div>
          </div>
        );
      })}
    </div>
  );
}