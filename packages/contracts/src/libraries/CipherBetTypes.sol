// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {euint8, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

library CipherBetTypes {
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    enum GuessState {
        SUBMITTED,
        EVALUATING,
        FINALIZED
    }

    struct GameParams {
        uint256 creatorStake;
        uint256 playerStakeFixed;
        uint16 slashBps;
        uint16 creatorCutBps;
        uint16 protocolCutBps;
        uint16 payoutBpsOfCreatorStake;
        uint8 seqLen;
        uint64 durationSeconds;
        uint32 maxAttemptsPerAddress;
        uint64 cooldownSeconds;
    }

    struct Game {
        address creator;
        uint256 creatorStakeEscrowed;
        uint256 playerStakeFixed;
        uint16 slashBps;
        uint16 creatorCutBps;
        uint16 protocolCutBps;
        uint16 payoutBpsOfCreatorStake;
        uint8 seqLen;
        euint32 secretHandle;
        uint64 deadline;
        bool active;
        bool solved;
        uint256 totalPlayerStaked;
        uint256 protocolFeesAccrued;
        uint256 attemptCount;
        uint32 maxAttemptsPerAddress;
        uint64 cooldownSeconds;
        uint256 unresolvedGuesses;
        bool hasGuesses;
    }

    struct Guess {
        address player;
        uint256 gameId;
        uint256 stake;
        euint32 guessHandle;
        euint8 exactMatchesEnc;
        euint8 partialMatchesEnc;
        GuessState state;
        uint256 timestamp;
        uint8 exactMatches;
        uint8 partialMatches;
    }
}
