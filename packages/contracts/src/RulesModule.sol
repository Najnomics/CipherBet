// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";

/**
 * @title RulesModule
 * @notice Centralized parameter guardrails for all CipherBet games.
 * @custom:security-contact security@cipherbet.xyz
 */
contract RulesModule is AccessControl, IRulesModule {
    bytes32 public constant RULES_ADMIN_ROLE = keccak256("RULES_ADMIN_ROLE");

    RulesConfig private s_ruleConfig;

    event RuleConfigUpdated(RulesConfig oldConfig, RulesConfig newConfig);

    error RulesModule__InvalidAdmin();
    error RulesModule__InvalidCreatorStake();
    error RulesModule__InvalidPlayerStake();
    error RulesModule__InvalidDuration();
    error RulesModule__InvalidSlashBps();
    error RulesModule__InvalidPayoutBps();
    error RulesModule__InvalidBpsSplit();
    error RulesModule__InvalidSequenceLength();
    error RulesModule__InvalidAttemptLimit();
    error RulesModule__InvalidCooldown();
    error RulesModule__InvalidBoundConfiguration();

    constructor(
        address admin,
        RulesConfig memory initialConfig
    ) {
        if (admin == address(0)) {
            revert RulesModule__InvalidAdmin();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RULES_ADMIN_ROLE, admin);
        _setRuleConfig(initialConfig);
    }

    /*//////////////////////////////////////////////////////////////
                        USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Updates global guardrails for newly created challenges.
     * @param newConfig New rules configuration.
     */
    function setRuleConfig(
        RulesConfig calldata newConfig
    ) external onlyRole(RULES_ADMIN_ROLE) {
        RulesConfig memory previous = s_ruleConfig;
        _setRuleConfig(newConfig);
        emit RuleConfigUpdated(previous, newConfig);
    }

    /*//////////////////////////////////////////////////////////////
                         USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates game params; reverts when any guardrail is broken.
     * @param params Challenge parameters.
     * @param creatorStake ETH value provided for creator escrow.
     */
    function validateGameParams(
        CipherBetTypes.GameParams calldata params,
        uint256 creatorStake
    ) external view {
        RulesConfig memory config = s_ruleConfig;

        if (creatorStake != params.creatorStake || creatorStake < config.minCreatorStake) {
            revert RulesModule__InvalidCreatorStake();
        }
        if (params.playerStakeFixed < config.minPlayerStake) {
            revert RulesModule__InvalidPlayerStake();
        }
        if (
            params.durationSeconds < config.minDurationSeconds
                || params.durationSeconds > config.maxDurationSeconds
        ) {
            revert RulesModule__InvalidDuration();
        }
        if (
            params.slashBps > config.maxSlashBps || params.slashBps > CipherBetTypes.BPS_DENOMINATOR
        ) {
            revert RulesModule__InvalidSlashBps();
        }
        if (
            params.payoutBpsOfCreatorStake > config.maxPayoutBps
                || params.payoutBpsOfCreatorStake > CipherBetTypes.BPS_DENOMINATOR
        ) {
            revert RulesModule__InvalidPayoutBps();
        }
        if (
            uint256(params.creatorCutBps) + uint256(params.protocolCutBps)
                != CipherBetTypes.BPS_DENOMINATOR
        ) {
            revert RulesModule__InvalidBpsSplit();
        }
        if (params.seqLen != config.requiredSeqLen) {
            revert RulesModule__InvalidSequenceLength();
        }
        if (
            params.maxAttemptsPerAddress == 0
                || params.maxAttemptsPerAddress > config.maxAttemptsPerAddressCap
        ) {
            revert RulesModule__InvalidAttemptLimit();
        }
        if (params.cooldownSeconds > config.maxCooldownSeconds) {
            revert RulesModule__InvalidCooldown();
        }
    }

    /**
     * @notice Returns active rules config.
     */
    function getRuleConfig() external view returns (RulesConfig memory config) {
        config = s_ruleConfig;
    }

    /*//////////////////////////////////////////////////////////////
                     INTERNAL STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _setRuleConfig(
        RulesConfig memory newConfig
    ) internal {
        if (
            newConfig.minDurationSeconds == 0
                || newConfig.minDurationSeconds > newConfig.maxDurationSeconds
                || newConfig.maxSlashBps > CipherBetTypes.BPS_DENOMINATOR
                || newConfig.maxPayoutBps > CipherBetTypes.BPS_DENOMINATOR
                || newConfig.maxAttemptsPerAddressCap == 0 || newConfig.requiredSeqLen == 0
        ) {
            revert RulesModule__InvalidBoundConfiguration();
        }

        s_ruleConfig = newConfig;
    }
}
