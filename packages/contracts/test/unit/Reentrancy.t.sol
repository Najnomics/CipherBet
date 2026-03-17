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

contract ReentrantGuesser {
    ChallengeGame public immutable game;

    uint256 public gameId;
    uint256 public guessId;
    bool internal reentered;

    constructor(
        address gameAddress
    ) {
        game = ChallengeGame(payable(gameAddress));
    }

    function submitGuess(
        uint256 targetGameId,
        InEuint32 calldata encryptedGuess
    ) external payable {
        gameId = targetGameId;
        guessId = game.submitGuess{value: msg.value}(targetGameId, encryptedGuess);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            try game.finalizeGuess(gameId, guessId) {} catch {}
        }
    }
}

contract ReentrancySecurityTest is Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory internal factory;
    ChallengeGame internal game;
    ProtocolTreasury internal treasury;
    RulesModule internal rules;
    MockTaskManager internal taskManager;

    address internal creator = makeAddr("creator");

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
    }

    function test_ReentrancyDuringFinalize_DoesNotDoubleSettle() external {
        CipherBetTypes.GameParams memory params = _params();

        vm.prank(creator);
        uint256 gameId =
            factory.createChallenge{value: params.creatorStake}(params, _encryptPacked(7777));

        ReentrantGuesser attacker = new ReentrantGuesser(address(game));
        vm.deal(address(attacker), 10 ether);

        vm.prank(address(attacker));
        attacker.submitGuess{value: params.playerStakeFixed}(gameId, _encryptPacked(1111));

        uint256 attackerBalanceBefore = address(attacker).balance;

        game.finalizeGuess(gameId, attacker.guessId());

        uint256 slash = (params.playerStakeFixed * params.slashBps) / 10_000;
        uint256 expectedRefund = params.playerStakeFixed - slash;

        assertEq(address(attacker).balance, attackerBalanceBefore + expectedRefund);
    }

    function _params() internal pure returns (CipherBetTypes.GameParams memory params) {
        params = CipherBetTypes.GameParams({
            creatorStake: 1 ether,
            playerStakeFixed: 0.1 ether,
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

    function _encryptPacked(
        uint32 packed
    ) internal pure returns (InEuint32 memory encryptedInput) {
        encryptedInput = InEuint32({
            ctHash: uint256(packed), securityZone: 0, utype: Utils.EUINT32_TFHE, signature: hex""
        });
    }
}
