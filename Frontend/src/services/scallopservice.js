// Scallop yield rates — mock only (no external SDK needed)

const MOCK = {
  SUI:  { supplyAPY: 6.5,  borrowAPY: 12.3 },
  USDC: { supplyAPY: 8.2,  borrowAPY: 14.1 },
  USDT: { supplyAPY: 7.8,  borrowAPY: 13.5 },
};

export async function getYieldRates() {
  const rates = {};
  for (const [asset, base] of Object.entries(MOCK)) {
    rates[asset] = {
      supplyAPY:   +(base.supplyAPY + (Math.random() - 0.5) * 1.5).toFixed(2),
      borrowAPY:   +(base.borrowAPY + (Math.random() - 0.5) * 1.5).toFixed(2),
      utilization: +(65 + Math.random() * 20).toFixed(1),
    };
  }
  return { rates, source: 'mock_testnet', timestamp: Date.now() };
}

export function bestYieldProtocol(scallopRates, naviRates, asset) {
  const s = scallopRates?.rates?.[asset]?.supplyAPY || 0;
  const n = naviRates?.rates?.[asset]?.supplyAPY    || 0;
  return s >= n
    ? { protocol: 'Scallop', apy: s }
    : { protocol: 'Navi',    apy: n };
}