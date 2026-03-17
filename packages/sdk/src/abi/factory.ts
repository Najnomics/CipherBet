export const challengeFactoryAbi = [
  {
    type: "function",
    name: "createChallenge",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "creatorStake", type: "uint256" },
          { name: "playerStakeFixed", type: "uint256" },
          { name: "slashBps", type: "uint16" },
          { name: "creatorCutBps", type: "uint16" },
          { name: "protocolCutBps", type: "uint16" },
          { name: "payoutBpsOfCreatorStake", type: "uint16" },
          { name: "seqLen", type: "uint8" },
          { name: "durationSeconds", type: "uint64" },
          { name: "maxAttemptsPerAddress", type: "uint32" },
          { name: "cooldownSeconds", type: "uint64" },
        ],
      },
      {
        name: "encryptedSecret",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "gameId", type: "uint256" }],
  },
  {
    type: "event",
    name: "GameCreated",
    inputs: [
      { indexed: true, name: "gameId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "creatorStake", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint64" },
      { indexed: false, name: "playerStakeFixed", type: "uint256" },
      { indexed: false, name: "slashBps", type: "uint16" },
    ],
    anonymous: false,
  },
] as const;
