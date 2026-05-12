export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0';

export const MODULES = {
  REGISTRY:    `${PACKAGE_ID}::agent_registry`,
  VAULT:       `${PACKAGE_ID}::agent_vault`,
  PERMISSIONS: `${PACKAGE_ID}::agent_permissions`,
  EXECUTOR:    `${PACKAGE_ID}::agent_executor`,
};

export const FN = {
  CREATE_AGENT:       `${MODULES.REGISTRY}::create_agent`,
  UPDATE_MEMORY:      `${MODULES.REGISTRY}::update_walrus_memory`,
  PAUSE_AGENT:        `${MODULES.REGISTRY}::pause_agent`,
  RESUME_AGENT:       `${MODULES.REGISTRY}::resume_agent`,
  STOP_AGENT:         `${MODULES.REGISTRY}::stop_agent`,
  CREATE_VAULT:       `${MODULES.VAULT}::create_vault`,
  DEPOSIT:            `${MODULES.VAULT}::deposit`,
  WITHDRAW:           `${MODULES.VAULT}::withdraw`,
  CREATE_PERMISSIONS: `${MODULES.PERMISSIONS}::create_permissions`,
  UPDATE_LIMITS:      `${MODULES.PERMISSIONS}::update_limits`,
  TOGGLE_KILL_SWITCH: `${MODULES.PERMISSIONS}::toggle_kill_switch`,
  LOG_EXECUTION:      `${MODULES.EXECUTOR}::log_execution`,
};

export const CLOCK_ID     = '0x6';
export const MIST_PER_SUI = 1_000_000_000n;
export const RPC_URL      = 'https://fullnode.testnet.sui.io:443';
export const NETWORK      = 'testnet';

export function explorerLink(digest) {
  return `https://suiexplorer.com/txblock/${digest}?network=testnet`;
}