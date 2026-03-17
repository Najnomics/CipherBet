// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";

interface IRulesModule {
    struct RulesConfig {
        uint256 minCreatorStake;
        uint256 minPlayerStake;
        uint64 minDurationSeconds;
        uint64 maxDurationSeconds;
        uint16 maxSlashBps;
        uint16 maxPayoutBps;
        uint32 maxAttemptsPerAddressCap;
        uint64 maxCooldownSeconds;
        uint8 requiredSeqLen;
    }

    function validateGameParams(
        CipherBetTypes.GameParams calldata params,
        uint256 creatorStake
    ) external view;

    function getRuleConfig() external view returns (RulesConfig memory config);
}
