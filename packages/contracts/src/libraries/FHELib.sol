// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FHE, InEuint32, ebool, euint8, euint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

library FHELib {
    error FHELib__InvalidHandle();
    error FHELib__DecryptResultNotReady(uint256 requestId);

    uint8 internal constant MAX_SEQ_LEN = 4;

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

    function requestDecrypt(
        euint8 encryptedUint
    ) internal returns (uint256 requestId) {
        FHE.decrypt(encryptedUint);
        requestId = uint256(euint8.unwrap(encryptedUint));
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

    function getUint8ResultOrRevert(
        euint8 encryptedUint
    ) internal view returns (uint8 value) {
        bool ready;
        (value, ready) = FHE.getDecryptResultSafe(encryptedUint);
        if (!ready) {
            revert FHELib__DecryptResultNotReady(uint256(euint8.unwrap(encryptedUint)));
        }
    }

    function scoreMastermind(
        euint32 secretHandle,
        euint32 guessHandle,
        uint8 seqLen
    ) internal returns (euint8 exactMatches, euint8 partialMatches) {
        euint32[MAX_SEQ_LEN] memory secretDigits = _extractDigits(secretHandle);
        euint32[MAX_SEQ_LEN] memory guessDigits = _extractDigits(guessHandle);

        exactMatches = FHE.asEuint8(0);
        for (uint8 i = 0; i < seqLen; i++) {
            ebool isExact = FHE.eq(secretDigits[i], guessDigits[i]);
            FHE.allowThis(isExact);
            exactMatches = FHE.add(
                exactMatches,
                FHE.select(isExact, FHE.asEuint8(1), FHE.asEuint8(0))
            );
        }

        euint8 sharedDigits = FHE.asEuint8(0);
        for (uint8 digit = 0; digit < 10; digit++) {
            euint8 secretCount = _countDigit(secretDigits, seqLen, digit);
            euint8 guessCount = _countDigit(guessDigits, seqLen, digit);
            ebool useSecretCount = FHE.lte(secretCount, guessCount);
            FHE.allowThis(useSecretCount);
            sharedDigits = FHE.add(
                sharedDigits,
                FHE.select(useSecretCount, secretCount, guessCount)
            );
        }

        partialMatches = FHE.sub(sharedDigits, exactMatches);

        FHE.allowThis(exactMatches);
        FHE.allowThis(partialMatches);
    }

    function _extractDigits(
        euint32 packedValue
    ) private returns (euint32[MAX_SEQ_LEN] memory digits) {
        euint32 working = packedValue;
        euint32 ten = FHE.asEuint32(10);

        for (uint8 i = 0; i < MAX_SEQ_LEN; i++) {
            digits[i] = FHE.rem(working, ten);
            FHE.allowThis(digits[i]);
            working = FHE.div(working, ten);
            FHE.allowThis(working);
        }
    }

    function _countDigit(
        euint32[MAX_SEQ_LEN] memory digits,
        uint8 seqLen,
        uint8 digit
    ) private returns (euint8 count) {
        count = FHE.asEuint8(0);
        euint32 digitValue = FHE.asEuint32(digit);

        for (uint8 i = 0; i < seqLen; i++) {
            ebool matches = FHE.eq(digits[i], digitValue);
            FHE.allowThis(matches);
            count = FHE.add(
                count,
                FHE.select(matches, FHE.asEuint8(1), FHE.asEuint8(0))
            );
        }
    }
}
