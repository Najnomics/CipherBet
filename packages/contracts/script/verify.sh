#!/usr/bin/env bash
set -euo pipefail

: "${CHAIN_ID:?Set CHAIN_ID}"
: "${ETHERSCAN_API_KEY:?Set ETHERSCAN_API_KEY}"
: "${RULES_ADDRESS:?Set RULES_ADDRESS}"
: "${TREASURY_ADDRESS:?Set TREASURY_ADDRESS}"
: "${GAME_ADDRESS:?Set GAME_ADDRESS}"
: "${FACTORY_ADDRESS:?Set FACTORY_ADDRESS}"

forge verify-contract "$RULES_ADDRESS" src/RulesModule.sol:RulesModule --chain-id "$CHAIN_ID"
forge verify-contract "$TREASURY_ADDRESS" src/ProtocolTreasury.sol:ProtocolTreasury --chain-id "$CHAIN_ID"
forge verify-contract "$GAME_ADDRESS" src/ChallengeGame.sol:ChallengeGame --chain-id "$CHAIN_ID"
forge verify-contract "$FACTORY_ADDRESS" src/ChallengeFactory.sol:ChallengeFactory --chain-id "$CHAIN_ID"
