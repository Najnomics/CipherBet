// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Utils} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import {Test} from "forge-std/Test.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {MockTaskManager} from "src/mocks/MockTaskManager.sol";

contract ChallengeGameFuzzTest is Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory internal factory;
    ChallengeGame internal game;
    ProtocolTreasury internal treasury;
    RulesModule internal rules;
    MockTaskManager internal taskManager;

    address internal creator = makeAddr("creator");
    address internal player = makeAddr("player");

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

        vm.deal(creator, 1_000 ether);
        vm.deal(player, 1_000 ether);
    }

    function testFuzz_LossSettlementConservesValue(
        uint96 creatorStakeSeed,
        uint96 playerStakeSeed,
        uint16 slashBpsSeed,
        uint16 creatorCutBpsSeed,
        uint16 payoutBpsSeed,
        uint32 maxAttemptsSeed,
        uint64 cooldownSeed
    ) external {
        uint256 creatorStake = bound(uint256(creatorStakeSeed), 0.01 ether, 10 ether);
        uint256 playerStake = bound(uint256(playerStakeSeed), 0.001 ether, 1 ether);

        uint16 slashBps = uint16(bound(uint256(slashBpsSeed), 0, 9_000));
        uint16 creatorCutBps = uint16(bound(uint256(creatorCutBpsSeed), 0, 10_000));
        uint16 protocolCutBps = 10_000 - creatorCutBps;
        uint16 payoutBps = uint16(bound(uint256(payoutBpsSeed), 0, 5_000));
        uint32 maxAttempts = uint32(bound(uint256(maxAttemptsSeed), 1, 25));
        uint64 cooldown = uint64(bound(uint256(cooldownSeed), 0, 3_600));

        CipherBetTypes.GameParams memory params = CipherBetTypes.GameParams({
            creatorStake: creatorStake,
            playerStakeFixed: playerStake,
            slashBps: slashBps,
            creatorCutBps: creatorCutBps,
            protocolCutBps: protocolCutBps,
            payoutBpsOfCreatorStake: payoutBps,
            seqLen: 4,
            durationSeconds: 7 days,
            maxAttemptsPerAddress: maxAttempts,
            cooldownSeconds: cooldown
        });

        vm.prank(creator);
        uint256 gameId = factory.createChallenge{value: creatorStake}(params, _encryptPacked(3333));

        uint256 playerBalanceBefore = player.balance;

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: playerStake}(gameId, _encryptPacked(4444));

        game.finalizeGuess(gameId, guessId);

        uint256 slash = (playerStake * slashBps) / 10_000;
        uint256 creatorShare = (slash * creatorCutBps) / 10_000;
        uint256 protocolFee = slash - creatorShare;
        uint256 refund = playerStake - slash;

        CipherBetTypes.Game memory g = game.getGame(gameId);

        assertEq(g.creatorStakeEscrowed, creatorStake + creatorShare);
        assertEq(address(treasury).balance, protocolFee);
        assertEq(player.balance, playerBalanceBefore - playerStake + refund);

        (
            uint256 creatorEscrow,
            uint256 pendingPlayer,
            uint256 expectedMinBalance,
            uint256 onchainBalance
        ) = game.getLiabilitySnapshot();
        assertEq(creatorEscrow, creatorStake + creatorShare);
        assertEq(pendingPlayer, 0);
        assertEq(expectedMinBalance, creatorEscrow + pendingPlayer);
        assertGe(onchainBalance, expectedMinBalance);
    }

    function testFuzz_WinSettlementPaysBoundedPayout(
        uint96 creatorStakeSeed,
        uint96 playerStakeSeed,
        uint16 payoutBpsSeed
    ) external {
        uint256 creatorStake = bound(uint256(creatorStakeSeed), 0.01 ether, 10 ether);
        uint256 playerStake = bound(uint256(playerStakeSeed), 0.001 ether, 1 ether);
        uint16 payoutBps = uint16(bound(uint256(payoutBpsSeed), 0, 5_000));

        CipherBetTypes.GameParams memory params = CipherBetTypes.GameParams({
            creatorStake: creatorStake,
            playerStakeFixed: playerStake,
            slashBps: 2_000,
            creatorCutBps: 7_000,
            protocolCutBps: 3_000,
            payoutBpsOfCreatorStake: payoutBps,
            seqLen: 4,
            durationSeconds: 7 days,
            maxAttemptsPerAddress: 10,
            cooldownSeconds: 0
        });

        vm.prank(creator);
        uint256 gameId = factory.createChallenge{value: creatorStake}(params, _encryptPacked(9999));

        vm.prank(player);
        uint256 guessId = game.submitGuess{value: playerStake}(gameId, _encryptPacked(9999));

        uint256 playerBalanceBeforeFinalize = player.balance;

        game.finalizeGuess(gameId, guessId);

        uint256 payout = (creatorStake * payoutBps) / 10_000;

        CipherBetTypes.Game memory g = game.getGame(gameId);
        assertTrue(g.solved);
        assertFalse(g.active);
        assertEq(g.creatorStakeEscrowed, creatorStake - payout);
        assertEq(player.balance, playerBalanceBeforeFinalize + playerStake + payout);
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

    function _encryptPacked(
        uint32 packed
    ) internal pure returns (InEuint32 memory encryptedInput) {
        encryptedInput = InEuint32({
            ctHash: uint256(packed), securityZone: 0, utype: Utils.EUINT32_TFHE, signature: hex""
        });
    }
}
