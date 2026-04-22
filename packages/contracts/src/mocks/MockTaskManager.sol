// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {
    EncryptedInput,
    FunctionId,
    ITaskManager,
    Utils
} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

/**
 * @title MockTaskManager
 * @notice Local deterministic mock for CoFHE task manager interactions.
 */
contract MockTaskManager is ITaskManager {
    uint256 private s_nextHandleNonce = 1;

    mapping(uint256 handle => uint256 value) private s_uintByHandle;
    mapping(uint256 handle => bool value) private s_boolByHandle;
    mapping(uint256 handle => bool isBoolHandle) private s_isBoolHandle;

    mapping(uint256 ctHash => bool requested) private s_decryptRequested;
    mapping(uint256 ctHash => bool ready) private s_decryptReady;
    mapping(uint256 ctHash => uint256 result) private s_decryptResult;

    mapping(uint256 ctHash => mapping(address account => bool allowed)) private s_allowed;
    mapping(uint256 ctHash => bool publicAllowed) private s_publicAllowed;

    error MockTaskManager__UnsupportedOp(FunctionId functionId);
    error MockTaskManager__DecryptNotReady(uint256 ctHash);

    function createTask(
        uint8 returnType,
        FunctionId funcId,
        uint256[] memory encryptedInputs,
        uint256[] memory extraInputs
    ) external returns (uint256 handle) {
        if (funcId == FunctionId.eq) {
            bool isEqual = s_uintByHandle[encryptedInputs[0]] == s_uintByHandle[encryptedInputs[1]];
            handle = _newHandle();
            s_isBoolHandle[handle] = true;
            s_boolByHandle[handle] = isEqual;
            return handle;
        }

        if (funcId == FunctionId.select) {
            bool condition = s_boolByHandle[encryptedInputs[0]];
            handle = _newHandle();
            if (returnType == Utils.EBOOL_TFHE) {
                s_isBoolHandle[handle] = true;
                s_boolByHandle[handle] =
                    condition ? _boolForHandle(encryptedInputs[1]) : _boolForHandle(encryptedInputs[2]);
            } else {
                s_uintByHandle[handle] =
                    condition ? s_uintByHandle[encryptedInputs[1]] : s_uintByHandle[encryptedInputs[2]];
            }
            return handle;
        }

        if (funcId == FunctionId.trivialEncrypt) {
            handle = _newHandle();
            if (returnType == Utils.EBOOL_TFHE) {
                s_isBoolHandle[handle] = true;
                s_boolByHandle[handle] = (extraInputs[0] & 1) == 1;
            } else {
                s_uintByHandle[handle] = extraInputs[0];
            }
            return handle;
        }

        if (funcId == FunctionId.cast) {
            handle = _newHandle();
            if (returnType == Utils.EBOOL_TFHE) {
                s_isBoolHandle[handle] = true;
                s_boolByHandle[handle] = _boolForHandle(encryptedInputs[0]);
            } else {
                s_uintByHandle[handle] = _uintForHandle(encryptedInputs[0]);
            }
            return handle;
        }

        if (funcId == FunctionId.add) {
            handle = _newHandle();
            s_uintByHandle[handle] = _uintForHandle(encryptedInputs[0]) + _uintForHandle(encryptedInputs[1]);
            return handle;
        }

        if (funcId == FunctionId.sub) {
            handle = _newHandle();
            s_uintByHandle[handle] = _uintForHandle(encryptedInputs[0]) - _uintForHandle(encryptedInputs[1]);
            return handle;
        }

        if (funcId == FunctionId.div) {
            handle = _newHandle();
            s_uintByHandle[handle] = _uintForHandle(encryptedInputs[0]) / _uintForHandle(encryptedInputs[1]);
            return handle;
        }

        if (funcId == FunctionId.rem) {
            handle = _newHandle();
            s_uintByHandle[handle] = _uintForHandle(encryptedInputs[0]) % _uintForHandle(encryptedInputs[1]);
            return handle;
        }

        if (funcId == FunctionId.lte) {
            handle = _newHandle();
            s_isBoolHandle[handle] = true;
            s_boolByHandle[handle] =
                _uintForHandle(encryptedInputs[0]) <= _uintForHandle(encryptedInputs[1]);
            return handle;
        }

        if (encryptedInputs.length == 0) {
            revert MockTaskManager__UnsupportedOp(funcId);
        }

        handle = _newHandle();
        if (returnType == Utils.EBOOL_TFHE) {
            s_isBoolHandle[handle] = true;
            s_boolByHandle[handle] = s_boolByHandle[encryptedInputs[0]];
        } else {
            s_uintByHandle[handle] = s_uintByHandle[encryptedInputs[0]];
        }
    }

    function createRandomTask(
        uint8,
        uint256 seed,
        int32
    ) external returns (uint256 handle) {
        handle = _newHandle();
        s_uintByHandle[handle] = uint256(keccak256(abi.encode(seed, handle)));
    }

    function createDecryptTask(
        uint256 ctHash,
        address
    ) external {
        s_decryptRequested[ctHash] = true;
        if (!s_decryptReady[ctHash]) {
            s_decryptReady[ctHash] = true;
        }
        s_decryptResult[ctHash] = _resultForHandle(ctHash);
    }

    function verifyInput(
        EncryptedInput memory input,
        address
    ) external returns (uint256 handle) {
        handle = input.ctHash;
        if (handle == 0) {
            handle = _newHandle();
        }

        if (input.utype == Utils.EBOOL_TFHE) {
            s_isBoolHandle[handle] = true;
            s_boolByHandle[handle] = (input.ctHash & 1) == 1;
        } else {
            s_uintByHandle[handle] = input.ctHash;
        }
    }

    function allow(
        uint256 ctHash,
        address account
    ) external {
        s_allowed[ctHash][account] = true;
    }

    function isAllowed(
        uint256 ctHash,
        address account
    ) external view returns (bool) {
        return s_allowed[ctHash][account] || s_publicAllowed[ctHash];
    }

    function isPubliclyAllowed(
        uint256 ctHash
    ) external view returns (bool) {
        return s_publicAllowed[ctHash];
    }

    function allowGlobal(
        uint256 ctHash
    ) external {
        s_publicAllowed[ctHash] = true;
    }

    function allowTransient(
        uint256 ctHash,
        address account
    ) external {
        s_allowed[ctHash][account] = true;
    }

    function getDecryptResultSafe(
        uint256 ctHash
    ) external view returns (uint256 result, bool decrypted) {
        if (!s_decryptRequested[ctHash]) {
            return (0, false);
        }
        if (!s_decryptReady[ctHash]) {
            return (0, false);
        }

        return (s_decryptResult[ctHash], true);
    }

    function getDecryptResult(
        uint256 ctHash
    ) external view returns (uint256) {
        if (!s_decryptRequested[ctHash] || !s_decryptReady[ctHash]) {
            revert MockTaskManager__DecryptNotReady(ctHash);
        }
        return s_decryptResult[ctHash];
    }

    function publishDecryptResult(
        uint256 ctHash,
        uint256 result,
        bytes calldata
    ) external {
        s_decryptRequested[ctHash] = true;
        s_decryptReady[ctHash] = true;
        s_decryptResult[ctHash] = result;
    }

    function publishDecryptResultBatch(
        uint256[] calldata ctHashes,
        uint256[] calldata results,
        bytes[] calldata
    ) external {
        uint256 len = ctHashes.length;
        for (uint256 i = 0; i < len; ++i) {
            s_decryptRequested[ctHashes[i]] = true;
            s_decryptReady[ctHashes[i]] = true;
            s_decryptResult[ctHashes[i]] = results[i];
        }
    }

    function verifyDecryptResult(
        uint256 ctHash,
        uint256 result,
        bytes calldata
    ) external view returns (bool) {
        return s_decryptReady[ctHash] && s_decryptResult[ctHash] == result;
    }

    function verifyDecryptResultSafe(
        uint256 ctHash,
        uint256 result,
        bytes calldata
    ) external view returns (bool) {
        return s_decryptReady[ctHash] && s_decryptResult[ctHash] == result;
    }

    function setDecryptReady(
        uint256 ctHash,
        bool ready
    ) external {
        s_decryptReady[ctHash] = ready;
    }

    function forceDecryptValue(
        uint256 ctHash,
        bool value
    ) external {
        s_isBoolHandle[ctHash] = true;
        s_boolByHandle[ctHash] = value;
        s_decryptResult[ctHash] = value ? 1 : 0;
        s_decryptRequested[ctHash] = true;
        s_decryptReady[ctHash] = true;
    }

    function _newHandle() private returns (uint256 handle) {
        if (s_nextHandleNonce == 0) {
            s_nextHandleNonce = 1;
        }
        handle = s_nextHandleNonce++;
    }

    function _resultForHandle(
        uint256 handle
    ) private view returns (uint256 result) {
        if (s_isBoolHandle[handle]) {
            return s_boolByHandle[handle] ? 1 : 0;
        }
        return s_uintByHandle[handle];
    }

    function _uintForHandle(
        uint256 handle
    ) private view returns (uint256) {
        if (s_isBoolHandle[handle]) {
            return s_boolByHandle[handle] ? 1 : 0;
        }
        return s_uintByHandle[handle];
    }

    function _boolForHandle(
        uint256 handle
    ) private view returns (bool) {
        if (s_isBoolHandle[handle]) {
            return s_boolByHandle[handle];
        }
        return s_uintByHandle[handle] != 0;
    }
}
