// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {InEuint32, euint8} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Utils} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import {Test} from "forge-std/Test.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {FHELib} from "src/libraries/FHELib.sol";
import {MockTaskManager} from "src/mocks/MockTaskManager.sol";

contract ChallengeGameUnitTest is Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory internal factory;
    ChallengeGame internal game;
    ProtocolTreasury internal treasury;
    RulesModule internal rules;
    MockTaskManager internal taskManager;

    address internal creator = makeAddr("creator");
    address internal player = makeAddr("player");
    address internal playerTwo = makeAddr("playerTwo");
    address internal randomUser = makeAddr("randomUser");

    uint256 internal constant CREATOR_STAKE = 1 ether;
    uint256 internal constant PLAYER_STAKE = 0.1 ether;

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

        vm.deal(creator, 100 ether);
        vm.deal(player, 100 ether);
        vm.deal(playerTwo, 100 ether);
        vm.deal(randomUser, 100 ether);
    }

    function test_CreateChallenge_Success() external {
        CipherBetTypes.GameParams memory params = _defaultParams();

        vm.prank(creator);
        uint256 gameId =
            factory.createChallenge{value: params.creatorStake}(params, _encryptPacked(1234));

        CipherBetTypes.Game memory g = game.getGame(gameId);

        assertEq(g.creator, creator);
        assertEq(g.creatorStakeEscrowed, CREATOR_STAKE);
        assertEq(g.playerStakeFixed, PLAYER_STAKE);
        assertEq(g.seqLen, 4);
        assertTrue(g.active);
        assertFalse(g.solved);
    }

    function test_SubmitAndFinalizeWrongGuess_DistributesSlash() external {
        CipherBetTypes.GameParams memory params = _defaultParams();

        uint256 gameId = _createDefaultGame(params, 1234);

        uint256 balanceBefore = player.balance;

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: PLAYER_STAKE}(gameId, _encryptPacked(1111));

        assertEq(balanceBefore - player.balance, PLAYER_STAKE);

        vm.prank(randomUser);
        game.finalizeGuess(gameId, guessId);

        uint256 slash = (PLAYER_STAKE * params.slashBps) / 10_000;
        uint256 creatorShare = (slash * params.creatorCutBps) / 10_000;
        uint256 protocolFee = slash - creatorShare;
        uint256 refund = PLAYER_STAKE - slash;

        CipherBetTypes.Game memory g = game.getGame(gameId);
        CipherBetTypes.Guess memory guess = game.getGuess(guessId);

        assertEq(uint8(guess.state), uint8(CipherBetTypes.GuessState.FINALIZED));
        assertEq(guess.exactMatches, 1);
        assertEq(guess.partialMatches, 0);
        assertEq(g.creatorStakeEscrowed, CREATOR_STAKE + creatorShare);
        assertEq(address(treasury).balance, protocolFee);
        assertEq(player.balance, balanceBefore - PLAYER_STAKE + refund);
    }

    function test_SubmitAndFinalizeCorrectGuess_SolvesGame() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createDefaultGame(params, 2026);

        uint256 balanceBefore = player.balance;

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: PLAYER_STAKE}(gameId, _encryptPacked(2026));

        vm.prank(randomUser);
        game.finalizeGuess(gameId, guessId);

        uint256 payout = (CREATOR_STAKE * params.payoutBpsOfCreatorStake) / 10_000;

        CipherBetTypes.Game memory g = game.getGame(gameId);
        CipherBetTypes.Guess memory guess = game.getGuess(guessId);
        assertTrue(g.solved);
        assertFalse(g.active);
        assertEq(guess.exactMatches, 4);
        assertEq(guess.partialMatches, 0);
        assertEq(g.creatorStakeEscrowed, CREATOR_STAKE - payout);
        assertEq(player.balance, balanceBefore + payout);
    }

    function test_Cancel_OnlyBeforeFirstGuess() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createDefaultGame(params, 9090);

        vm.prank(creator);
        game.cancelChallenge(gameId);

        CipherBetTypes.Game memory g = game.getGame(gameId);
        assertFalse(g.active);
        assertEq(g.creatorStakeEscrowed, 0);

        uint256 gameIdTwo = _createDefaultGame(params, 9091);
        vm.prank(player);
        game.submitGuess{value: PLAYER_STAKE}(gameIdTwo, _encryptPacked(1));

        vm.prank(creator);
        vm.expectRevert(ChallengeGame.ChallengeGame__NoGuessesAllowedForCancellation.selector);
        game.cancelChallenge(gameIdTwo);
    }

    function test_ReclaimExpired_AfterDeadline() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createDefaultGame(params, 4242);

        vm.warp(block.timestamp + params.durationSeconds + 1);

        uint256 creatorBalanceBefore = creator.balance;
        vm.prank(creator);
        game.reclaimExpired(gameId);

        assertEq(creator.balance, creatorBalanceBefore + CREATOR_STAKE);

        CipherBetTypes.Game memory g = game.getGame(gameId);
        assertFalse(g.active);
        assertEq(g.creatorStakeEscrowed, 0);
    }

    function test_FinalizeGuess_CannotExecuteTwice() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createDefaultGame(params, 1111);

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: PLAYER_STAKE}(gameId, _encryptPacked(2222));

        game.finalizeGuess(gameId, guessId);

        vm.expectRevert(ChallengeGame.ChallengeGame__GuessNotEvaluating.selector);
        game.finalizeGuess(gameId, guessId);
    }

    function test_FinalizeGuess_RevertsWhenDecryptNotReady() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createDefaultGame(params, 7777);

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: PLAYER_STAKE}(gameId, _encryptPacked(1234));

        CipherBetTypes.Guess memory guess = game.getGuess(guessId);
        uint256 decryptRequestId = uint256(euint8.unwrap(guess.exactMatchesEnc));
        taskManager.setDecryptReady(decryptRequestId, false);

        vm.expectRevert(
            abi.encodeWithSelector(
                FHELib.FHELib__DecryptResultNotReady.selector, decryptRequestId
            )
        );
        game.finalizeGuess(gameId, guessId);
    }

    function _defaultParams() internal pure returns (CipherBetTypes.GameParams memory params) {
        params = CipherBetTypes.GameParams({
            creatorStake: CREATOR_STAKE,
            playerStakeFixed: PLAYER_STAKE,
            slashBps: 2_000,
            creatorCutBps: 7_000,
            protocolCutBps: 3_000,
            payoutBpsOfCreatorStake: 1_500,
            seqLen: 4,
            durationSeconds: 7 days,
            maxAttemptsPerAddress: 10,
            cooldownSeconds: 0
        });
    }

    function _ruleConfig() internal pure returns (IRulesModule.RulesConfig memory cfg) {
        cfg = IRulesModule.RulesConfig({
            minCreatorStake: 0.01 ether,
            minPlayerStake: 0.001 ether,
            minDurationSeconds: 1 hours,
            maxDurationSeconds: 30 days,
            maxSlashBps: 9_000,
            maxPayoutBps: 5_000,
            maxAttemptsPerAddressCap: 50,
            maxCooldownSeconds: 1 hours,
            requiredSeqLen: 4
        });
    }

    function _createDefaultGame(
        CipherBetTypes.GameParams memory params,
        uint32 packedSecret
    ) internal returns (uint256 gameId) {
        vm.prank(creator);
        gameId = factory.createChallenge{value: params.creatorStake}(
            params, _encryptPacked(packedSecret)
        );
    }

    function _encryptPacked(
        uint32 packed
    ) internal pure returns (InEuint32 memory encryptedInput) {
        encryptedInput = InEuint32({
            ctHash: uint256(packed), securityZone: 0, utype: Utils.EUINT32_TFHE, signature: hex""
        });
    }
}
