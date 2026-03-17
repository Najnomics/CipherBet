// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {ChallengeFactory} from "src/ChallengeFactory.sol";
import {ChallengeGame} from "src/ChallengeGame.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";
import {RulesModule} from "src/RulesModule.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";

/**
 * @notice Deploy with `forge script` and a configured signer account.
 * @dev Use `--account` / `--sender` rather than embedding private keys in scripts.
 */
contract DeployCipherBet is Script {
    function run()
        external
        returns (
            RulesModule rules,
            ProtocolTreasury treasury,
            ChallengeGame game,
            ChallengeFactory factory
        )
    {
        address admin = vm.envAddress("ADMIN_ADDRESS");

        IRulesModule.RulesConfig memory config = IRulesModule.RulesConfig({
            minCreatorStake: vm.envOr("MIN_CREATOR_STAKE_WEI", uint256(0.01 ether)),
            minPlayerStake: vm.envOr("MIN_PLAYER_STAKE_WEI", uint256(0.001 ether)),
            minDurationSeconds: uint64(vm.envOr("MIN_DURATION_SECONDS", uint256(1 hours))),
            maxDurationSeconds: uint64(vm.envOr("MAX_DURATION_SECONDS", uint256(30 days))),
            maxSlashBps: uint16(vm.envOr("MAX_SLASH_BPS", uint256(9_000))),
            maxPayoutBps: uint16(vm.envOr("MAX_PAYOUT_BPS", uint256(5_000))),
            maxAttemptsPerAddressCap: uint32(vm.envOr("MAX_ATTEMPTS_CAP", uint256(100))),
            maxCooldownSeconds: uint64(vm.envOr("MAX_COOLDOWN_SECONDS", uint256(1 hours))),
            requiredSeqLen: uint8(vm.envOr("REQUIRED_SEQ_LEN", uint256(4)))
        });

        vm.startBroadcast();

        rules = new RulesModule(admin, config);
        treasury = new ProtocolTreasury(admin);
        game = new ChallengeGame(admin, address(rules), address(treasury));
        factory = new ChallengeFactory(admin, address(game));

        game.setFactoryRole(address(factory), true);
        treasury.setGameRole(address(game), true);

        vm.stopBroadcast();
    }
}
