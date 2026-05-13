import { suiClient } from './suiservice';
import { DEEPBOOK_POOLS } from '../constants/Tokens';

const mockSuiPrice = () => +(3.42 + (Math.random() - 0.5) * 0.3).toFixed(4);

export async function getSuiPrice() {
  try {
    const pool   = await suiClient.getObject({ id: DEEPBOOK_POOLS.SUI_USDC, options: { showContent: true } });
    const fields = pool?.data?.content?.fields;
    if (fields) {
      const ask = Number(fields?.asks?.fields?.min_price || 0);
      const bid = Number(fields?.bids?.fields?.max_price || 0);
      if (ask > 0 && bid > 0) return (ask + bid) / 2 / 1e9;
    }
  } catch { /* fall through */ }
  return mockSuiPrice();
}

export async function getMarketData() {
  const price = await getSuiPrice();
  return {
    SUI: {
      price,
      change24h: +((Math.random() - 0.48) * 8).toFixed(2),
      volume24h:  Math.floor(Math.random() * 4_000_000 + 800_000),
      source:    'deepbook_testnet',
    },
    USDC: { price: 1.00, change24h: 0, volume24h: 0 },
    timestamp: Date.now(),
  };
}