export const ACTION_TYPES = {
  TRADE: 'TRADE', DEPOSIT_YIELD: 'DEPOSIT_YIELD',
  WITHDRAW_YIELD: 'WITHDRAW_YIELD', REBALANCE: 'REBALANCE', HOLD: 'HOLD',
};

export const ACTION_CODES = {
  TRADE: 0, DEPOSIT_YIELD: 1, WITHDRAW_YIELD: 2, REBALANCE: 3, HOLD: 4,
};

export const ACTION_META = {
  TRADE:          { label: 'Trade',          icon: '⚡', className: 'trade'   },
  DEPOSIT_YIELD:  { label: 'Deposit Yield',  icon: '📈', className: 'deposit' },
  WITHDRAW_YIELD: { label: 'Withdraw Yield', icon: '📤', className: 'trade'   },
  REBALANCE:      { label: 'Rebalance',      icon: '⚖️',  className: 'rebal'   },
  HOLD:           { label: 'Hold',           icon: '🛡️',  className: 'hold'    },
};

export const STRATEGY_META = {
  conservative: { label: 'Conservative', emoji: '🛡️', desc: 'Capital preservation + steady yield', targetAPY: 8  },
  balanced:     { label: 'Balanced',     emoji: '⚖️',  desc: 'Mix of yield and opportunistic trades', targetAPY: 15 },
  aggressive:   { label: 'Aggressive',   emoji: '🚀', desc: 'Maximum yield, active rebalancing',   targetAPY: 28 },
};

export function strategyToCode(name) {
  return { conservative: 0, balanced: 1, aggressive: 2 }[name] ?? 1;
}

export function codeToStrategy(code) {
  return ['conservative', 'balanced', 'aggressive'][code] ?? 'balanced';
}