import { buildUpdateMemoryTx, buildLogExecutionTx } from '../services/suiservice';
import { ACTION_CODES } from './brain';

export function updateOnChain({ agentObjectId, capObjectId, newBlobId, sender, signAndExecuteTransaction }) {
  return new Promise((resolve, reject) => {
    const tx = buildUpdateMemoryTx({ agentId: agentObjectId, capId: capObjectId, blobId: newBlobId, sender });
    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: (data) => { console.log('[Executor] on-chain update:', data.digest); resolve(data); },
        onError:   (err)  => { console.error('[Executor] update failed:', err); reject(err); },
      }
    );
  });
}

export function logOnChain({ agentId, action, protocol, amountMist, walrusRef, success, sender, signAndExecuteTransaction }) {
  return new Promise((resolve, reject) => {
    const tx = buildLogExecutionTx({
      agentId, actionCode: ACTION_CODES[action] ?? ACTION_CODES.HOLD,
      protocol: protocol || 'AutoPilot', amountMist: amountMist || 0,
      walrusRef: walrusRef || '', success, sender,
    });
    signAndExecuteTransaction({ transaction: tx }, { onSuccess: resolve, onError: reject });
  });
}