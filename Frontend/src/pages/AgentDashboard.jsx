import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { loadAgents, saveAgent, runCycle } from '../services/agentservice';
import { readMemory } from '../services/walrusservice';
import { getSuiBalance, buildPauseAgentTx, buildResumeAgentTx } from '../services/suiservice';
import { updateOnChain } from '../agent/Executor';
import { getStats, formatTime } from '../agent/Memory';
import { STRATEGY_META, codeToStrategy } from '../agent/Brain';
import StatusBadge from '../components/StatusBadge';
import TradeLog from '../components/Tradelog';
import PerformanceChart from '../components/Performancechart';

const AUTO_CYCLE_MS = 5 * 60 * 1000;

export default function AgentDashboard() {
  const { agentId }             = useParams();
  const account                 = useCurrentAccount();
  const { mutate: sign }        = useSignAndExecuteTransaction();

  const [agents,      setAgents]      = useState([]);
  const [active,      setActive]      = useState(null);
  const [memory,      setMemory]      = useState(null);
  const [balance,     setBalance]     = useState(null);
  const [running,     setRunning]     = useState(false);
  const [lastResult,  setLastResult]  = useState(null);
  const [countdown,   setCountdown]   = useState(AUTO_CYCLE_MS);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('trades');

  const sender = account?.address;

  /* ── Load agents ─────────────────────────────── */
  useEffect(() => {
    const all = loadAgents();
    setAgents(all);
    const found = agentId ? all.find(a => a.agentObjectId === agentId) : all[0];
    setActive(found || null);
  }, [agentId]);

  /* ── Load memory + balance ───────────────────── */
  useEffect(() => {
    if (!active) { setLoading(false); return; }
    setLoading(true);
    Promise.allSettled([
      readMemory(active.walrusBlobId),
      sender ? getSuiBalance(sender) : Promise.resolve(null),
    ]).then(([m, b]) => {
      if (m.status === 'fulfilled') setMemory(m.value);
      if (b.status === 'fulfilled') setBalance(b.value);
      setLoading(false);
    });
  }, [active?.agentObjectId, sender]);

  /* ── Countdown clock ─────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setCountdown(p => p <= 1000 ? AUTO_CYCLE_MS : p - 1000), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Auto-cycle ──────────────────────────────── */
  useEffect(() => {
    if (!active || !sender) return;
    const t = setInterval(() => doCycle(), AUTO_CYCLE_MS);
    return () => clearInterval(t);
  }, [active, sender]);

  /* ── Core cycle ──────────────────────────────── */
  const doCycle = useCallback(async () => {
    if (!active || !sender || running) return;
    setRunning(true); setLastResult(null); setCountdown(AUTO_CYCLE_MS);

    try {
      const result = await runCycle({ walletAddress: sender, walrusBlobId: active.walrusBlobId });

      if (result.success && result.newBlobId) {
        try {
          await updateOnChain({
            agentObjectId: active.agentObjectId,
            capObjectId:   active.agentCapId,
            newBlobId:     result.newBlobId,
            sender,
            signAndExecuteTransaction: sign,
          });
        } catch (chainErr) {
          console.warn('On-chain update skipped:', chainErr.message);
        }

        const updated = { ...active, walrusBlobId: result.newBlobId };
        saveAgent(updated);
        setActive(updated);
        setAgents(loadAgents());
        const newMem = await readMemory(result.newBlobId).catch(() => memory);
        setMemory(newMem);
      }
      setLastResult(result);
    } catch (err) {
      setLastResult({ success: false, error: err.message });
    } finally {
      setRunning(false);
    }
  }, [active, sender, running, memory, sign]);

  /* ── Pause / Resume ──────────────────────────── */
  function handlePause() {
    if (!active || !sender) return;
    const tx = buildPauseAgentTx({ agentId: active.agentObjectId, capId: active.agentCapId, sender });
    sign({ transaction: tx }, {
      onSuccess: () => { const u = { ...active, status: 1 }; saveAgent(u); setActive(u); },
      onError:   (e) => console.error('pause:', e),
    });
  }

  function handleResume() {
    if (!active || !sender) return;
    const tx = buildResumeAgentTx({ agentId: active.agentObjectId, capId: active.agentCapId, sender });
    sign({ transaction: tx }, {
      onSuccess: () => { const u = { ...active, status: 0 }; saveAgent(u); setActive(u); },
      onError:   (e) => console.error('resume:', e),
    });
  }

  /* ── Helpers ─────────────────────────────────── */
  const fmt = (s) => {
    const m = Math.floor(s / 60000);
    const sec = Math.floor((s % 60000) / 1000);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stats     = getStats(memory);
  const stratKey  = codeToStrategy(active?.strategy ?? 1);
  const stratMeta = STRATEGY_META[stratKey] || STRATEGY_META.balanced;

  /* ── No wallet ───────────────────────────────── */
  if (!sender) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔐</div>
      <h2>Connect your wallet to view your agents</h2>
    </div>
  );

  /* ── No agents ───────────────────────────────── */
  if (!loading && agents.length === 0) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <div style={{ fontSize:64, marginBottom:24 }}>🤖</div>
      <h2 className="mb-16">No Agents Yet</h2>
      <p className="c-2 mb-24">Deploy your first autonomous DeFi agent to get started.</p>
      <Link to="/setup" className="btn btn-primary btn-lg">Deploy First Agent →</Link>
    </div>
  );

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize:26 }}>{stratMeta.emoji} {memory?.agentName || 'Agent'}</h1>
          <div className="flex-row mt-8">
            <StatusBadge statusCode={active?.status ?? 0} />
            <span className="badge badge-info">{stratMeta.label}</span>
            <span className="text-sm c-muted">Next cycle in {fmt(countdown)}</span>
          </div>
        </div>
        <div className="flex-row">
          <button className="btn btn-primary" onClick={doCycle} disabled={running || !active}>
            {running ? <><span className="spinner"/>Running…</> : '▶ Run Cycle'}
          </button>
          {active?.status === 0
            ? <button className="btn btn-secondary btn-sm" onClick={handlePause}>⏸ Pause</button>
            : <button className="btn btn-secondary btn-sm" onClick={handleResume}>▶ Resume</button>
          }
          {active?.walrusBlobId && (
            <Link to={`/memory/${active.walrusBlobId}`} className="btn btn-ghost btn-sm">🧠 Memory</Link>
          )}
        </div>
      </div>

      {/* ── Last result banner ──────────────────── */}
      {lastResult && (
        <div className={`alert ${lastResult.success ? 'alert-success' : 'alert-error'} mb-16`}>
          {lastResult.success
            ? `✅ Cycle complete — ${lastResult.action}: ${lastResult.reasoning}`
            : `❌ Cycle failed: ${lastResult.error}`}
        </div>
      )}

      {/* ── Stats row ───────────────────────────── */}
      <div className="grid-4 mb-24">
        {[
          { label: 'SUI Balance',  value: balance?.display || '—', sub: 'testnet wallet' },
          { label: 'Cycles Run',   value: stats?.cyclesRun || 0,   sub: 'auto every 5 min' },
          { label: 'Trades Done',  value: stats?.tradesExecuted || 0, sub: `${stats?.successRate || 0}% success` },
          { label: 'Target APY',   value: `${stratMeta.targetAPY}%`, sub: stratMeta.label },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize:24 }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Last thought ────────────────────────── */}
      {stats?.lastThought && (
        <div className="thought-box mb-24">
          &ldquo;{stats.lastThought}&rdquo;
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8 }}>
            Last updated: {formatTime(stats.lastUpdated)}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────── */}
      <div className="flex-row mb-16" style={{ borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[['trades', '📋 Trade Log'], ['chart', '📈 Performance'], ['agents', '🤖 All Agents']].map(([key, label]) => (
          <button key={key} className="btn btn-ghost btn-sm"
            style={{ borderRadius:0, borderBottom: tab === key ? '2px solid var(--purple)' : '2px solid transparent', color: tab === key ? 'var(--text-1)' : 'var(--text-3)' }}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'trades' && (
        <div className="card">
          <TradeLog trades={memory?.trades || []} />
        </div>
      )}

      {tab === 'chart' && (
        <div className="card">
          <h3 className="mb-16">Portfolio Performance</h3>
          <PerformanceChart trades={memory?.trades || []} startingValue={stats?.startingValue || 100} />
        </div>
      )}

      {tab === 'agents' && (
        <div className="flex-col">
          {agents.map(a => (
            <div key={a.agentObjectId}
              className="card"
              style={{ cursor:'pointer', borderColor: a.agentObjectId === active?.agentObjectId ? 'var(--purple)' : undefined }}
              onClick={() => setActive(a)}>
              <div className="flex-between">
                <div>
                  <span style={{ fontWeight:600 }}>{a.agentName}</span>
                  <span className="text-sm c-muted" style={{ marginLeft:12 }}>{a.agentObjectId.slice(0,12)}…</span>
                </div>
                <div className="flex-row">
                  <span className="badge badge-info text-xs">{a.strategy}</span>
                  <Link to={`/dashboard/${a.agentObjectId}`} className="btn btn-secondary btn-sm"
                    onClick={e => e.stopPropagation()}>Open</Link>
                </div>
              </div>
            </div>
          ))}
          <Link to="/setup" className="btn btn-primary" style={{ alignSelf:'flex-start' }}>+ Deploy New Agent</Link>
        </div>
      )}
    </div>
  );
}