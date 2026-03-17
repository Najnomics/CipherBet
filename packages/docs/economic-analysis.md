# Economic Analysis

## v1 Formulae
- `slash = stake * slashBps / 10_000`
- `creatorShare = slash * creatorCutBps / 10_000`
- `protocolFee = slash - creatorShare`
- `playerRefund = stake - slash`
- `payout = creatorStakeEscrowed * payoutBps / 10_000`

## Invariants Enforced
- Player guess stake is always fully partitioned as `creatorShare + protocolFee + playerRefund`
- Creator escrow updates are monotonic with settlement logic
- Onchain game balance must remain `>= totalCreatorEscrowed + totalPendingPlayerStake`

## Incentive Notes
- High slash + low payout favors creators and deters brute-force guessing.
- Low slash + high payout increases player upside but can accelerate creator insolvency.
- `maxAttemptsPerAddress` and cooldown reduce cheap brute-force attacks.
