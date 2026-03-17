# CipherBet Production Implementation Report

## 1. Architecture Summary (1-2 pages)

CipherBet is implemented as a modular monorepo with clear trust boundaries between onchain settlement logic, client encryption flows, and offchain indexing.

### Core architecture
- **ChallengeFactory (onchain entrypoint)**
  - Accepts game creation requests from creators.
  - Stores challenge metadata for discovery.
  - Emits canonical `GameCreated` event for indexers.
- **ChallengeGame (onchain core engine)**
  - Stores game state and guess lifecycle.
  - Holds creator escrow and tracks pending player stake.
  - Performs encrypted equality checks through `@fhenixprotocol/cofhe-contracts/FHE.sol` (`FHELib` wrappers).
  - Requests async decrypt of boolean outcome only.
  - Finalizes payout/slash with pull-based `finalizeGuess()`.
- **ProtocolTreasury (onchain fee vault)**
  - Receives protocol fee from slash events via `GAME_ROLE` gate.
  - Separates fee accounting from game escrow accounting.
- **RulesModule (onchain policy layer)**
  - Centralized guardrails for stake bounds, BPS caps, seqLen, duration, cooldown, and attempts.

### Confidential compute model
- Encrypted values are represented as opaque handles (`euint32`, `ebool`) in contract state.
- Contract never decrypts secret or guess.
- Only win/loss boolean is decrypt-requested.
- ACL intent is explicit through `FHE.allowThis(...)` in `FHELib`.

### State machine
- Game lifecycle: created -> active -> solved/expired/cancelled.
- Guess lifecycle: evaluating -> finalized.
- Async decrypt is modeled explicitly: `submitGuess()` stores request ID; `finalizeGuess()` settles later.

### Economic model implementation
- Wrong guess: slash and deterministic split (`creatorShare`, `protocolFee`, `playerRefund`).
- Correct guess: payout from creator escrow + full player stake return.
- Single winner mode: first finalized winning guess solves game.
- Additional finalized guesses after solved are refunded stake only.

### Safety model
- ReentrancyGuard on state-changing settlement and withdrawal paths.
- CEI ordering before ETH transfers.
- Role-based controls for factory creation and treasury fee intake.
- Liability tracking (`totalCreatorEscrowed`, `totalPendingPlayerStake`) exposed for invariants.

## 2. Repository Tree

```text
cypherbet/
├── .github/workflows/ci.yml
├── PRODUCTION_BUILD_PROMPT.md
├── README.md
├── ops/runbooks/
│   ├── deployment.md
│   ├── incidents.md
│   └── monitoring.md
├── packages/
│   ├── contracts/
│   │   ├── foundry.toml
│   │   ├── script/
│   │   │   ├── Deploy.s.sol
│   │   │   └── verify.sh
│   │   ├── src/
│   │   │   ├── ChallengeFactory.sol
│   │   │   ├── ChallengeGame.sol
│   │   │   ├── ProtocolTreasury.sol
│   │   │   ├── RulesModule.sol
│   │   │   ├── interfaces/
│   │   │   ├── libraries/
│   │   │   └── mocks/MockTaskManager.sol
│   │   └── test/
│   │       ├── unit/
│   │       ├── fuzz/
│   │       └── invariant/
│   ├── docs/
│   │   ├── threat-model.md
│   │   ├── security-assumptions.md
│   │   ├── economic-analysis.md
│   │   ├── known-risks.md
│   │   ├── incident-response.md
│   │   ├── production-report.md
│   │   └── security-scans/
│   ├── frontend/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   ├── sdk/
│   │   ├── src/
│   │   │   ├── encoding.ts
│   │   │   ├── fhe.ts
│   │   │   ├── contracts.ts
│   │   │   ├── types.ts
│   │   │   └── abi/
│   │   └── package.json
│   └── subgraph/
│       ├── schema.graphql
│       ├── subgraph.yaml
│       ├── abis/
│       └── src/mappings/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 3. Contract Interfaces and Key Structs

### Key onchain interfaces
- `IChallengeGame`
  - `createChallenge(creator, params, encryptedSecret) -> (gameId, deadline)`
  - `getGame(gameId) -> Game`
- `IProtocolTreasury`
  - `receiveProtocolFee(gameId)`
- `IRulesModule`
  - `validateGameParams(params, creatorStake)`
  - `getRuleConfig()`
- `FHE.sol` (`@fhenixprotocol/cofhe-contracts`)
  - `asEuint32`, `eq`, `decrypt`, `getDecryptResultSafe`, ACL helpers

### Core structs (`CipherBetTypes`)
- `GameParams`
  - `creatorStake`, `playerStakeFixed`
  - `slashBps`, `creatorCutBps`, `protocolCutBps`, `payoutBpsOfCreatorStake`
  - `seqLen`, `durationSeconds`, `maxAttemptsPerAddress`, `cooldownSeconds`
- `Game`
  - required financial + lifecycle fields from prompt
  - plus `maxAttemptsPerAddress`, `cooldownSeconds`, `unresolvedGuesses`, `hasGuesses`
- `Guess`
  - `player`, `gameId`, `stake`, `guessHandle`, `winFlagEnc`, `decryptRequestId`, `state`, `timestamp`

## 4. Full Implementation Notes by Module

### `packages/contracts`
- Implemented complete v1 flow:
  - create challenge (factory-gated)
  - submit encrypted guess with fixed stake
  - async finalize via decrypt result
  - settle win/loss math exactly
  - cancel before first guess only
  - reclaim after expiry with unresolved guard
  - withdraw solved creator remainder
- Added deterministic liability accounting and state-view helpers.
- Added deployment script and verification helper.

### `packages/sdk`
- Implemented required SDK API:
  - `encodeDigitsToPackedUint32(digits)`
  - `encryptSecret(...)`
  - `encryptGuess(...)`
  - permit helper: `getOrCreatePermit(...)`
  - typed contract writers for create/submit/finalize via viem
- Included ABI fragments for factory and game interactions.

### `packages/frontend`
- Built Next.js dApp shell with:
  - challenge creation form + parameter guardrails
  - guess submission flow
  - finalize action flow
  - analytics panel wired for subgraph endpoint integration
- Added wagmi/react-query provider setup and network config for Base/Arbitrum Sepolia.

### `packages/subgraph`
- Added schema for `Challenge`, `Guess`, `User`, `ProtocolStats`.
- Added mappings for:
  - challenge lifecycle (`GameCreated`, `GameSolved`, `GameExpired`, `GameCancelled`)
  - guess lifecycle (`GuessSubmitted`, `GuessResolved`)
  - aggregate protocol/user stats.

### `packages/docs` + `ops`
- Added requested security docs and operational runbooks.
- Added security scan artifact storage.

## 5. Test Evidence and Coverage Summary

### Foundry test suites
- Unit: `ChallengeGame.t.sol` (core function and revert-path coverage)
- Unit: `ChallengeGameAccessLimits.t.sol` (access-control + cooldown/attempt limits)
- Unit: `ProtocolTreasury.t.sol` (role-gated fee intake/withdraw accounting)
- Unit: `RulesModule.t.sol` (parameter guardrails and admin config controls)
- Security: `Reentrancy.t.sol` (callback reentrancy attempt)
- Fuzz: `ChallengeGameFuzz.t.sol` (math conservation and payout bounds)
- Invariant: `ChallengeGameInvariant.t.sol` + handler (liabilities/accounting conservation)

### Last executed results
- `forge test -vv`: **27 passed, 0 failed**
- Invariants: all passed across 256 runs each with 16,384 handler calls.

### Coverage
- Command used: `forge coverage --report summary --ir-minimum`
- Overall (last run):
  - Lines: `71.10%`
  - Statements: `73.82%`
  - Branches: `42.27%`
  - Functions: `65.28%`

## 6. Security Findings and Mitigations

### During implementation
- **Found and fixed logic bug via fuzzing**:
  - Issue: first guess could incorrectly hit cooldown if `block.timestamp < cooldownSeconds` and no prior guess existed.
  - Fix: apply cooldown only when `lastGuessTimestamp != 0`.

### Slither (`packages/docs/security-scans/slither.*`)
- Findings are dominated by expected patterns and informational signals.
- Key triage:
  - `arbitrary-send-eth` in treasury withdraw: **accepted by design** (admin-authorized withdrawal path).
  - `reentrancy-*` around external CoFHE operations: **mitigated with role boundaries + `nonReentrant` on settlement paths**; residual risk documented as dependency trust.
  - `timestamp`: **accepted** (deadline/cooldown semantics intentionally time-based).
  - `low-level-calls`: **intentional** for ETH transfer with revert-on-failure.

### Semgrep (`packages/docs/security-scans/semgrep.*`)
- `--config auto` completed with **0 findings** and **0 scan errors**.

## 7. Deployment Instructions

1. Configure env (from `.env.example`):
   - `ADMIN_ADDRESS`, RPC URLs, explorer key.
2. Deploy contracts:
   - `forge script packages/contracts/script/Deploy.s.sol --rpc-url <BASE_SEPOLIA_RPC> --broadcast --account <ACCOUNT> --sender <ADMIN_ADDRESS>`
3. Verify:
   - `packages/contracts/script/verify.sh`
4. Configure frontend env:
   - `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_GAME_ADDRESS`, `NEXT_PUBLIC_SUBGRAPH_URL`
5. Build and run:
   - `pnpm build`
   - `pnpm --filter @cipherbet/frontend dev`
6. Indexer:
   - update `packages/subgraph/subgraph.yaml` addresses/startBlock and deploy subgraph.

## 8. Remaining Open Risks and Next Milestones

### Open risks
- Decrypt liveness dependency can delay finalization and expiry reclaim.
- Winner policy is first finalized correct guess, which may differ from first submitted correct guess.
- CoFHE client initialization/permit flow may fail for unsupported wallet/network combinations.
- Next.js still reports chunk circular-dependency build warnings from transitive wallet/connectivity packages.

### Next milestones
1. Improve explicit permit ACL UX and user-facing decrypt-readiness telemetry.
2. Add callback-mode settlement adapter (optional) with strict auth checks.
3. Add testnet deployment to Base Sepolia and verify complete E2E with live CoFHE infrastructure.
4. Expand branch coverage with focused edge-path tests for role management and treasury operations.
5. Add subgraph query hooks in frontend for live active challenge and leaderboard views.
