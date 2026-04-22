// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Utils} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import {Test, console} from "forge-std/Test.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {MockTaskManager} from "src/mocks/MockTaskManager.sol";

/// @notice Full E2E test: create → wrong guess → slash → correct guess → win → expiry → cancel
contract E2ELifecycleTest is Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory factory;
    ChallengeGame game;
    ProtocolTreasury treasury;
    RulesModule rules;
    MockTaskManager taskManager;

    address creator = makeAddr("creator");
    address player1 = makeAddr("player1");
    address player2 = makeAddr("player2");

    function setUp() public {
        MockTaskManager impl = new MockTaskManager();
        vm.etch(TASK_MANAGER_ADDRESS, address(impl).code);
        taskManager = MockTaskManager(TASK_MANAGER_ADDRESS);

        rules = new RulesModule(address(this), _ruleConfig());
        treasury = new ProtocolTreasury(address(this));
        game = new ChallengeGame(address(this), address(rules), address(treasury));
        factory = new ChallengeFactory(address(this), address(game));

        game.setFactoryRole(address(factory), true);
        treasury.setGameRole(address(game), true);

        vm.deal(creator, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
    }

    function test_E2E_FullGameLifecycle() public {
        console.log("=== E2E: Full Game Lifecycle ===");

        // ─── 1. Creator creates challenge ───
        console.log("[1] Creator creates challenge (secret=5173, stake=1 ETH)");
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createGame(params, 5173);

        CipherBetTypes.Game memory g = game.getGame(gameId);
        assertEq(g.creator, creator);
        assertTrue(g.active);
        assertFalse(g.solved);
        assertEq(g.creatorStakeEscrowed, 1 ether);
        console.log("    Game #%s created. Escrow: 1 ETH", gameId);

        // ─── 2. Player1 submits WRONG guess ───
        console.log("[2] Player1 guesses 4321 (wrong)");
        vm.prank(player1);
        uint256 gId1 = game.submitGuess{value: 0.1 ether}(gameId, _enc(4321));

        // ─── 3. Finalize wrong guess ───
        console.log("[3] Finalizing wrong guess...");
        uint256 escrowBefore = game.getGame(gameId).creatorStakeEscrowed;
        uint256 p1Before = player1.balance;

        game.finalizeGuess(gameId, gId1);

        // slash = 0.1 * 2000/10000 = 0.02 ETH
        // creatorCut = 0.02 * 7000/10000 = 0.014 ETH
        // protocolFee = 0.02 - 0.014 = 0.006 ETH
        // refund = 0.1 - 0.02 = 0.08 ETH
        assertEq(game.getGame(gameId).creatorStakeEscrowed, escrowBefore + 0.014 ether);
        assertEq(player1.balance, p1Before + 0.08 ether);
        assertTrue(game.getGame(gameId).active);
        CipherBetTypes.Guess memory firstGuess = game.getGuess(gId1);
        assertEq(firstGuess.exactMatches, 0, "4321 should have zero exact matches");
        assertEq(firstGuess.partialMatches, 2, "4321 should have two partial matches");
        console.log("    Slash=0.02 | Creator+0.014 | Protocol+0.006 | Refund=0.08");
        console.log("    Feedback: exact=0 partial=2");

        // ─── 4. Player2 also guesses wrong ───
        console.log("[4] Player2 guesses 9999 (wrong)");
        vm.prank(player2);
        uint256 gId2 = game.submitGuess{value: 0.1 ether}(gameId, _enc(9999));
        game.finalizeGuess(gameId, gId2);
        CipherBetTypes.Guess memory secondGuess = game.getGuess(gId2);
        assertEq(secondGuess.exactMatches, 0, "9999 should have zero exact matches");
        assertEq(secondGuess.partialMatches, 0, "9999 should have zero partial matches");
        console.log("    Player2 slashed too");

        // ─── 5. Player1 submits CORRECT guess ───
        console.log("[5] Player1 guesses 5173 (CORRECT)");
        vm.prank(player1);
        uint256 gIdWin = game.submitGuess{value: 0.1 ether}(gameId, _enc(5173));

        // ─── 6. Finalize winning guess ───
        console.log("[6] Finalizing winning guess...");
        uint256 currentEscrow = game.getGame(gameId).creatorStakeEscrowed;
        uint256 expectedPayout = (currentEscrow * 1500) / 10000;
        uint256 p1BeforeWin = player1.balance;

        game.finalizeGuess(gameId, gIdWin);

        CipherBetTypes.Game memory fin = game.getGame(gameId);
        CipherBetTypes.Guess memory winningGuess = game.getGuess(gIdWin);
        assertTrue(fin.solved, "Game solved");
        assertFalse(fin.active, "Game inactive");
        assertEq(fin.attemptCount, 3, "3 attempts total");
        assertEq(winningGuess.exactMatches, 4, "winning guess should have four exact matches");
        assertEq(winningGuess.partialMatches, 0, "winning guess should have zero partial matches");
        assertTrue(player1.balance > p1BeforeWin, "Player received payout");

        console.log("    GAME SOLVED! Payout: %s wei", expectedPayout);
        console.log("    Player1 received payout + stake refund");
        console.log("    Feedback: exact=4 partial=0");

        // ─── 7. Verify treasury ───
        console.log("[7] Verifying treasury...");
        uint256 treasuryBal = address(treasury).balance;
        assertEq(treasuryBal, 2 * 0.006 ether, "2 wrong guesses * 0.006 ETH");
        console.log("    Treasury: %s wei (2 x 0.006 ETH)", treasuryBal);

        console.log("");
        console.log("=== E2E FULL LIFECYCLE PASSED ===");
    }

    function test_E2E_GameExpiry() public {
        console.log("=== E2E: Game Expiry ===");

        CipherBetTypes.GameParams memory params = _defaultParams();
        params.durationSeconds = 1 hours;
        uint256 gameId = _createGame(params, 5173);
        console.log("[1] Game created with 1 hour deadline");

        vm.warp(block.timestamp + 2 hours);
        console.log("[2] Warped 2 hours past deadline");

        uint256 creatorBefore = creator.balance;
        vm.prank(creator);
        game.reclaimExpired(gameId);

        assertTrue(creator.balance > creatorBefore, "Creator reclaimed stake");
        assertFalse(game.getGame(gameId).active);
        console.log("[3] Creator reclaimed stake");
        console.log("=== EXPIRY PASSED ===");
    }

    function test_E2E_CreatorCancellation() public {
        console.log("=== E2E: Creator Cancellation ===");

        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createGame(params, 5173);
        console.log("[1] Game created");

        uint256 creatorBefore = creator.balance;
        vm.prank(creator);
        game.cancelChallenge(gameId);

        assertTrue(creator.balance > creatorBefore, "Creator got stake back");
        assertFalse(game.getGame(gameId).active);
        console.log("[2] Cancelled, full stake returned");
        console.log("=== CANCELLATION PASSED ===");
    }

    // ─── Helpers ───

    function _defaultParams() internal pure returns (CipherBetTypes.GameParams memory) {
        return CipherBetTypes.GameParams({
            creatorStake: 1 ether,
            playerStakeFixed: 0.1 ether,
            slashBps: 2000,
            creatorCutBps: 7000,
            protocolCutBps: 3000,
            payoutBpsOfCreatorStake: 1500,
            seqLen: 4,
            durationSeconds: 7 days,
            maxAttemptsPerAddress: 10,
            cooldownSeconds: 0
        });
    }

    function _ruleConfig() internal pure returns (IRulesModule.RulesConfig memory) {
        return IRulesModule.RulesConfig({
            minCreatorStake: 0.01 ether,
            minPlayerStake: 0.001 ether,
            minDurationSeconds: 1 hours,
            maxDurationSeconds: 30 days,
            maxSlashBps: 9000,
            maxPayoutBps: 5000,
            maxAttemptsPerAddressCap: 50,
            maxCooldownSeconds: 1 hours,
            requiredSeqLen: 4
        });
    }

    function _createGame(CipherBetTypes.GameParams memory params, uint32 secret) internal returns (uint256) {
        vm.prank(creator);
        return factory.createChallenge{value: params.creatorStake}(params, _enc(secret));
    }

    function _enc(uint32 packed) internal pure returns (InEuint32 memory) {
        return InEuint32({ctHash: uint256(packed), securityZone: 0, utype: Utils.EUINT32_TFHE, signature: hex""});
    }
}
