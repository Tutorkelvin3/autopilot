export const TOKENS = {
  SUI: { type: '0x2::sui::SUI', symbol: 'SUI', name: 'Sui', decimals: 9, icon: '🔵' },
  USDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    symbol: 'USDC', name: 'USD Coin', decimals: 6, icon: '💵',
  },
};

export const DEEPBOOK_POOLS = {
  SUI_USDC: '0x4405b50d791fd3346754e8171aaab6bc2ed26c2c46efdd033c14b30ae507ac33',
};

export const SCALLOP_MARKET = '0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061ab8c';
export const NAVI_STORAGE   = '0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe';

export const WALRUS = {
  AGGREGATOR: import.meta.env.VITE_WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space',
  PUBLISHER:  import.meta.env.VITE_WALRUS_PUBLISHER  || 'https://publisher.walrus-testnet.walrus.space',
  EPOCHS: 10,
};