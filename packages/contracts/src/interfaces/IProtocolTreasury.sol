// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IProtocolTreasury {
    function receiveProtocolFee(
        uint256 gameId
    ) external payable;
}
