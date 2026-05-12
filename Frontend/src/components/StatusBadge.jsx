import React from 'react';

const MAP = {
  0: { label: 'Active',  cls: 'badge-active',  dot: '🟢' },
  1: { label: 'Paused',  cls: 'badge-paused',  dot: '🟡' },
  2: { label: 'Stopped', cls: 'badge-stopped', dot: '🔴' },
};

export default function StatusBadge({ statusCode = 0 }) {
  const s = MAP[statusCode] || MAP[0];
  return <span className={`badge ${s.cls}`}>{s.dot} {s.label}</span>;
}