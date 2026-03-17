// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "openzeppelin-contracts/contracts/access/IAccessControl.sol";
import {ProtocolTreasury} from "src/ProtocolTreasury.sol";

contract ProtocolTreasuryUnitTest is Test {
    ProtocolTreasury internal treasury;

    address internal admin = makeAddr("admin");
    address internal game = makeAddr("game");
    address internal outsider = makeAddr("outsider");
    address internal recipient = makeAddr("recipient");

    function setUp() external {
        treasury = new ProtocolTreasury(admin);
        vm.deal(game, 10 ether);
    }

    function test_SetGameRole_OnlyTreasuryAdmin() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                outsider,
                treasury.TREASURY_ADMIN_ROLE()
            )
        );
        vm.prank(outsider);
        treasury.setGameRole(game, true);
    }

    function test_ReceiveProtocolFee_RequiresGameRole() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, game, treasury.GAME_ROLE()
            )
        );
        vm.prank(game);
        treasury.receiveProtocolFee{value: 1 ether}(1);
    }

    function test_ReceiveProtocolFee_TracksAccrualByGame() external {
        vm.prank(admin);
        treasury.setGameRole(game, true);

        vm.prank(game);
        treasury.receiveProtocolFee{value: 1 ether}(42);

        assertEq(treasury.feesByGame(42), 1 ether);
        assertEq(treasury.totalFeesAccrued(), 1 ether);
        assertEq(address(treasury).balance, 1 ether);
    }

    function test_WithdrawFees_OnlyTreasuryAdmin() external {
        vm.prank(admin);
        treasury.setGameRole(game, true);

        vm.prank(game);
        treasury.receiveProtocolFee{value: 1 ether}(7);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                outsider,
                treasury.TREASURY_ADMIN_ROLE()
            )
        );
        vm.prank(outsider);
        treasury.withdrawFees(payable(recipient), 0.2 ether);
    }

    function test_WithdrawFees_UpdatesAccountingAndTransfers() external {
        vm.prank(admin);
        treasury.setGameRole(game, true);

        vm.prank(game);
        treasury.receiveProtocolFee{value: 1 ether}(99);

        uint256 beforeBalance = recipient.balance;

        vm.prank(admin);
        treasury.withdrawFees(payable(recipient), 0.4 ether);

        assertEq(recipient.balance, beforeBalance + 0.4 ether);
        assertEq(treasury.totalFeesWithdrawn(), 0.4 ether);
        assertEq(address(treasury).balance, 0.6 ether);
    }
}
