# Deployment Runbook

## Prerequisites
- Foundry installed
- RPC URL + signer account configured
- Etherscan API key set for verification

## Sequence
1. Deploy `RulesModule` with initial config.
2. Deploy `ProtocolTreasury`.
3. Deploy `ChallengeGame` with rules + treasury addresses.
4. Deploy `ChallengeFactory` with game address.
5. Grant roles:
   - `ChallengeGame.setFactoryRole(factory, true)`
   - `ProtocolTreasury.setGameRole(game, true)`
6. Verify contracts on explorer.
7. Update frontend/subgraph env with deployed addresses.
