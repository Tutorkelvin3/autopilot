module autopilot::agent_executor {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};

    public struct ExecutionLog has key {
        id: UID,
        agent_id: ID,
        action_type: u8,
        protocol: String,
        amount_mist: u64,
        timestamp: u64,
        walrus_ref: String,
        success: bool,
    }

    public struct ExecutionLogged has copy, drop {
        log_id: ID,
        agent_id: ID,
        action_type: u8,
        timestamp: u64,
        success: bool,
    }

    public fun log_execution(
        agent_id: ID,
        action_type: u8,
        protocol: vector<u8>,
        amount_mist: u64,
        walrus_ref: vector<u8>,
        success: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let log_uid = object::new(ctx);
        let log_id  = object::uid_to_inner(&log_uid);
        let ts      = clock::timestamp_ms(clock);

        event::emit(ExecutionLogged { log_id, agent_id, action_type, timestamp: ts, success });

        transfer::transfer(
            ExecutionLog {
                id: log_uid,
                agent_id,
                action_type,
                protocol:   string::utf8(protocol),
                amount_mist,
                timestamp:  ts,
                walrus_ref: string::utf8(walrus_ref),
                success,
            },
            tx_context::sender(ctx),
        );
    }

    public fun get_action_type(log: &ExecutionLog): u8    { log.action_type }
    public fun get_protocol(log: &ExecutionLog): String   { log.protocol }
    public fun get_amount(log: &ExecutionLog): u64        { log.amount_mist }
    public fun get_timestamp(log: &ExecutionLog): u64     { log.timestamp }
    public fun was_successful(log: &ExecutionLog): bool   { log.success }
    public fun get_walrus_ref(log: &ExecutionLog): String { log.walrus_ref }
}