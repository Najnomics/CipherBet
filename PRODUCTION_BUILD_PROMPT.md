# CipherBet Production Development Prompt

You are the lead protocol + full-stack engineer building **CipherBet Protocol**: a production-grade, privacy-preserving onchain guessing game using **Fhenix CoFHE**.

Build this as a real product, not a hackathon prototype.

## 1) Mission

Design, implement, test, harden, and document a complete production system for CipherBet where:
- Creator posts an encrypted secret sequence backed by ETH stake.
- Players submit encrypted guesses with ETH stake.
- Correctness is evaluated on ciphertext using FHE primitives.
- Settlement is trustless and automatic.
- Secret and guesses are never publicly revealed.

## 2) Hard Requirements

### Confidentiality
- Secret must remain encrypted and never be exposed in plaintext onchain.
- Guesses must remain encrypted in calldata and storage.
- Only outcome (`win/loss`) may be revealed for settlement.
- Use strict FHE ACL (`allowThis`, `allowSender`, `allow`) with least privilege.

### Economic Correctness
- Enforce exact payout/slash math with BPS parameters.
- Preserve solvency invariants at all times.
- No hidden admin drain paths.
- Creator and protocol shares must be deterministic and auditable.

### Security
- Reentrancy-safe settlement paths.
- CEI discipline for all external value transfers.
- Full access-control hardening.
- Deadline/expiry/cancel paths must be unambiguous and non-griefable.
- Mitigate brute force and spam with attempt limits + optional cooldown hooks.

### Production Quality
- Complete tests (unit, fuzz, invariant, integration).
- Security checklist + threat model + assumptions.
- Gas profiling and optimization without sacrificing safety.
- Deployment scripts + environment configs + runbooks.
- Subgraph/indexer + frontend + SDK integration.

## 3) Locked Product Decisions (for v1)

Use these defaults and implement accordingly:
1. **Single winner mode**: first correct guess finalizes game.
2. **Wrong guess remainder refunded**: only slash portion is lost.
3. **Initial target network**: Base Sepolia (then Arbitrum Sepolia).
4. **Fixed sequence length**: 4 digits in v1 (packed `euint32`).
5. **Settlement pattern**: Pattern A (decrypt boolean only).
6. **Pull-based finalize**: `finalizeGuess()` callable when decrypt result is ready.

## 4) Technical Stack

- Solidity (Foundry), OpenZeppelin.
- Fhenix FHE primitives (FHE.sol / CoFHE-compatible APIs).
- Frontend: Next.js + TypeScript + wagmi/viem + cofhejs.
- Indexer: The Graph subgraph (or equivalent event indexer).
- CI: lint + test + static analysis + build.

## 5) Monorepo Structure to Build

Create a monorepo with:
- `packages/contracts`
- `packages/frontend`
- `packages/sdk`
- `packages/subgraph`
- `packages/docs`
- `ops/` (deployment, monitoring, incident runbooks)

## 6) Smart Contract System

Implement these contracts:

1. `ChallengeFactory`
- Creates and registers challenge rooms.
- Stores game metadata and address mapping.
- Emits `GameCreated`.

2. `ChallengeGame` (core)
- Stores creator escrow, encrypted secret, parameters, guesses.
- Accepts encrypted guesses and stakes.
- Executes encrypted equality check.
- Requests decryption of encrypted boolean result.
- Finalizes and settles payouts/slashes.

3. `ProtocolTreasury`
- Receives protocol fee share from slash events.
- Tracks accounting and controlled withdrawals.

4. `RulesModule` (optional but recommended)
- Centralized validation bounds for game parameters.

5. `FHELib` helper
- Safe wrappers for compare/requestDecrypt/result retrieval and ACL patterns.

## 7) Core Data Model

Implement (or equivalent) strongly typed structs:

- `Game`
  - `creator`
  - `creatorStakeEscrowed`
  - `playerStakeFixed`
  - `slashBps`
  - `creatorCutBps`
  - `protocolCutBps`
  - `payoutBpsOfCreatorStake`
  - `seqLen`
  - `secretHandle` (`euint32`)
  - `deadline`
  - `active`
  - `solved`
  - `totalPlayerStaked`
  - `protocolFeesAccrued`
  - `attemptCount`

- `Guess`
  - `player`
  - `stake`
  - `guessHandle` (`euint32`)
  - `winFlagEnc` (`ebool`)
  - `decryptRequestId`
  - `state` (`SUBMITTED|EVALUATING|FINALIZED`)
  - `timestamp`

## 8) Core Flows

### Create Challenge
- Creator submits params + encrypted packed secret + ETH stake.
- Validate all params and bounds.
- Store secret as encrypted handle.
- `allowThis(secretHandle)` only.
- Emit `GameCreated`.

### Submit Guess
- Player submits encrypted packed guess + exact ETH stake.
- Validate game state, attempts, deadline.
- `winEnc = FHE.eq(secretHandle, guessHandle)`.
- Request decrypt of `winEnc`.
- Store guess with `EVALUATING` state.
- Emit `GuessSubmitted`.

### Finalize Guess (pull)
- Read decrypted boolean result.
- If win:
  - payout = `creatorStakeEscrowed * payoutBps / 10_000`
  - transfer payout to winner
  - mark game solved + inactive
  - emit `GameSolved`, `GuessResolved`
- If loss:
  - slash = `stake * slashBps / 10_000`
  - creatorShare = `slash * creatorCutBps / 10_000`
  - protocolFee = `slash - creatorShare`
  - playerRefund = `stake - slash`
  - distribute and emit events
- Mark guess `FINALIZED` exactly once.

### Expiry/Cancel
- Expiry: after deadline with no winner, creator can reclaim escrow under strict conditions.
- Cancel: allowed only before any guess submission; otherwise revert (or apply explicit penalty path).

## 9) FHE Representation and Compute

- Pack 4 digits into one uint32 before encryption.
- Use single encrypted equality operation per guess.
- No per-digit comparison in v1.
- Keep only boolean decryption path; never decrypt secret or full guess.

## 10) Access Control and Permissions

- Use role-based controls for protocol admin functions only.
- No admin capability to alter active game secret or force outcome.
- Guard treasury withdrawals and protocol config updates.
- Emit explicit events for all privileged actions.

## 11) Economic and Safety Invariants (must prove in tests)

Implement invariant tests proving:
1. Contract balance always covers owed obligations.
2. Active game accounting matches aggregate unresolved guess/game state.
3. Guess cannot be finalized twice.
4. Unauthorized users cannot migrate/finalize privileged callbacks.
5. Settlement transfers are bounded and cannot exceed escrowed balances.
6. No player can steal another player’s value via race/order tricks.

## 12) Test Plan

Minimum test suites:
- Unit tests for each contract function and revert path.
- Fuzz tests for params, stakes, BPS edge cases, deadlines.
- Invariant tests for solvency and accounting correctness.
- Integration tests for full lifecycle:
  - create -> guess -> evaluate -> finalize -> settle
  - expired/cancel paths
  - wrong-guess slash distribution
  - correct-guess payout and game closure
- Adversarial tests:
  - reentrancy attempts
  - replay/double-finalization
  - brute-force attempt-limit bypass attempts

## 13) Security Deliverables

Produce:
- `docs/threat-model.md`
- `docs/security-assumptions.md`
- `docs/economic-analysis.md`
- `docs/known-risks.md`
- `docs/incident-response.md`

Run and include outputs from:
- Slither
- Semgrep (security rules)
- Foundry coverage report

## 14) Frontend + SDK Requirements

Frontend must include:
- Challenge creation UI with parameter guardrails.
- Guess submission flow with local encoding/encryption.
- Finalize action and live state updates.
- Event-driven history + leaderboard view.

SDK must provide:
- `encodeDigitsToPackedUint32(digits)`
- `encryptSecret(...)`
- `encryptGuess(...)`
- permit lifecycle helpers
- typed contract interaction wrappers

## 15) Indexing + Analytics

Subgraph/indexer must track:
- challenge lifecycle
- guess lifecycle
- payouts/slashes/fees
- creator/player stats

Expose query endpoints used by frontend for:
- active challenges list
- challenge detail timeline
- user profile and stats

## 16) Deployment and Operations

Deliver:
- network configs for Base Sepolia and Arbitrum Sepolia
- deterministic deployment scripts
- contract verification scripts
- env templates
- monitoring checklist (events, stuck evaluations, failed finalizations)

## 17) Non-Functional Requirements

- Strictly typed code and interfaces.
- NatSpec on all public/external functions.
- Event-rich state transitions.
- Upgradeability decision documented (proxy vs immutable) with rationale.
- Backward-compatible storage layout if upgradeable.

## 18) Output Contract (what you must return)

Return in this exact structure:
1. Architecture summary (1-2 pages)
2. Repository tree
3. Contract interfaces and key structs
4. Full implementation notes by module
5. Test evidence and coverage summary
6. Security findings and mitigations
7. Deployment instructions
8. Remaining open risks and next milestones

## 19) Execution Order

Build in phases and do not skip:
1. Repo scaffold + baseline tooling
2. Contracts + unit tests
3. Fuzz/invariant hardening
4. Frontend + SDK encryption flow
5. Subgraph/indexer integration
6. Security pass + docs
7. Deployment scripts + demo script

## 20) Done Criteria

Project is done only when:
- End-to-end game flow works on Base Sepolia with encrypted secret/guess.
- All tests pass in CI.
- Invariants and fuzz suites pass.
- Static analysis is triaged and clean for high-severity issues.
- Security docs and ops runbooks are complete.
- Demo script can be executed by a third party from scratch.
