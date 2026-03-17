// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {MockTaskManager} from "src/mocks/MockTaskManager.sol";
import {ChallengeGameHandler} from "test/invariant/ChallengeGameHandler.t.sol";

contract ChallengeGameInvariantTest is StdInvariant, Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory internal factory;
    ChallengeGame internal game;
    ProtocolTreasury internal treasury;
    RulesModule internal rules;
    MockTaskManager internal taskManager;

    ChallengeGameHandler internal handler;

    function setUp() external {
        MockTaskManager taskManagerImpl = new MockTaskManager();
        vm.etch(TASK_MANAGER_ADDRESS, address(taskManagerImpl).code);
        taskManager = MockTaskManager(TASK_MANAGER_ADDRESS);

        rules = new RulesModule(address(this), _ruleConfig());
        treasury = new ProtocolTreasury(address(this));
        game = new ChallengeGame(address(this), address(rules), address(treasury));
        factory = new ChallengeFactory(address(this), address(game));

        game.setFactoryRole(address(factory), true);
        treasury.setGameRole(address(game), true);

        handler = new ChallengeGameHandler(address(factory), address(game));

        targetContract(address(handler));
    }

    function invariant_balanceCoversLiabilities() external view {
        (
            uint256 creatorEscrow,
            uint256 pendingPlayer,
            uint256 expectedMinBalance,
            uint256 onchainBalance
        ) = game.getLiabilitySnapshot();

        assertEq(expectedMinBalance, creatorEscrow + pendingPlayer);
        assertGe(onchainBalance, expectedMinBalance);
    }

    function invariant_totalCreatorEscrowMatchesTrackedGames() external view {
        uint256 gameCount = handler.trackedGameCount();
        uint256 summedEscrow;

        for (uint256 i = 0; i < gameCount; ++i) {
            uint256 gameId = handler.trackedGameIdAt(i);
            CipherBetTypes.Game memory g = game.getGame(gameId);
            summedEscrow += g.creatorStakeEscrowed;
        }

        assertEq(summedEscrow, game.totalCreatorEscrowed());
    }

    function invariant_pendingStakesMatchEvaluatingGuesses() external view {
        uint256 guessCount = handler.trackedGuessCount();
        uint256 evaluatingStake;

        for (uint256 i = 0; i < guessCount; ++i) {
            uint256 guessId = handler.trackedGuessIdAt(i);
            CipherBetTypes.Guess memory guess = game.getGuess(guessId);

            if (guess.state == CipherBetTypes.GuessState.EVALUATING) {
                evaluatingStake += guess.stake;
            }
        }

        assertEq(evaluatingStake, game.totalPendingPlayerStake());
    }

    function _ruleConfig() internal pure returns (IRulesModule.RulesConfig memory cfg) {
        cfg = IRulesModule.RulesConfig({
            minCreatorStake: 0.01 ether,
            minPlayerStake: 0.001 ether,
            minDurationSeconds: 1 hours,
            maxDurationSeconds: 30 days,
            maxSlashBps: 9_000,
            maxPayoutBps: 5_000,
            maxAttemptsPerAddressCap: 100,
            maxCooldownSeconds: 1 hours,
            requiredSeqLen: 4
        });
    }
}
