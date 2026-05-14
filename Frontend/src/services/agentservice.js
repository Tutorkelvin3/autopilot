import { writeMemory, readMemory, appendTrade, createInitialMemory } from './walrusservice';
import { getMarketData } from './Deepbookservice';
import { getYieldRates }  from './scallopservice';
import { getSuiBalance }  from './suiservice';

// Empty string = use Vite proxy (/api → localhost:3001), avoids CORS entirely
const BACKEND = '';
export async function saveAgent(data) {
const res = await fetch(`${BACKEND}/api/agent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
return res.json();
}
/* ── Local storage ──────────────────────────────────────────────────────── */

export function loadAgents() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

export function removeAgent(agentObjectId) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadAgents().filter(a => a.agentObjectId !== agentObjectId)));
}

/* ── Init memory ────────────────────────────────────────────────────────── */

export async function initAgentMemory({ agentId, agentName, strategy, riskLevel, initialDepositSui }) {
  const market = await getMarketData().catch(() => ({ SUI: { price: 3.42 } }));
  const memory = createInitialMemory({ agentId, agentName, strategy, riskLevel });
  const usd    = (initialDepositSui || 0) * (market.SUI?.price || 3.42);
  memory.performance.startingValueUSD = usd;
  memory.performance.currentValueUSD  = usd;
  const blobId = await writeMemory(memory);
  return { blobId, memory };
}

/* ── Agent cycle ────────────────────────────────────────────────────────── */

export async function runCycle({ walletAddress, walrusBlobId }) {
  const result = { success: false, action: 'HOLD', reasoning: '', newBlobId: null, error: null };

  try {
    const memory = walrusBlobId ? await readMemory(walrusBlobId) : null;
    if (!memory) { result.error = 'Memory not found. Re-initialize agent.'; return result; }

    const [mktRes, yldRes, balRes] = await Promise.allSettled([
      getMarketData(), getYieldRates(), getSuiBalance(walletAddress),
    ]);

    const market  = mktRes.status === 'fulfilled' ? mktRes.value  : null;
    const yields  = yldRes.status === 'fulfilled' ? yldRes.value  : null;
    const balance = balRes.status === 'fulfilled' ? balRes.value  : { sui: 0 };

    const decision = await callBrain({ memory, market, yields, balance });
    result.action    = decision.action;
    result.reasoning = decision.reasoning;

    const updated = appendTrade(memory, {
      action:    decision.action,
      reasoning: decision.reasoning,
      params:    decision.params || {},
      success:   true,
      marketSnapshot: { suiPrice: market?.SUI?.price, suiYield: yields?.rates?.SUI?.supplyAPY },
    });
    updated.portfolio.lastSnapshot = {
      suiBalance: balance.sui,
      suiPrice:   market?.SUI?.price || 0,
      timestamp:  new Date().toISOString(),
    };

    result.newBlobId = await writeMemory(updated);
    result.success   = true;
    return result;
  } catch (err) {
    console.error('[AgentService] runCycle:', err);
    result.error = err.message;
    return result;
  }
}

/* ── Brain call (uses Vite proxy → no CORS) ─────────────────────────────── */

async function callBrain({ memory, market, yields, balance }) {
  try {
    const res = await fetch(`${BACKEND}/api/agent/think`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy:      memory.strategy,
        recentTrades:  (memory.trades || []).slice(0, 5),
        performance:   memory.performance,
        lastThought:   memory.lastThought,
        marketData:    { suiPrice: market?.SUI?.price, suiChange24h: market?.SUI?.change24h },
        yieldRates:    { scallopSUI: yields?.rates?.SUI?.supplyAPY, scallopUSDC: yields?.rates?.USDC?.supplyAPY },
        currentBalance:{ suiTokens: balance?.sui },
      }),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data = await res.json();
    return data.decision;
  } catch (err) {
    console.warn('[Brain] fallback HOLD:', err.message);
    return {
      action:    'HOLD',
      reasoning: 'Decision engine unreachable — holding all positions.',
      params:    {},
      confidence: 0,
    };
  }
}