module autopilot::agent_vault {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;

    const E_NOT_OWNER: u64            = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_VAULT_LOCKED: u64         = 3;

    public struct AgentVault has key {
        id: UID,
        agent_id: ID,
        owner: address,
        sui_balance: Balance<SUI>,
        total_deposited: u64,
        total_withdrawn: u64,
        locked: bool,
    }

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        agent_id: ID,
        owner: address,
    }

    public struct DepositMade has copy, drop {
        vault_id: ID,
        amount: u64,
        new_balance: u64,
    }

    public struct WithdrawalMade has copy, drop {
        vault_id: ID,
        amount: u64,
        new_balance: u64,
    }

    public fun create_vault(agent_id: ID, ctx: &mut TxContext) {
        let vault_uid = object::new(ctx);
        let vault_id  = object::uid_to_inner(&vault_uid);
        let owner     = tx_context::sender(ctx);

        event::emit(VaultCreated { vault_id, agent_id, owner });

        transfer::share_object(AgentVault {
            id: vault_uid,
            agent_id,
            owner,
            sui_balance: balance::zero<SUI>(),
            total_deposited: 0,
            total_withdrawn: 0,
            locked: false,
        });
    }

    public fun deposit(vault: &mut AgentVault, coin: Coin<SUI>, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == vault.owner, E_NOT_OWNER);
        assert!(!vault.locked, E_VAULT_LOCKED);

        let amount = coin::value(&coin);
        balance::join(&mut vault.sui_balance, coin::into_balance(coin));
        vault.total_deposited = vault.total_deposited + amount;

        event::emit(DepositMade {
            vault_id:    object::uid_to_inner(&vault.id),
            amount,
            new_balance: balance::value(&vault.sui_balance),
        });
    }

    public fun withdraw(vault: &mut AgentVault, amount: u64, ctx: &mut TxContext) {
        assert!(tx_context::sender(ctx) == vault.owner, E_NOT_OWNER);
        assert!(balance::value(&vault.sui_balance) >= amount, E_INSUFFICIENT_BALANCE);

        let withdrawn = balance::split(&mut vault.sui_balance, amount);
        let coin      = coin::from_balance(withdrawn, ctx);
        vault.total_withdrawn = vault.total_withdrawn + amount;

        event::emit(WithdrawalMade {
            vault_id:    object::uid_to_inner(&vault.id),
            amount,
            new_balance: balance::value(&vault.sui_balance),
        });

        transfer::public_transfer(coin, vault.owner);
    }

    public fun get_balance(vault: &AgentVault): u64          { balance::value(&vault.sui_balance) }
    public fun get_owner(vault: &AgentVault): address        { vault.owner }
    public fun get_agent_id(vault: &AgentVault): ID          { vault.agent_id }
    public fun is_locked(vault: &AgentVault): bool           { vault.locked }
    public fun get_total_deposited(vault: &AgentVault): u64  { vault.total_deposited }
}