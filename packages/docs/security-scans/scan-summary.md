# Security Scan Summary (2026-03-14)

## Commands

- Slither:
  - `slither packages/contracts --exclude-dependencies --json packages/docs/security-scans/slither.json`
- Semgrep:
  - `semgrep --config=auto packages/contracts/src --json --output packages/docs/security-scans/semgrep.json`

## Results

### Slither
- Detector entries: `15`
- High/Medium items are primarily pattern-based and require triage:
  - `arbitrary-send-eth` on treasury withdrawal: expected admin withdrawal path.
  - `reentrancy-*` around external CoFHE/FHE operations: modeled by role controls and `nonReentrant` settlement.
  - `divide-before-multiply`: expected integer-floor behavior in slash split; tested in fuzz math conservation suite.
- Informational items include low-level call usage, pragma variance in dependencies, and naming conventions.
- Detector breakdown:
  - `arbitrary-send-eth`: 1
  - `divide-before-multiply`: 1
  - `low-level-calls`: 2
  - `naming-convention`: 3
  - `pragma`: 1
  - `reentrancy-benign`: 3
  - `reentrancy-events`: 1
  - `reentrancy-no-eth`: 1
  - `timestamp`: 2

### Semgrep
- `0` findings.
- `0` scan errors (with `--config auto`).

## Notes
- Scanner output is stored as raw artifacts for manual triage:
  - `slither.json`, `slither.txt`
  - `semgrep.json`, `semgrep.txt`
