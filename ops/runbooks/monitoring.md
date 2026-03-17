# Monitoring Runbook

## Key Metrics
- Unresolved guess backlog per challenge
- Time-to-finalize from `GuessSubmitted` to `GuessResolved`
- Treasury inflow by day and anomalous withdrawals
- Number of active/expired/solved challenges

## Alert Conditions
- `unresolvedGuesses > 0` for longer than expected decrypt SLO
- Any unauthorized role grant/revoke transaction
- Treasury withdrawal above daily threshold
