import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function buildData(trades, startVal) {
  if (!trades || trades.length < 2) return [];
  let val = startVal || 100;
  return [...trades].reverse().map(t => {
    const delta =
      t.action === 'DEPOSIT_YIELD'  ? val * 0.003 :
      t.action === 'TRADE'          ? (Math.random() - 0.4) * val * 0.012 :
      t.action === 'REBALANCE'      ? val * 0.002 : 0;
    val = Math.max(0, val + delta);
    return { time: new Date(t.timestamp).toLocaleDateString(), value: +val.toFixed(2) };
  });
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', fontSize:13 }}>
      <p style={{ color:'var(--cyan)' }}>${payload[0].value.toFixed(2)}</p>
      <p style={{ color:'var(--text-3)', fontSize:11 }}>{payload[0].payload.time}</p>
    </div>
  );
};

export default function PerformanceChart({ trades = [], startingValue = 100 }) {
  const data = buildData(trades, startingValue);

  if (data.length < 2) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>
      Chart appears after 2+ cycles
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top:8, right:8, left:-16, bottom:0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}  />
          </linearGradient>
          <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" tick={{ fill:'var(--text-3)', fontSize:11 }} />
        <YAxis tick={{ fill:'var(--text-3)', fontSize:11 }} />
        <Tooltip content={<Tip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="url(#strokeGrad)"
          strokeWidth={2}
          fill="url(#areaGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}