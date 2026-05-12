import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { PACKAGE_ID, MIST_PER_SUI } from '../constants/Contracts';
import {
  suiClient,
  buildDeployAgentTx, buildCreateVaultTx,
  buildCreatePermissionsTx, buildDepositTx,
} from '../services/suiservice';
import { initAgentMemory, saveAgent } from '../services/agentservice';
import { strategyToCode, STRATEGY_META } from '../agent/brain';
import strategyconfig from '../components/Strategyconfig';

const STEPS = ['Strategy', 'Limits', 'Deploy', 'Fund'];

export default function AgentSetup() {
  const navigate = useNavigate();
  const account  = useCurrentAccount();
  const { mutate: sign } = useSignAndExecuteTransaction();

  const [step,        setStep]        = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [status,      setStatus]      = useState('');
  const [agentName,   setAgentName]   = useState('');
  const [strategy,    setStrategy]    = useState('balanced');
  const [maxTradeSui, setMaxTradeSui] = useState(5);
  const [maxVaultPct, setMaxVaultPct] = useState(20);
  const [depositSui,  setDepositSui]  = useState(1);
  const [agentObjectId, setAgentObjectId] = useState('');
  const [agentCapId,    setAgentCapId]    = useState('');
  const [vaultId,       setVaultId]       = useState('');

  const sender = account?.address;

  if (!sender) return (
    <div className="page" style={{ textAlign:'center', paddingTop:80 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔐</div>
      <h2>Connect your wallet to continue</h2>
    </div>
  );

  if (!PACKAGE_ID || PACKAGE_ID === '0x0') return (
    <div className="page" style={{ maxWidth:560 }}>
      <div className="card" style={{ borderColor:'var(--amber)' }}>
        <h3 style={{ color:'var(--amber)', marginBottom:12 }}>⚠️ Contracts Not Deployed</h3>
        <p className="c-2 mb-16">Deploy the Move contracts first, then add your Package ID to <code>.env</code>.</p>
        <div className="mono" style={{ background:'var(--bg-secondary)', padding:16, borderRadius:8, fontSize:13 }}>
          cd contracts<br/>
          sui client publish --network testnet --gas-budget 100000000
        </div>
      </div>
    </div>
  );

  function Indicator() {
    return (
      <div className="step-indicator">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className={`step-line ${i <= step ? 'done' : ''}`} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'inactive'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:11, color: i === step ? 'var(--text-1)' : 'var(--text-3)' }}>{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  function handleDeploy() {
    if (!agentName.trim()) { setError('Agent name is required.'); return; }
    setLoading(true); setError(''); setStatus('Sending deploy transaction…');

    const tx = buildDeployAgentTx({ name: agentName.trim(), strategy: strategyToCode(strategy), sender });

    sign({ transaction: tx }, {
      onSuccess: async (res) => {
        setStatus('Transaction confirmed! Reading objects…');
        try {
          const txDetails = await suiClient.getTransactionBlock({
            digest: res.digest,
            options: { showObjectChanges: true, showEffects: true },
          });

          const changes = txDetails.objectChanges || [];
          let capId = '', agentId = '';

          for (const c of changes) {
            if (c.type !== 'created') continue;
            const t = c.objectType || '';
            if (t.includes('AgentOwnerCap')) capId = c.objectId;
            if (t.includes('agent_registry::Agent') && !t.includes('Cap')) agentId = c.objectId;
          }

          if (!capId || !agentId) {
            for (const c of changes) {
              if (c.type !== 'created') continue;
              if (!c.objectType?.includes('autopilot::')) continue;
              if (c.owner?.AddressOwner && !capId)   capId   = c.objectId;
              if (c.owner?.Shared       && !agentId) agentId = c.objectId;
            }
          }

          if (!agentId) {
            setError(`Could not parse IDs from tx: ${res.digest}`);
            setLoading(false); return;
          }

          setAgentCapId(capId);
          setAgentObjectId(agentId);
          createVault(agentId, capId);
        } catch (e) {
          setError('Failed to read objects: ' + e.message);
          setLoading(false);
        }
      },
      onError: (e) => { setError(e.message || 'Transaction rejected'); setStatus(''); setLoading(false); },
    });
  }

  function createVault(agentId, capId) {
    sign({ transaction: buildCreateVaultTx({ agentId, sender }) }, {
      onSuccess: async (vRes) => {
        setStatus('Vault created! Setting permissions…');
        try {
          const txDetails = await suiClient.getTransactionBlock({
            digest: vRes.digest,
            options: { showObjectChanges: true },
          });
          const vaultChange = (txDetails.objectChanges || []).find(
            c => c.type === 'created' && (c.objectType?.includes('AgentVault') || c.owner?.Shared)
          );
          const vId = vaultChange?.objectId || '';
          setVaultId(vId);

          const maxMist = Math.floor(maxTradeSui * Number(MIST_PER_SUI));
          sign({ transaction: buildCreatePermissionsTx({ agentId, maxTradeMist: maxMist, maxVaultPercent: maxVaultPct, sender }) }, {
            onSuccess: () => { setStatus('All contracts deployed ✅'); setStep(3); setLoading(false); },
            onError:   (e) => { setError(e.message); setLoading(false); },
          });
        } catch (e) { setError(e.message); setLoading(false); }
      },
      onError: (e) => { setError(e.message); setLoading(false); },
    });
  }

  async function handleFund() {
    setLoading(true); setError(''); setStatus('Initialising Walrus memory…');
    try {
      const { blobId } = await initAgentMemory({
        agentId: agentObjectId, agentName: agentName.trim(),
        strategy, riskLevel: strategy, initialDepositSui: depositSui,
      });
      setStatus('Depositing SUI to vault…');
      const amtMist = Math.floor(depositSui * Number(MIST_PER_SUI));
      sign({ transaction: buildDepositTx({ vaultId, amountMist: amtMist, sender }) }, {
        onSuccess: () => {
          saveAgent({ agentObjectId, agentCapId, vaultObjectId: vaultId, walrusBlobId: blobId, agentName: agentName.trim(), strategy, owner: sender, createdAt: new Date().toISOString() });
          setLoading(false);
          navigate(`/dashboard/${agentObjectId}`);
        },
        onError: (e) => { setError(e.message); setLoading(false); },
      });
    } catch (e) { setError(e.message); setLoading(false); }
  }

  return (
    <div className="page" style={{ maxWidth:660 }}>
      <h1 style={{ fontSize:28, marginBottom:8 }}>Deploy New Agent</h1>
      <p className="c-2 mb-24">Configure your autonomous DeFi agent in 4 steps.</p>
      <Indicator />

      {error  && <div className="alert alert-error">⚠️ {error}</div>}
      {status && <div className="alert alert-info"><span className="spinner" style={{ marginRight:8 }}/>{status}</div>}

      {step === 0 && (
        <div className="card">
          <h3 className="mb-16">Name & Strategy</h3>
          <div className="form-group">
            <label className="form-label">Agent Name</label>
            <input className="form-input" type="text" placeholder="e.g. Alpha-7, YieldHunter" maxLength={32}
              value={agentName} onChange={e => setAgentName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Strategy</label>
            <StrategyConfig selected={strategy} onChange={setStrategy} />
          </div>
          <button className="btn btn-primary w-full"
            onClick={() => { if (!agentName.trim()) { setError('Name required'); return; } setError(''); setStep(1); }}>
            Continue →
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h3 className="mb-8">Risk Limits</h3>
          <p className="c-2 mb-24 text-sm">Enforced on-chain. The agent cannot exceed these.</p>
          <div className="form-group">
            <label className="form-label">Max Trade Size (SUI)</label>
            <input className="form-input" type="number" min="0.1" max="100" step="0.1"
              value={maxTradeSui} onChange={e => setMaxTradeSui(parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Vault % Per Trade: {maxVaultPct}%</label>
            <input type="range" min="5" max="50" step="5" value={maxVaultPct}
              onChange={e => setMaxVaultPct(parseInt(e.target.value))}
              style={{ width:'100%', accentColor:'var(--purple)' }} />
          </div>
          <div className="protocol-tags mb-16">
            <span className="protocol-tag">✅ DeepBook</span>
            <span className="protocol-tag">✅ Scallop</span>
            <span className="protocol-tag">✅ Navi</span>
          </div>
          <div className="flex-between">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Continue →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 className="mb-16">Deploy On-Chain</h3>
          <div style={{ background:'var(--bg-secondary)', borderRadius:'var(--r-md)', padding:20, marginBottom:24 }}>
            {[['Agent Name', agentName], ['Strategy', STRATEGY_META[strategy]?.label],
              ['Target APY', `${STRATEGY_META[strategy]?.targetAPY}%`],
              ['Max Trade', `${maxTradeSui} SUI`], ['Max Vault %', `${maxVaultPct}%`], ['Network', 'Sui Testnet']
            ].map(([k,v]) => (
              <div key={k} className="flex-between" style={{ padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:14 }}>
                <span className="c-muted">{k}</span><span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="c-2 text-sm mb-16">3 transactions: create agent → create vault → set permissions.</p>
          <div className="flex-between">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading}>
              {loading ? <><span className="spinner"/>Deploying…</> : '🚀 Deploy Agent'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 className="mb-8">Fund Your Agent</h3>
          <p className="c-2 mb-24 text-sm">Deposit SUI into the agent vault. You can withdraw anytime.</p>
          <div className="alert alert-success mb-16">✅ Agent, vault, and permissions deployed!</div>
          <div className="form-group">
            <label className="form-label">Initial Deposit (SUI)</label>
            <input className="form-input" type="number" min="0.1" step="0.1"
              value={depositSui} onChange={e => setDepositSui(parseFloat(e.target.value))} />
          </div>
          <button className="btn btn-primary w-full" onClick={handleFund} disabled={loading}>
            {loading ? <><span className="spinner"/>Processing…</> : '💰 Fund & Go to Dashboard →'}
          </button>
        </div>
      )}
    </div>
  );
}