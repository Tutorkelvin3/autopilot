import { readMemory, writeMemory } from '../services/walrusService';

export async function loadMemory(blobId) {
  if (!blobId) return null;
  try { return await readMemory(blobId); }
  catch (e) { console.error('[Memory] load:', e.message); return null; }
}

export async function saveMemory(memory) {
  const updated = { ...memory, lastUpdated: new Date().toISOString() };
  return await writeMemory(updated);
}

export function getStats(memory) {
  if (!memory) return null;
  const p = memory.performance || {};
  return {
    cyclesRun:      memory.cyclesRun || 0,
    tradesExecuted: p.tradesExecuted || 0,
    successRate:    p.tradesExecuted > 0
      ? ((p.successfulTrades || 0) / p.tradesExecuted * 100).toFixed(0) : '0',
    pnlPercent:     p.pnlPercent     || 0,
    yieldEarned:    p.totalYieldEarned || 0,
    startingValue:  p.startingValueUSD || 0,
    currentValue:   p.currentValueUSD  || 0,
    lastThought:    memory.lastThought || '—',
    strategy:       memory.strategy?.type    || 'balanced',
    targetAPY:      memory.strategy?.targetAPY || 15,
    lastUpdated:    memory.lastUpdated || memory.createdAt,
  };
}

export function formatTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'just now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}