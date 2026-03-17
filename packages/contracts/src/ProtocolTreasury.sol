// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IProtocolTreasury} from "src/interfaces/IProtocolTreasury.sol";

/**
 * @title ProtocolTreasury
 * @notice Collects protocol fees from slash events and supports controlled withdrawals.
 * @custom:security-contact security@cipherbet.xyz
 */
contract ProtocolTreasury is AccessControl, ReentrancyGuard, IProtocolTreasury {
    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    uint256 public totalFeesAccrued;
    uint256 public totalFeesWithdrawn;

    mapping(uint256 gameId => uint256 feesAccrued) public feesByGame;

    event GameRoleUpdated(address indexed gameContract, bool enabled);
    event ProtocolFeeReceived(uint256 indexed gameId, uint256 amount, uint256 newTotalFeesAccrued);
    event TreasuryWithdrawal(address indexed to, uint256 amount, uint256 totalFeesWithdrawn);

    error ProtocolTreasury__InvalidAdmin();
    error ProtocolTreasury__InvalidAddress();
    error ProtocolTreasury__ZeroAmount();
    error ProtocolTreasury__InsufficientBalance();
    error ProtocolTreasury__TransferFailed();

    constructor(
        address admin
    ) {
        if (admin == address(0)) {
            revert ProtocolTreasury__InvalidAdmin();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
    }

    /*//////////////////////////////////////////////////////////////
                        USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Grants or revokes fee-sender permission for a game contract.
     */
    function setGameRole(
        address gameContract,
        bool enabled
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (gameContract == address(0)) {
            revert ProtocolTreasury__InvalidAddress();
        }

        if (enabled) {
            _grantRole(GAME_ROLE, gameContract);
        } else {
            _revokeRole(GAME_ROLE, gameContract);
        }

        emit GameRoleUpdated(gameContract, enabled);
    }

    /**
     * @notice Records protocol fees for a given game.
     * @dev Only callable by authorized game contracts.
     */
    function receiveProtocolFee(
        uint256 gameId
    ) external payable onlyRole(GAME_ROLE) {
        if (msg.value == 0) {
            revert ProtocolTreasury__ZeroAmount();
        }

        feesByGame[gameId] += msg.value;
        totalFeesAccrued += msg.value;

        emit ProtocolFeeReceived(gameId, msg.value, totalFeesAccrued);
    }

    /**
     * @notice Withdraws treasury funds.
     */
    function withdrawFees(
        address payable to,
        uint256 amount
    ) external nonReentrant onlyRole(TREASURY_ADMIN_ROLE) {
        if (to == address(0)) {
            revert ProtocolTreasury__InvalidAddress();
        }
        if (amount == 0) {
            revert ProtocolTreasury__ZeroAmount();
        }
        if (amount > address(this).balance) {
            revert ProtocolTreasury__InsufficientBalance();
        }

        totalFeesWithdrawn += amount;

        (bool success,) = to.call{value: amount}("");
        if (!success) {
            revert ProtocolTreasury__TransferFailed();
        }

        emit TreasuryWithdrawal(to, amount, totalFeesWithdrawn);
    }
}
