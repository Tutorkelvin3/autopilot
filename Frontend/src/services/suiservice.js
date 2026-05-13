import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { RPC_URL, CLOCK_ID, FN, MIST_PER_SUI } from '../constants/Contracts';

export const suiClient = new SuiClient({ url: RPC_URL });

export async function getSuiBalance(address) {
  if (!address) return { mist: 0n, sui: 0, display: '0.0000' };
  try {
    const res  = await suiClient.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
    const mist = BigInt(res.totalBalance);
    const sui  = Number(mist) / Number(MIST_PER_SUI);
    return { mist, sui, display: sui.toFixed(4) };
  } catch (e) {
    console.error('[Sui] getSuiBalance:', e.message);
    return { mist: 0n, sui: 0, display: '0.0000' };
  }
}

export async function getObject(objectId) {
  if (!objectId) return null;
  try {
    return await suiClient.getObject({
      id: objectId,
      options: { showContent: true, showType: true, showOwner: true },
    });
  } catch (e) {
    console.error('[Sui] getObject:', e.message);
    return null;
  }
}

export async function getOwnedObjects(address, structType) {
  if (!address) return [];
  try {
    const { data } = await suiClient.getOwnedObjects({
      owner: address,
      filter: structType ? { StructType: structType } : undefined,
      options: { showContent: true, showType: true },
    });
    return data.filter(o => o.data !== null);
  } catch (e) {
    console.error('[Sui] getOwnedObjects:', e.message);
    return [];
  }
}

/* ── Transaction builders ─────────────────────────────── */

export function buildDeployAgentTx({ name, strategy, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  const [cap] = tx.moveCall({
    target: FN.CREATE_AGENT,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(name))),
      tx.pure.u8(strategy),
      tx.object(CLOCK_ID),
    ],
  });
  tx.transferObjects([cap], tx.pure.address(sender));
  return tx;
}

export function buildCreateVaultTx({ agentId, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({ target: FN.CREATE_VAULT, arguments: [tx.pure.id(agentId)] });
  return tx;
}

export function buildCreatePermissionsTx({ agentId, maxTradeMist, maxVaultPercent, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: FN.CREATE_PERMISSIONS,
    arguments: [
      tx.pure.id(agentId),
      tx.pure.u64(BigInt(maxTradeMist)),
      tx.pure.u8(maxVaultPercent),
    ],
  });
  return tx;
}

export function buildDepositTx({ vaultId, amountMist, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(amountMist))]);
  tx.moveCall({ target: FN.DEPOSIT, arguments: [tx.object(vaultId), coin] });
  return tx;
}

export function buildWithdrawTx({ vaultId, amountMist, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: FN.WITHDRAW,
    arguments: [tx.object(vaultId), tx.pure.u64(BigInt(amountMist))],
  });
  return tx;
}

export function buildUpdateMemoryTx({ agentId, capId, blobId, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: FN.UPDATE_MEMORY,
    arguments: [
      tx.object(agentId),
      tx.object(capId),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(blobId))),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildLogExecutionTx({ agentId, actionCode, protocol, amountMist, walrusRef, success, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: FN.LOG_EXECUTION,
    arguments: [
      tx.pure.id(agentId),
      tx.pure.u8(actionCode),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(protocol))),
      tx.pure.u64(BigInt(amountMist)),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(walrusRef))),
      tx.pure.bool(success),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildPauseAgentTx({ agentId, capId, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({ target: FN.PAUSE_AGENT, arguments: [tx.object(agentId), tx.object(capId)] });
  return tx;
}

export function buildResumeAgentTx({ agentId, capId, sender }) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({ target: FN.RESUME_AGENT, arguments: [tx.object(agentId), tx.object(capId)] });
  return tx;
}