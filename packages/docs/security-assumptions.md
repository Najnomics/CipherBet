# Security Assumptions

- CoFHE TaskManager/Threshold infrastructure correctly binds decrypt requests to encrypted handles.
- FHE ciphertext ACL semantics are enforced by CoFHE ACL and onchain verification.
- Base Sepolia/Arbitrum Sepolia chain safety assumptions hold (reorg behavior within expected envelope).
- Connected wallets are uncompromised and users confirm the intended transactions.
- Protocol admin keys are secured; role grants are managed by multisig for non-testnet deployments.
