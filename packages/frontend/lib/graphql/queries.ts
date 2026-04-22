import { gql } from "graphql-request";

export const GET_ACTIVE_CHALLENGES = gql`
  query GetActiveChallenges($first: Int = 20, $skip: Int = 0) {
    challenges(
      first: $first
      skip: $skip
      where: { active: true }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      creator
      creatorStake
      playerStake
      slashBps
      payoutBps
      deadline
      active
      solved
      attemptCount
      maxAttempts
      createdAt
    }
  }
`;

export const GET_ALL_CHALLENGES = gql`
  query GetAllChallenges($first: Int = 50, $skip: Int = 0) {
    challenges(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      creator
      creatorStake
      playerStake
      slashBps
      payoutBps
      deadline
      active
      solved
      expired
      cancelled
      attemptCount
      maxAttempts
      createdAt
    }
  }
`;

export const GET_CHALLENGE_BY_ID = gql`
  query GetChallenge($id: ID!) {
    challenge(id: $id) {
      id
      creator
      creatorStake
      playerStake
      slashBps
      creatorCutBps
      protocolCutBps
      payoutBps
      deadline
      active
      solved
      expired
      cancelled
      attemptCount
      maxAttempts
      createdAt
      guesses(orderBy: createdAt, orderDirection: desc) {
        id
        player
        stake
        won
        exactMatches
        partialMatches
        payout
        slash
        protocolFee
        state
        createdAt
        resolvedAt
      }
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      totalChallengesCreated
      totalGuessesSubmitted
      totalGuessesWon
      totalPayoutWon
      totalSlashed
    }
  }
`;

export const GET_USER_GUESSES = gql`
  query GetUserGuesses($player: Bytes!, $first: Int = 50) {
    guesses(
      first: $first
      where: { player: $player }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      player
      stake
      won
      exactMatches
      partialMatches
      payout
      slash
      state
      createdAt
      resolvedAt
      challenge {
        id
        creator
        creatorStake
        deadline
        active
        solved
      }
    }
  }
`;

export const GET_LEADERBOARD = gql`
  query GetLeaderboard($first: Int = 10) {
    users(
      first: $first
      orderBy: totalPayoutWon
      orderDirection: desc
      where: { totalGuessesWon_gt: 0 }
    ) {
      id
      totalGuessesWon
      totalGuessesSubmitted
      totalPayoutWon
    }
  }
`;

export const GET_PROTOCOL_STATS = gql`
  query GetProtocolStats {
    protocolStats(id: "global") {
      totalChallenges
      activeChallenges
      solvedChallenges
      expiredChallenges
      totalGuesses
      totalProtocolFees
    }
  }
`;
