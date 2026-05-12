module autopilot::agent_registry {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};

    const E_NOT_OWNER: u64        = 1;
    const E_INVALID_STRATEGY: u64 = 2;
    const E_AGENT_NOT_ACTIVE: u64 = 3;

    const STRATEGY_CONSERVATIVE: u8 = 0;
    const STRATEGY_BALANCED: u8     = 1;
    const STRATEGY_AGGRESSIVE: u8   = 2;

    const STATUS_ACTIVE:  u8 = 0;
    const STATUS_PAUSED:  u8 = 1;
    const STATUS_STOPPED: u8 = 2;

    public struct Agent has key, store {
        id: UID,
        owner: address,
        name: String,
        strategy: u8,
        status: u8,
        walrus_memory_id: String,
        cycles_run: u64,
        created_at: u64,
        last_cycle_at: u64,
    }

    public struct AgentOwnerCap has key, store {
        id: UID,
        agent_id: ID,
    }

    public struct AgentCreated has copy, drop {
        agent_id: ID,
        owner: address,
        strategy: u8,
        created_at: u64,
    }

    public struct AgentCycleRun has copy, drop {
        agent_id: ID,
        cycles_run: u64,
        timestamp: u64,
    }

    public struct WalrusMemoryUpdated has copy, drop {
        agent_id: ID,
    }

    public struct AgentStatusChanged has copy, drop {
        agent_id: ID,
        new_status: u8,
    }

    public fun create_agent(
        name: vector<u8>,
        strategy: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AgentOwnerCap {
        assert!(
            strategy == STRATEGY_CONSERVATIVE ||
            strategy == STRATEGY_BALANCED     ||
            strategy == STRATEGY_AGGRESSIVE,
            E_INVALID_STRATEGY
        );

        let agent_uid = object::new(ctx);
        let agent_id  = object::uid_to_inner(&agent_uid);
        let owner     = tx_context::sender(ctx);
        let ts        = clock::timestamp_ms(clock);

        event::emit(AgentCreated { agent_id, owner, strategy, created_at: ts });

        let agent = Agent {
            id: agent_uid,
            owner,
            name: string::utf8(name),
            strategy,
            status: STATUS_ACTIVE,
            walrus_memory_id: string::utf8(b""),
            cycles_run: 0,
            created_at: ts,
            last_cycle_at: 0,
        };

        transfer::share_object(agent);

        AgentOwnerCap {
            id: object::new(ctx),
            agent_id,
        }
    }

    public fun update_walrus_memory(
        agent: &mut Agent,
        cap: &AgentOwnerCap,
        blob_id: vector<u8>,
        clock: &Clock,
        _ctx: &TxContext,
    ) {
        assert!(object::uid_to_inner(&agent.id) == cap.agent_id, E_NOT_OWNER);
        assert!(agent.status == STATUS_ACTIVE, E_AGENT_NOT_ACTIVE);

        agent.walrus_memory_id = string::utf8(blob_id);
        agent.cycles_run       = agent.cycles_run + 1;
        agent.last_cycle_at    = clock::timestamp_ms(clock);

        event::emit(AgentCycleRun {
            agent_id:   cap.agent_id,
            cycles_run: agent.cycles_run,
            timestamp:  agent.last_cycle_at,
        });
        event::emit(WalrusMemoryUpdated { agent_id: cap.agent_id });
    }

    public fun pause_agent(agent: &mut Agent, cap: &AgentOwnerCap, _ctx: &TxContext) {
        assert!(object::uid_to_inner(&agent.id) == cap.agent_id, E_NOT_OWNER);
        agent.status = STATUS_PAUSED;
        event::emit(AgentStatusChanged { agent_id: cap.agent_id, new_status: STATUS_PAUSED });
    }

    public fun resume_agent(agent: &mut Agent, cap: &AgentOwnerCap, _ctx: &TxContext) {
        assert!(object::uid_to_inner(&agent.id) == cap.agent_id, E_NOT_OWNER);
        agent.status = STATUS_ACTIVE;
        event::emit(AgentStatusChanged { agent_id: cap.agent_id, new_status: STATUS_ACTIVE });
    }

    public fun stop_agent(agent: &mut Agent, cap: &AgentOwnerCap, _ctx: &TxContext) {
        assert!(object::uid_to_inner(&agent.id) == cap.agent_id, E_NOT_OWNER);
        agent.status = STATUS_STOPPED;
        event::emit(AgentStatusChanged { agent_id: cap.agent_id, new_status: STATUS_STOPPED });
    }

    public fun get_owner(agent: &Agent): address    { agent.owner }
    public fun get_status(agent: &Agent): u8        { agent.status }
    public fun get_strategy(agent: &Agent): u8      { agent.strategy }
    public fun get_cycles_run(agent: &Agent): u64   { agent.cycles_run }
    public fun get_walrus_id(agent: &Agent): String { agent.walrus_memory_id }
    public fun get_cap_agent_id(cap: &AgentOwnerCap): ID { cap.agent_id }
    public fun is_active(agent: &Agent): bool       { agent.status == STATUS_ACTIVE }
}