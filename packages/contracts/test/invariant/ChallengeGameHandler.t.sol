// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Utils} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import {Test} from "forge-std/Test.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";

contract ChallengeGameHandler is Test {
    ChallengeFactory public immutable factory;
    ChallengeGame public immutable game;

    address[] internal users;
    uint256[] internal trackedGameIds;
    uint256[] internal trackedGuessIds;

    constructor(
        address factoryAddress,
        address gameAddress
    ) {
        factory = ChallengeFactory(factoryAddress);
        game = ChallengeGame(payable(gameAddress));

        users.push(makeAddr("u1"));
        users.push(makeAddr("u2"));
        users.push(makeAddr("u3"));
        users.push(makeAddr("u4"));

        for (uint256 i = 0; i < users.length; ++i) {
            vm.deal(users[i], 1_000 ether);
        }
    }

    function createChallenge(
        uint256 creatorSeed,
        uint96 creatorStakeSeed,
        uint96 playerStakeSeed,
        uint16 slashSeed,
        uint16 creatorCutSeed,
        uint16 payoutSeed,
        uint32 maxAttemptsSeed,
        uint64 cooldownSeed,
        uint32 packedSecret
    ) external {
        address creator = users[creatorSeed % users.length];

        uint256 creatorStake = bound(uint256(creatorStakeSeed), 0.01 ether, 2 ether);
        uint256 playerStake = bound(uint256(playerStakeSeed), 0.001 ether, 0.5 ether);

        uint16 slashBps = uint16(bound(uint256(slashSeed), 0, 9_000));
        uint16 creatorCutBps = uint16(bound(uint256(creatorCutSeed), 0, 10_000));
        uint16 protocolCutBps = 10_000 - creatorCutBps;
        uint16 payoutBps = uint16(bound(uint256(payoutSeed), 0, 5_000));
        uint32 maxAttempts = uint32(bound(uint256(maxAttemptsSeed), 1, 20));
        uint64 cooldown = uint64(bound(uint256(cooldownSeed), 0, 600));

        CipherBetTypes.GameParams memory params = CipherBetTypes.GameParams({
            creatorStake: creatorStake,
            playerStakeFixed: playerStake,
            slashBps: slashBps,
            creatorCutBps: creatorCutBps,
            protocolCutBps: protocolCutBps,
            payoutBpsOfCreatorStake: payoutBps,
            seqLen: 4,
            durationSeconds: 1 days,
            maxAttemptsPerAddress: maxAttempts,
            cooldownSeconds: cooldown
        });

        vm.startPrank(creator);
        try factory.createChallenge{value: creatorStake}(
            params, _encryptPacked(packedSecret)
        ) returns (
            uint256 gameId
        ) {
            trackedGameIds.push(gameId);
        } catch {}
        vm.stopPrank();
    }

    function submitGuess(
        uint256 gameSeed,
        uint256 playerSeed,
        uint32 packedGuess
    ) external {
        if (trackedGameIds.length == 0) {
            return;
        }

        uint256 gameId = trackedGameIds[gameSeed % trackedGameIds.length];
        address player = users[playerSeed % users.length];

        CipherBetTypes.Game memory g = game.getGame(gameId);
        if (!g.active || g.solved) {
            return;
        }

        vm.startPrank(player);
        try game.submitGuess{value: g.playerStakeFixed}(
            gameId, _encryptPacked(packedGuess)
        ) returns (
            uint256 guessId
        ) {
            trackedGuessIds.push(guessId);
        } catch {}
        vm.stopPrank();
    }

    function finalizeGuess(
        uint256 guessSeed
    ) external {
        if (trackedGuessIds.length == 0) {
            return;
        }

        uint256 guessId = trackedGuessIds[guessSeed % trackedGuessIds.length];
        CipherBetTypes.Guess memory guess = game.getGuess(guessId);
        if (guess.player == address(0)) {
            return;
        }

        try game.finalizeGuess(guess.gameId, guessId) {} catch {}
    }

    function reclaimExpired(
        uint256 gameSeed,
        uint64 warpSeconds
    ) external {
        if (trackedGameIds.length == 0) {
            return;
        }

        uint256 gameId = trackedGameIds[gameSeed % trackedGameIds.length];
        CipherBetTypes.Game memory g = game.getGame(gameId);
        if (g.creator == address(0)) {
            return;
        }

        vm.warp(block.timestamp + uint256(bound(uint256(warpSeconds), 0, 3 days)));

        vm.startPrank(g.creator);
        try game.reclaimExpired(gameId) {} catch {}
        vm.stopPrank();
    }

    function cancelChallenge(
        uint256 gameSeed
    ) external {
        if (trackedGameIds.length == 0) {
            return;
        }

        uint256 gameId = trackedGameIds[gameSeed % trackedGameIds.length];
        CipherBetTypes.Game memory g = game.getGame(gameId);
        if (g.creator == address(0)) {
            return;
        }

        vm.startPrank(g.creator);
        try game.cancelChallenge(gameId) {} catch {}
        vm.stopPrank();
    }

    function withdrawSolvedRemainder(
        uint256 gameSeed
    ) external {
        if (trackedGameIds.length == 0) {
            return;
        }

        uint256 gameId = trackedGameIds[gameSeed % trackedGameIds.length];
        CipherBetTypes.Game memory g = game.getGame(gameId);
        if (g.creator == address(0)) {
            return;
        }

        vm.startPrank(g.creator);
        try game.withdrawSolvedRemainder(gameId) {} catch {}
        vm.stopPrank();
    }

    function trackedGameCount() external view returns (uint256 count) {
        count = trackedGameIds.length;
    }

    function trackedGuessCount() external view returns (uint256 count) {
        count = trackedGuessIds.length;
    }

    function trackedGameIdAt(
        uint256 index
    ) external view returns (uint256 gameId) {
        gameId = trackedGameIds[index];
    }

    function trackedGuessIdAt(
        uint256 index
    ) external view returns (uint256 guessId) {
        guessId = trackedGuessIds[index];
    }

    function _encryptPacked(
        uint32 packed
    ) internal pure returns (InEuint32 memory encryptedInput) {
        encryptedInput = InEuint32({
            ctHash: uint256(packed), securityZone: 0, utype: Utils.EUINT32_TFHE, signature: hex""
        });
    }
}
