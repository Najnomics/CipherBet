// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Utils} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";
import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "openzeppelin-contracts/contracts/access/IAccessControl.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {MockTaskManager} from "src/mocks/MockTaskManager.sol";

contract ChallengeGameAccessLimitsTest is Test {
    address internal constant TASK_MANAGER_ADDRESS = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;

    ChallengeFactory internal factory;
    ChallengeGame internal game;
    ProtocolTreasury internal treasury;
    RulesModule internal rules;
    MockTaskManager internal taskManager;

    address internal creator = makeAddr("creator");
    address internal player = makeAddr("player");
    address internal outsider = makeAddr("outsider");
    address internal factoryTwo = makeAddr("factoryTwo");

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
    }

    function test_SetFactoryRole_OnlyGameAdmin() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                outsider,
                game.GAME_ADMIN_ROLE()
            )
        );
        vm.prank(outsider);
        game.setFactoryRole(factoryTwo, true);
    }

    function test_SubmitGuess_RevertsWhenCooldownActive() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        params.cooldownSeconds = 1 hours;

        uint256 gameId = _createGame(params, 1234);

        vm.prank(player);
        game.submitGuess{value: params.playerStakeFixed}(gameId, _encryptPacked(9999));

        vm.prank(player);
        vm.expectRevert(ChallengeGame.ChallengeGame__CooldownActive.selector);
        game.submitGuess{value: params.playerStakeFixed}(gameId, _encryptPacked(8888));
    }

    function test_SubmitGuess_RevertsWhenMaxAttemptsReached() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        params.maxAttemptsPerAddress = 1;

        uint256 gameId = _createGame(params, 1111);

        vm.prank(player);
        game.submitGuess{value: params.playerStakeFixed}(gameId, _encryptPacked(2222));

        vm.prank(player);
        vm.expectRevert(ChallengeGame.ChallengeGame__TooManyAttempts.selector);
        game.submitGuess{value: params.playerStakeFixed}(gameId, _encryptPacked(3333));
    }

    function test_CancelChallenge_OnlyCreator() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        uint256 gameId = _createGame(params, 2026);

        vm.prank(outsider);
        vm.expectRevert(ChallengeGame.ChallengeGame__OnlyCreator.selector);
        game.cancelChallenge(gameId);
    }

    function _defaultParams() internal pure returns (CipherBetTypes.GameParams memory params) {
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

    function _createGame(
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
