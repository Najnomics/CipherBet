// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IChallengeGame} from "src/interfaces/IChallengeGame.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";

/**
 * @title ChallengeFactory
 * @notice Creates and indexes CipherBet game rooms.
 * @custom:security-contact security@cipherbet.xyz
 */
contract ChallengeFactory is AccessControl, ReentrancyGuard {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");

    IChallengeGame public immutable i_challengeGame;

    struct ChallengeMeta {
        address creator;
        uint64 createdAt;
        uint64 deadline;
        bool exists;
    }

    mapping(uint256 gameId => ChallengeMeta meta) private s_challengeMeta;
    mapping(address creator => uint256[] gameIds) private s_gameIdsByCreator;
    uint256[] private s_allGameIds;

    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        uint256 creatorStake,
        uint64 deadline,
        uint256 playerStakeFixed,
        uint16 slashBps
    );

    error ChallengeFactory__InvalidAdmin();
    error ChallengeFactory__InvalidAddress();
    error ChallengeFactory__UnknownGameId();

    constructor(
        address admin,
        address challengeGame
    ) {
        if (admin == address(0)) {
            revert ChallengeFactory__InvalidAdmin();
        }
        if (challengeGame == address(0)) {
            revert ChallengeFactory__InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FACTORY_ADMIN_ROLE, admin);

        i_challengeGame = IChallengeGame(challengeGame);
    }

    /*//////////////////////////////////////////////////////////////
                        USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a challenge room with encrypted secret and creator escrow.
     */
    function createChallenge(
        CipherBetTypes.GameParams calldata params,
        InEuint32 calldata encryptedSecret
    ) external payable nonReentrant returns (uint256 gameId) {
        uint64 deadline;
        (gameId, deadline) =
            i_challengeGame.createChallenge{value: msg.value}(msg.sender, params, encryptedSecret);

        s_challengeMeta[gameId] = ChallengeMeta({
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            deadline: deadline,
            exists: true
        });

        s_gameIdsByCreator[msg.sender].push(gameId);
        s_allGameIds.push(gameId);

        emit GameCreated(
            gameId, msg.sender, msg.value, deadline, params.playerStakeFixed, params.slashBps
        );
    }

    /*//////////////////////////////////////////////////////////////
                         USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns challenge metadata.
     */
    function getChallengeMeta(
        uint256 gameId
    ) external view returns (ChallengeMeta memory meta) {
        meta = s_challengeMeta[gameId];
        if (!meta.exists) {
            revert ChallengeFactory__UnknownGameId();
        }
    }

    /**
     * @notice Returns all challenge IDs.
     */
    function getAllGameIds() external view returns (uint256[] memory gameIds) {
        gameIds = s_allGameIds;
    }

    /**
     * @notice Returns challenge IDs created by a given address.
     */
    function getGameIdsByCreator(
        address creator
    ) external view returns (uint256[] memory gameIds) {
        gameIds = s_gameIdsByCreator[creator];
    }
}
