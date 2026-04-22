# CipherBet Protocol

Production-grade monorepo for a privacy-preserving onchain codebreaking game using Fhenix CoFHE encrypted handles and async settlement.

## How The Game Works

CipherBet now uses a Mastermind-style challenge model instead of a single all-or-nothing exact-code lottery.

- The creator chooses a secret 4-digit code.
- Players submit private encrypted guesses.
- Each resolved guess returns two clues:
  - `exact`: correct digit in the correct position
  - `partial`: correct digit in the wrong position
- A challenge is solved when a player reaches `4 exact`.
- Wrong guesses still settle economically through the slash rules configured by the creator.

This makes the game solvable by deduction rather than raw luck.

For the full player guide and solving strategy, see [packages/docs/how-to-play-mastermind.md](packages/docs/how-to-play-mastermind.md).

## Workspace Layout

- `packages/contracts`: Solidity protocol (`ChallengeFactory`, `ChallengeGame`, `ProtocolTreasury`, `RulesModule`) + Foundry tests
- `packages/frontend`: Next.js dApp (create challenge, submit guess, finalize guess, analytics wiring)
- `packages/sdk`: TypeScript SDK (digit packing, encryption hooks, typed viem wrappers)
- `packages/subgraph`: The Graph indexing (challenge/guess lifecycle, stats entities)
- `packages/docs`: threat model, assumptions, economics, risks, incident response
- `ops/runbooks`: deployment, monitoring, incident handling
- `context/`: cloned CoFHE docs reference (`github.com/FhenixProtocol/cofhe-docs`)

## Quickstart

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### Contracts

```bash
pnpm --filter @cipherbet/contracts build
pnpm --filter @cipherbet/contracts test
pnpm --filter @cipherbet/contracts fuzz
pnpm --filter @cipherbet/contracts invariant
pnpm --filter @cipherbet/contracts coverage
```

### Frontend

```bash
cp .env.example .env
pnpm --filter @cipherbet/frontend dev
```

### Subgraph

```bash
pnpm --filter @cipherbet/subgraph codegen
pnpm --filter @cipherbet/subgraph build
```

## Security Artifacts

- Slither output: `packages/docs/security-scans/slither.json` and `packages/docs/security-scans/slither.txt`
- Semgrep output: `packages/docs/security-scans/semgrep.json` and `packages/docs/security-scans/semgrep.txt`
- Coverage summary: run `pnpm --filter @cipherbet/contracts coverage`

## Deployment

- Deploy script: `packages/contracts/script/Deploy.s.sol`
- Verify helper: `packages/contracts/script/verify.sh`
- Runbooks: `ops/runbooks/*.md`

## Product Prompt

- `PRODUCTION_BUILD_PROMPT.md`
