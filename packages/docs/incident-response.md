# Incident Response

## Detection
- Monitor `GuessSubmitted` without corresponding `GuessResolved` for excessive lag.
- Monitor repeated `ChallengeGame__EthTransferFailed` reverts in transaction traces.
- Monitor abnormal treasury withdrawals and role changes.

## Triage
1. Classify as funds risk, liveness risk, or data/indexing risk.
2. Freeze new challenge creation by revoking factory role if needed.
3. Snapshot impacted game IDs and unresolved guess IDs.

## Containment
- Revoke compromised roles (`GAME_ROLE`, `TREASURY_ADMIN_ROLE`, `FACTORY_ROLE`).
- Pause frontend write operations (maintenance mode).
- Communicate known-safe user actions and impacted operations.

## Recovery
- Re-establish secure multisig role holders.
- Backfill indexer state from canonical events.
- Publish postmortem with timeline, root cause, and control upgrades.
