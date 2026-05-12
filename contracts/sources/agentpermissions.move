module autopilot::agent_permissions {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    const E_NOT_OWNER: u64 = 1;

    public struct AgentPermissions has key {
        id: UID,
        agent_id: ID,
        owner: address,
        max_trade_amount_mist: u64,
        max_vault_percent: u8,
        kill_switch: bool,
        allow_deepbook: bool,
        allow_scallop: bool,
        allow_navi: bool,
    }

    public struct PermissionsCreated has copy, drop {
        agent_id: ID,
        max_trade_amount_mist: u64,
    }

    public struct KillSwitchToggled has copy, drop {
        agent_id: ID,
        kill_switch: bool,
    }

    public fun create_permissions(
        agent_id: ID,
        max_trade_amount_mist: u64,
        max_vault_percent: u8,
        ctx: &mut TxContext,
    ) {
        event::emit(PermissionsCreated { agent_id, max_trade_amount_mist });

        transfer::share_object(AgentPermissions {
            id: object::new(ctx),
            agent_id,
            owner: tx_context::sender(ctx),
            max_trade_amount_mist,
            max_vault_percent,
            kill_switch: false,
            allow_deepbook: true,
            allow_scallop: true,
            allow_navi: true,
        });
    }

    public fun update_limits(
        perms: &mut AgentPermissions,
        max_trade_amount_mist: u64,
        max_vault_percent: u8,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == perms.owner, E_NOT_OWNER);
        perms.max_trade_amount_mist = max_trade_amount_mist;
        perms.max_vault_percent     = max_vault_percent;
    }

    public fun toggle_kill_switch(perms: &mut AgentPermissions, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == perms.owner, E_NOT_OWNER);
        perms.kill_switch = !perms.kill_switch;
        event::emit(KillSwitchToggled { agent_id: perms.agent_id, kill_switch: perms.kill_switch });
    }

    public fun update_protocol_access(
        perms: &mut AgentPermissions,
        deepbook: bool,
        scallop: bool,
        navi: bool,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == perms.owner, E_NOT_OWNER);
        perms.allow_deepbook = deepbook;
        perms.allow_scallop  = scallop;
        perms.allow_navi     = navi;
    }

    public fun is_action_allowed(perms: &AgentPermissions, amount_mist: u64): bool {
        !perms.kill_switch && amount_mist <= perms.max_trade_amount_mist
    }
    public fun get_max_trade(perms: &AgentPermissions): u64  { perms.max_trade_amount_mist }
    public fun get_max_percent(perms: &AgentPermissions): u8  { perms.max_vault_percent }
    public fun is_kill_switch_active(perms: &AgentPermissions): bool { perms.kill_switch }
}