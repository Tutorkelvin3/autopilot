// Walrus decentralised storage service
// Multiple publisher endpoints with localStorage fallback

const PUBLISHERS = [
  'https://publisher.walrus-testnet.walrus.space',
  'https://walrus-testnet-publisher.staketab.org',
  'https://walrus-testnet-publisher.nodes.guru',
];

const AGGREGATORS = [
  'https://aggregator.walrus-testnet.walrus.space',
  'https://walrus-testnet-aggregator.staketab.org',
  'https://walrus-testnet-aggregator.nodes.guru',
];

const EPOCHS   = 5;
const LS_BLOBS = 'autopilot_walrus_blobs';

// ── Write memory to Walrus (tries multiple publishers) ─────────────────────

export async function writeMemory(memoryObject) {
  const body = JSON.stringify(memoryObject, null, 2);
  const blob = new Blob([body], { type: 'application/json' });

  // Try each publisher in order
  for (const publisher of PUBLISHERS) {
    try {
      const res = await fetch(`${publisher}/v1/store?epochs=${EPOCHS}`, {
        method:  'PUT',
        body:    blob,
        headers: { 'Content-Type': 'application/json' },
        signal:  AbortSignal.timeout(10000), // 10 second timeout per publisher
      });

      if (!res.ok) continue; // try next publisher

      const data   = await res.json();
      const blobId = data.newlyCreated?.blobObject?.blobId
                  || data.alreadyCertified?.blobId;

      if (blobId) {
        console.log('[Walrus] Stored via', publisher, '→', blobId);
        // Also cache locally as backup
        cacheLocally(blobId, memoryObject);
        return blobId;
      }
    } catch (e) {
      console.warn('[Walrus] Publisher failed:', publisher, e.message);
    }
  }

  // All publishers failed — use local storage fallback
  console.warn('[Walrus] All publishers failed, using localStorage fallback');
  return writeLocalFallback(memoryObject);
}

// ── Read memory from Walrus (tries multiple aggregators + local cache) ──────

export async function readMemory(blobId) {
  if (!blobId || blobId === '') return null;

  // If it's a local fallback ID, read from localStorage
  if (blobId.startsWith('local_')) {
    return readLocalFallback(blobId);
  }

  // Try each aggregator
  for (const aggregator of AGGREGATORS) {
    try {
      const res = await fetch(`${aggregator}/v1/${blobId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      console.warn('[Walrus] Aggregator failed:', aggregator, e.message);
    }
  }

  // Try local cache
  const cached = readLocalCache(blobId);
  if (cached) {
    console.warn('[Walrus] Using cached copy for blobId:', blobId);
    return cached;
  }

  return null;
}

// ── Local storage fallback ─────────────────────────────────────────────────

function writeLocalFallback(memoryObject) {
  const blobId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  cacheLocally(blobId, memoryObject);
  return blobId;
}

function readLocalFallback(blobId) {
  return readLocalCache(blobId);
}

function cacheLocally(blobId, data) {
  try {
    const blobs = getLocalBlobs();
    blobs[blobId] = data;
    // Keep only last 20 blobs to save space
    const keys = Object.keys(blobs);
    if (keys.length > 20) delete blobs[keys[0]];
    localStorage.setItem(LS_BLOBS, JSON.stringify(blobs));
  } catch (e) {
    console.warn('[Walrus] Local cache write failed:', e.message);
  }
}

function readLocalCache(blobId) {
  try {
    const blobs = getLocalBlobs();
    return blobs[blobId] || null;
  } catch { return null; }
}

function getLocalBlobs() {
  try { return JSON.parse(localStorage.getItem(LS_BLOBS) || '{}'); }
  catch { return {}; }
}

// ── Memory helpers (unchanged) ─────────────────────────────────────────────

export function createInitialMemory({ agentId, agentName, strategy, riskLevel }) {
  const targetAPY = { conservative: 8, balanced: 15, aggressive: 28 }[riskLevel] ?? 15;
  return {
    schemaVersion: 1,
    agentId,
    agentName,
    createdAt:   new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    cyclesRun:   0,
    strategy: {
      type: strategy, risk: riskLevel, targetAPY,
      preferredAssets: ['SUI', 'USDC'],
      rebalanceThreshold: riskLevel === 'conservative' ? 5 : 10,
    },
    portfolio:      { totalValueUSD: 0, assets: [], lastSnapshot: null },
    yieldPositions: [],
    trades:         [],
    performance: {
      startingValueUSD: 0, currentValueUSD: 0,
      totalYieldEarned: 0, tradesExecuted: 0,
      successfulTrades: 0, pnlPercent: 0,
    },
    lastThought: 'Agent initialized. Awaiting first cycle.',
  };
}

export function appendTrade(memory, trade) {
  const p = memory.performance || {};
  return {
    ...memory,
    lastUpdated: new Date().toISOString(),
    cyclesRun:   (memory.cyclesRun || 0) + 1,
    lastThought: trade.reasoning || memory.lastThought,
    trades: [
      { id: `t_${Date.now()}`, timestamp: new Date().toISOString(), ...trade },
      ...(memory.trades || []),
    ].slice(0, 50),
    performance: {
      ...p,
      tradesExecuted:  (p.tradesExecuted  || 0) + 1,
      successfulTrades:(p.successfulTrades || 0) + (trade.success ? 1 : 0),
    },
  };
}