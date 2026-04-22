// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {InEuint32, euint8, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IChallengeGame} from "src/interfaces/IChallengeGame.sol";
import {IProtocolTreasury} from "src/interfaces/IProtocolTreasury.sol";
import {IRulesModule} from "src/interfaces/IRulesModule.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";
import {FHELib} from "src/libraries/FHELib.sol";

/**
 * @title ChallengeGame
 * @notice Core game engine for encrypted secret guessing and settlement.
 * @custom:security-contact security@cipherbet.xyz
 */
contract ChallengeGame is AccessControl, ReentrancyGuard, IChallengeGame {
    bytes32 public constant GAME_ADMIN_ROLE = keccak256("GAME_ADMIN_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    IRulesModule public immutable i_rulesModule;
    IProtocolTreasury public immutable i_protocolTreasury;

    uint256 public totalCreatorEscrowed;
    uint256 public totalPendingPlayerStake;

    uint256 private s_lastGameId;
    uint256 private s_lastGuessId;

    mapping(uint256 gameId => CipherBetTypes.Game gameData) private s_games;
    mapping(uint256 guessId => CipherBetTypes.Guess guessData) private s_guesses;
    mapping(uint256 gameId => uint256[] guessIds) private s_guessIdsByGame;
    mapping(uint256 gameId => mapping(address player => uint256 attempts)) private
        s_attemptsByGameByPlayer;
    mapping(uint256 gameId => mapping(address player => uint64 lastGuessTimestamp)) private
        s_lastGuessTimestampByGameByPlayer;

    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        uint256 creatorStake,
        uint64 deadline,
        uint256 playerStakeFixed,
        uint16 slashBps,
        uint16 payoutBpsOfCreatorStake
    );
    event GuessSubmitted(
        uint256 indexed gameId,
        uint256 indexed guessId,
        address indexed player,
        uint256 stake,
        uint256 exactMatchesDecryptId,
        uint256 partialMatchesDecryptId
    );
    event GuessResolved(
        uint256 indexed gameId,
        uint256 indexed guessId,
        address indexed player,
        bool won,
        uint8 exactMatches,
        uint8 partialMatches,
        uint256 payout,
        uint256 slash,
        uint256 protocolFee,
        uint256 playerRefund,
        bool resolvedAfterGameSolved
    );
    event GameSolved(
        uint256 indexed gameId, address indexed winner, uint256 payout, uint256 guessId
    );
    event GameExpired(uint256 indexed gameId, uint256 creatorWithdrawal);
    event GameCancelled(uint256 indexed gameId, uint256 creatorWithdrawal);
    event CreatorRemainderWithdrawn(uint256 indexed gameId, uint256 creatorWithdrawal);

    error ChallengeGame__InvalidAdmin();
    error ChallengeGame__InvalidAddress();
    error ChallengeGame__InvalidCreator();
    error ChallengeGame__InvalidGameId();
    error ChallengeGame__InvalidGuessId();
    error ChallengeGame__GameNotActive();
    error ChallengeGame__GameAlreadySolved();
    error ChallengeGame__DeadlinePassed();
    error ChallengeGame__DeadlineNotReached();
    error ChallengeGame__WrongStakeAmount();
    error ChallengeGame__TooManyAttempts();
    error ChallengeGame__CooldownActive();
    error ChallengeGame__GuessNotEvaluating();
    error ChallengeGame__GuessGameMismatch();
    error ChallengeGame__NoGuessesAllowedForCancellation();
    error ChallengeGame__OnlyCreator();
    error ChallengeGame__OutstandingGuesses();
    error ChallengeGame__NoRemainderAvailable();
    error ChallengeGame__EthTransferFailed(address recipient, uint256 amount);

    constructor(
        address admin,
        address rulesModule,
        address protocolTreasury
    ) {
        if (admin == address(0)) {
            revert ChallengeGame__InvalidAdmin();
        }
        if (rulesModule == address(0) || protocolTreasury == address(0)) {
            revert ChallengeGame__InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ADMIN_ROLE, admin);

        i_rulesModule = IRulesModule(rulesModule);
        i_protocolTreasury = IProtocolTreasury(protocolTreasury);
    }

    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                        USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Grants or revokes factory role for challenge creation.
     */
    function setFactoryRole(
        address factory,
        bool enabled
    ) external onlyRole(GAME_ADMIN_ROLE) {
        if (factory == address(0)) {
            revert ChallengeGame__InvalidAddress();
        }

        if (enabled) {
            _grantRole(FACTORY_ROLE, factory);
        } else {
            _revokeRole(FACTORY_ROLE, factory);
        }
    }

    /**
     * @notice Creates a new challenge game using encrypted secret input.
     * @param creator Creator address.
     * @param params Game parameter set.
     * @param encryptedSecret Encrypted packed secret sequence.
     */
    function createChallenge(
        address creator,
        CipherBetTypes.GameParams calldata params,
        InEuint32 calldata encryptedSecret
    ) external payable onlyRole(FACTORY_ROLE) returns (uint256 gameId, uint64 deadline) {
        if (creator == address(0)) {
            revert ChallengeGame__InvalidCreator();
        }

        i_rulesModule.validateGameParams(params, msg.value);

        gameId = ++s_lastGameId;
        deadline = uint64(block.timestamp) + params.durationSeconds;

        euint32 secretHandle = FHELib.asEuint32AndAllowThis(encryptedSecret);

        CipherBetTypes.Game storage gameData = s_games[gameId];
        gameData.creator = creator;
        gameData.creatorStakeEscrowed = msg.value;
        gameData.playerStakeFixed = params.playerStakeFixed;
        gameData.slashBps = params.slashBps;
        gameData.creatorCutBps = params.creatorCutBps;
        gameData.protocolCutBps = params.protocolCutBps;
        gameData.payoutBpsOfCreatorStake = params.payoutBpsOfCreatorStake;
        gameData.seqLen = params.seqLen;
        gameData.secretHandle = secretHandle;
        gameData.deadline = deadline;
        gameData.active = true;
        gameData.maxAttemptsPerAddress = params.maxAttemptsPerAddress;
        gameData.cooldownSeconds = params.cooldownSeconds;

        totalCreatorEscrowed += msg.value;

        emit GameCreated(
            gameId,
            creator,
            msg.value,
            deadline,
            params.playerStakeFixed,
            params.slashBps,
            params.payoutBpsOfCreatorStake
        );
    }

    /**
     * @notice Submits an encrypted guess and stake.
     * @param gameId Game identifier.
     * @param encryptedGuess Encrypted packed guess.
     */
    function submitGuess(
        uint256 gameId,
        InEuint32 calldata encryptedGuess
    ) external payable nonReentrant returns (uint256 guessId) {
        CipherBetTypes.Game storage gameData = s_games[gameId];
        if (gameData.creator == address(0)) {
            revert ChallengeGame__InvalidGameId();
        }
        if (!gameData.active) {
            revert ChallengeGame__GameNotActive();
        }
        if (gameData.solved) {
            revert ChallengeGame__GameAlreadySolved();
        }
        if (block.timestamp >= gameData.deadline) {
            revert ChallengeGame__DeadlinePassed();
        }
        if (msg.value != gameData.playerStakeFixed) {
            revert ChallengeGame__WrongStakeAmount();
        }

        uint256 attempts = s_attemptsByGameByPlayer[gameId][msg.sender];
        if (attempts >= gameData.maxAttemptsPerAddress) {
            revert ChallengeGame__TooManyAttempts();
        }

        uint64 lastGuessTimestamp = s_lastGuessTimestampByGameByPlayer[gameId][msg.sender];
        if (
            gameData.cooldownSeconds != 0 && lastGuessTimestamp != 0
                && block.timestamp < uint256(lastGuessTimestamp) + gameData.cooldownSeconds
        ) {
            revert ChallengeGame__CooldownActive();
        }

        euint32 guessHandle = FHELib.asEuint32AndAllowThis(encryptedGuess);
        (euint8 exactMatchesEnc, euint8 partialMatchesEnc) =
            FHELib.scoreMastermind(gameData.secretHandle, guessHandle, gameData.seqLen);
        uint256 exactMatchesDecryptId = FHELib.requestDecrypt(exactMatchesEnc);
        uint256 partialMatchesDecryptId = FHELib.requestDecrypt(partialMatchesEnc);

        guessId = ++s_lastGuessId;
        CipherBetTypes.Guess storage guessData = s_guesses[guessId];
        guessData.player = msg.sender;
        guessData.gameId = gameId;
        guessData.stake = msg.value;
        guessData.guessHandle = guessHandle;
        guessData.exactMatchesEnc = exactMatchesEnc;
        guessData.partialMatchesEnc = partialMatchesEnc;
        guessData.state = CipherBetTypes.GuessState.EVALUATING;
        guessData.timestamp = block.timestamp;

        s_guessIdsByGame[gameId].push(guessId);

        gameData.totalPlayerStaked += msg.value;
        gameData.attemptCount += 1;
        gameData.unresolvedGuesses += 1;
        gameData.hasGuesses = true;

        s_attemptsByGameByPlayer[gameId][msg.sender] = attempts + 1;
        s_lastGuessTimestampByGameByPlayer[gameId][msg.sender] = uint64(block.timestamp);

        totalPendingPlayerStake += msg.value;

        emit GuessSubmitted(
            gameId,
            guessId,
            msg.sender,
            msg.value,
            exactMatchesDecryptId,
            partialMatchesDecryptId
        );
    }

    /**
     * @notice Finalizes a submitted guess once decrypt result is ready.
     * @param gameId Game identifier.
     * @param guessId Guess identifier.
     */
    function finalizeGuess(
        uint256 gameId,
        uint256 guessId
    ) external nonReentrant {
        CipherBetTypes.Guess storage guessData = s_guesses[guessId];
        if (guessData.player == address(0)) {
            revert ChallengeGame__InvalidGuessId();
        }
        if (guessData.gameId != gameId) {
            revert ChallengeGame__GuessGameMismatch();
        }
        if (guessData.state != CipherBetTypes.GuessState.EVALUATING) {
            revert ChallengeGame__GuessNotEvaluating();
        }

        CipherBetTypes.Game storage gameData = s_games[gameId];
        uint8 exactMatches = FHELib.getUint8ResultOrRevert(guessData.exactMatchesEnc);
        uint8 partialMatches = FHELib.getUint8ResultOrRevert(guessData.partialMatchesEnc);
        bool win = exactMatches == gameData.seqLen;

        guessData.state = CipherBetTypes.GuessState.FINALIZED;
        guessData.exactMatches = exactMatches;
        guessData.partialMatches = partialMatches;
        gameData.unresolvedGuesses -= 1;
        totalPendingPlayerStake -= guessData.stake;

        if (gameData.solved) {
            _safeTransferEth(payable(guessData.player), guessData.stake);
            emit GuessResolved(
                gameId,
                guessId,
                guessData.player,
                false,
                exactMatches,
                partialMatches,
                0,
                0,
                0,
                guessData.stake,
                true
            );
            return;
        }

        if (win) {
            _settleWin(gameData, gameId, guessId, guessData, exactMatches, partialMatches);
            return;
        }

        _settleLoss(gameData, gameId, guessId, guessData, exactMatches, partialMatches);
    }

    /**
     * @notice Cancels an unfunded-by-players game before first guess.
     */
    function cancelChallenge(
        uint256 gameId
    ) external nonReentrant {
        CipherBetTypes.Game storage gameData = s_games[gameId];
        if (gameData.creator == address(0)) {
            revert ChallengeGame__InvalidGameId();
        }
        if (msg.sender != gameData.creator) {
            revert ChallengeGame__OnlyCreator();
        }
        if (!gameData.active) {
            revert ChallengeGame__GameNotActive();
        }
        if (gameData.solved) {
            revert ChallengeGame__GameAlreadySolved();
        }
        if (gameData.hasGuesses) {
            revert ChallengeGame__NoGuessesAllowedForCancellation();
        }

        gameData.active = false;

        uint256 creatorWithdrawal = gameData.creatorStakeEscrowed;
        gameData.creatorStakeEscrowed = 0;
        totalCreatorEscrowed -= creatorWithdrawal;

        _safeTransferEth(payable(gameData.creator), creatorWithdrawal);
        emit GameCancelled(gameId, creatorWithdrawal);
    }

    /**
     * @notice Lets creator reclaim escrow after deadline if unresolved guesses are zero.
     */
    function reclaimExpired(
        uint256 gameId
    ) external nonReentrant {
        CipherBetTypes.Game storage gameData = s_games[gameId];
        if (gameData.creator == address(0)) {
            revert ChallengeGame__InvalidGameId();
        }
        if (msg.sender != gameData.creator) {
            revert ChallengeGame__OnlyCreator();
        }
        if (!gameData.active) {
            revert ChallengeGame__GameNotActive();
        }
        if (gameData.solved) {
            revert ChallengeGame__GameAlreadySolved();
        }
        if (block.timestamp < gameData.deadline) {
            revert ChallengeGame__DeadlineNotReached();
        }
        if (gameData.unresolvedGuesses != 0) {
            revert ChallengeGame__OutstandingGuesses();
        }

        gameData.active = false;

        uint256 creatorWithdrawal = gameData.creatorStakeEscrowed;
        gameData.creatorStakeEscrowed = 0;
        totalCreatorEscrowed -= creatorWithdrawal;

        _safeTransferEth(payable(gameData.creator), creatorWithdrawal);
        emit GameExpired(gameId, creatorWithdrawal);
    }

    /**
     * @notice Withdraws remaining creator escrow after solved game is fully finalized.
     */
    function withdrawSolvedRemainder(
        uint256 gameId
    ) external nonReentrant {
        CipherBetTypes.Game storage gameData = s_games[gameId];
        if (gameData.creator == address(0)) {
            revert ChallengeGame__InvalidGameId();
        }
        if (msg.sender != gameData.creator) {
            revert ChallengeGame__OnlyCreator();
        }
        if (!gameData.solved) {
            revert ChallengeGame__GameNotActive();
        }
        if (gameData.unresolvedGuesses != 0) {
            revert ChallengeGame__OutstandingGuesses();
        }

        uint256 creatorWithdrawal = gameData.creatorStakeEscrowed;
        if (creatorWithdrawal == 0) {
            revert ChallengeGame__NoRemainderAvailable();
        }

        gameData.creatorStakeEscrowed = 0;
        totalCreatorEscrowed -= creatorWithdrawal;

        _safeTransferEth(payable(gameData.creator), creatorWithdrawal);
        emit CreatorRemainderWithdrawn(gameId, creatorWithdrawal);
    }

    /*//////////////////////////////////////////////////////////////
                         USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns game storage snapshot.
     */
    function getGame(
        uint256 gameId
    ) external view returns (CipherBetTypes.Game memory game) {
        game = s_games[gameId];
    }

    /**
     * @notice Returns guess storage snapshot.
     */
    function getGuess(
        uint256 guessId
    ) external view returns (CipherBetTypes.Guess memory guess) {
        guess = s_guesses[guessId];
    }

    /**
     * @notice Returns all guess IDs associated with a game.
     */
    function getGuessIdsForGame(
        uint256 gameId
    ) external view returns (uint256[] memory guessIds) {
        guessIds = s_guessIdsByGame[gameId];
    }

    /**
     * @notice Returns number of attempts from player for a given game.
     */
    function getAttemptCount(
        uint256 gameId,
        address player
    ) external view returns (uint256 attempts) {
        attempts = s_attemptsByGameByPlayer[gameId][player];
    }

    /**
     * @notice Returns latest guess timestamp from player for a given game.
     */
    function getLastGuessTimestamp(
        uint256 gameId,
        address player
    ) external view returns (uint64 timestamp) {
        timestamp = s_lastGuessTimestampByGameByPlayer[gameId][player];
    }

    /**
     * @notice Returns aggregate liability information for invariant checks.
     */
    function getLiabilitySnapshot()
        external
        view
        returns (
            uint256 creatorEscrow,
            uint256 pendingPlayerStakes,
            uint256 expectedMinimumBalance,
            uint256 onchainBalance
        )
    {
        creatorEscrow = totalCreatorEscrowed;
        pendingPlayerStakes = totalPendingPlayerStake;
        expectedMinimumBalance = creatorEscrow + pendingPlayerStakes;
        onchainBalance = address(this).balance;
    }

    /**
     * @notice Returns latest game ID.
     */
    function getLastGameId() external view returns (uint256 lastGameId) {
        lastGameId = s_lastGameId;
    }

    /**
     * @notice Returns latest guess ID.
     */
    function getLastGuessId() external view returns (uint256 lastGuessId) {
        lastGuessId = s_lastGuessId;
    }

    /*//////////////////////////////////////////////////////////////
                     INTERNAL STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _settleWin(
        CipherBetTypes.Game storage gameData,
        uint256 gameId,
        uint256 guessId,
        CipherBetTypes.Guess storage guessData,
        uint8 exactMatches,
        uint8 partialMatches
    ) internal {
        uint256 payout = (gameData.creatorStakeEscrowed * uint256(gameData.payoutBpsOfCreatorStake))
            / CipherBetTypes.BPS_DENOMINATOR;

        gameData.creatorStakeEscrowed -= payout;
        totalCreatorEscrowed -= payout;

        gameData.solved = true;
        gameData.active = false;

        uint256 winnerTransfer = payout + guessData.stake;
        _safeTransferEth(payable(guessData.player), winnerTransfer);

        emit GameSolved(gameId, guessData.player, payout, guessId);
        emit GuessResolved(
            gameId,
            guessId,
            guessData.player,
            true,
            exactMatches,
            partialMatches,
            payout,
            0,
            0,
            guessData.stake,
            false
        );
    }

    function _settleLoss(
        CipherBetTypes.Game storage gameData,
        uint256 gameId,
        uint256 guessId,
        CipherBetTypes.Guess storage guessData,
        uint8 exactMatches,
        uint8 partialMatches
    ) internal {
        uint256 slash =
            (guessData.stake * uint256(gameData.slashBps)) / CipherBetTypes.BPS_DENOMINATOR;
        uint256 creatorShare =
            (slash * uint256(gameData.creatorCutBps)) / CipherBetTypes.BPS_DENOMINATOR;
        uint256 protocolFee = slash - creatorShare;
        uint256 playerRefund = guessData.stake - slash;

        gameData.creatorStakeEscrowed += creatorShare;
        totalCreatorEscrowed += creatorShare;
        gameData.protocolFeesAccrued += protocolFee;

        if (protocolFee != 0) {
            i_protocolTreasury.receiveProtocolFee{value: protocolFee}(gameId);
        }

        if (playerRefund != 0) {
            _safeTransferEth(payable(guessData.player), playerRefund);
        }

        emit GuessResolved(
            gameId,
            guessId,
            guessData.player,
            false,
            exactMatches,
            partialMatches,
            0,
            slash,
            protocolFee,
            playerRefund,
            false
        );
    }

    function _safeTransferEth(
        address payable recipient,
        uint256 amount
    ) internal {
        if (amount == 0) {
            return;
        }

        (bool success,) = recipient.call{value: amount}("");
        if (!success) {
            revert ChallengeGame__EthTransferFailed(recipient, amount);
        }
    }
}
