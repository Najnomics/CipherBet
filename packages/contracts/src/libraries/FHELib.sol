// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FHE, InEuint32, ebool, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

library FHELib {
    error FHELib__InvalidHandle();
    error FHELib__DecryptResultNotReady(uint256 requestId);

    function asEuint32AndAllowThis(
        InEuint32 calldata encryptedValue
    ) internal returns (euint32 handle) {
        handle = FHE.asEuint32(encryptedValue);
        if (euint32.unwrap(handle) == bytes32(0)) {
            revert FHELib__InvalidHandle();
        }

        FHE.allowThis(handle);
    }

    function eq(
        euint32 lhs,
        euint32 rhs
    ) internal returns (ebool result) {
        result = FHE.eq(lhs, rhs);
        if (ebool.unwrap(result) == bytes32(0)) {
            revert FHELib__InvalidHandle();
        }
        FHE.allowThis(result);
    }

    function requestDecrypt(
        ebool encryptedBool
    ) internal returns (uint256 requestId) {
        FHE.decrypt(encryptedBool);
        requestId = uint256(ebool.unwrap(encryptedBool));
    }

    function getBoolResultOrRevert(
        ebool encryptedBool
    ) internal view returns (bool value) {
        bool ready;
        (value, ready) = FHE.getDecryptResultSafe(encryptedBool);
        if (!ready) {
            revert FHELib__DecryptResultNotReady(uint256(ebool.unwrap(encryptedBool)));
        }
    }
}
