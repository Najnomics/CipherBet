# Known Risks

- **Async decrypt dependency**: if decrypt readiness is delayed indefinitely, unresolved guesses can delay creator expiry withdrawal.
- **Finalize-order sensitivity**: when multiple correct guesses exist concurrently, first finalized correct guess wins.
- **Role key risk**: compromised admin/treasury keys can misconfigure roles or withdraw treasury fees.
- **Client initialization dependency**: `cofhejs` must initialize successfully with the connected wallet/network before encrypted inputs can be submitted.
