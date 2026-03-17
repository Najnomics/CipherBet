// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "openzeppelin-contracts/contracts/access/IAccessControl.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";

contract RulesModuleUnitTest is Test {
    RulesModule internal rules;

    address internal admin = makeAddr("admin");
    address internal outsider = makeAddr("outsider");

    function setUp() external {
        rules = new RulesModule(admin, _ruleConfig());
    }

    function test_ValidateGameParams_SucceedsForValidValues() external view {
        CipherBetTypes.GameParams memory params = _defaultParams();
        rules.validateGameParams(params, params.creatorStake);
    }

    function test_ValidateGameParams_RevertsOnInvalidBpsSplit() external {
        CipherBetTypes.GameParams memory params = _defaultParams();
        params.protocolCutBps = 2_500;

        vm.expectRevert(RulesModule.RulesModule__InvalidBpsSplit.selector);
        rules.validateGameParams(params, params.creatorStake);
    }

    function test_ValidateGameParams_RevertsWhenCreatorStakeMismatched() external {
        CipherBetTypes.GameParams memory params = _defaultParams();

        vm.expectRevert(RulesModule.RulesModule__InvalidCreatorStake.selector);
        rules.validateGameParams(params, params.creatorStake - 1);
    }

    function test_SetRuleConfig_OnlyRulesAdmin() external {
        IRulesModule.RulesConfig memory cfg = _ruleConfig();
        cfg.maxCooldownSeconds = 3 hours;

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                outsider,
                rules.RULES_ADMIN_ROLE()
            )
        );
        vm.prank(outsider);
        rules.setRuleConfig(cfg);
    }

    function test_SetRuleConfig_RevertsOnInvalidBounds() external {
        IRulesModule.RulesConfig memory cfg = _ruleConfig();
        cfg.minDurationSeconds = 8 days;
        cfg.maxDurationSeconds = 7 days;

        vm.prank(admin);
        vm.expectRevert(RulesModule.RulesModule__InvalidBoundConfiguration.selector);
        rules.setRuleConfig(cfg);
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
}
