// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {CipherBetTypes} from "src/libraries/CipherBetTypes.sol";

interface IChallengeGame {
    function createChallenge(
        address creator,
        CipherBetTypes.GameParams calldata params,
        InEuint32 calldata encryptedSecret
    ) external payable returns (uint256 gameId, uint64 deadline);

    function getGame(
        uint256 gameId
    ) external view returns (CipherBetTypes.Game memory game);
}
