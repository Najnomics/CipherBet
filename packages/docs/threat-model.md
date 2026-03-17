# CipherBet Threat Model

## Assets
- Creator escrowed ETH in `ChallengeGame`
- Player stake per guess pending settlement
- Protocol fee flow into `ProtocolTreasury`
- Encrypted secret/guess handles and decrypt readiness state

## Trust Boundaries
- Onchain contracts (factory/game/treasury/rules)
- CoFHE TaskManager/FHEOS/Threshold decrypt service (offchain dependency)
- Frontend wallet signing + local encryption
- Subgraph/indexer (read model only)

## Primary Adversaries
- Rational attacker maximizing payout via settlement ordering or replay attempts
- Griefer attempting to freeze creator funds via unresolved guesses
- External contract attempting reentrancy during ETH transfer callbacks
- Privileged-role abuse (factory role, treasury role, admin role)

## Core Threats and Controls
- Reentrancy during settlement
  - Control: `ReentrancyGuard`, CEI ordering, single-finalization state lock
- Double-finalization / replay
  - Control: `GuessState` transitions to `FINALIZED` before transfer
- Unauthorized challenge creation
  - Control: `FACTORY_ROLE` gate on `createChallenge`
- Privilege escalation for treasury drains
  - Control: `GAME_ROLE` required for fee intake, separate `TREASURY_ADMIN_ROLE` for withdrawals
- Parameter abuse (unsafe BPS or sequence length)
  - Control: `RulesModule.validateGameParams`
- Confidentiality leakage
  - Control: encrypted handles only, boolean-only decryption flow, no secret unseal path

## Residual Risks
- If FHE decrypt infra stalls, unresolved guesses can block creator expiry reclaim.
- Winner selection is "first finalized true guess", not globally earliest submit.
- Offchain encryption correctness depends on frontend/client integration quality.
