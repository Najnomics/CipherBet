import { readAllGameIds, readChallengeMeta, readGame } from "@cipherbet/sdk";
import type { Address, PublicClient } from "viem";

import type { ChallengeData } from "@/lib/hooks/use-challenges";
import type { ProtocolStatsData } from "@/lib/hooks/use-leaderboard";

function nowInSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

function challengeFromChain(gameId: bigint, meta: any, game: any): ChallengeData {
  return {
    id: gameId.toString(),
    creator: game.creator,
    creatorStake: game.creatorStakeEscrowed.toString(),
    playerStake: game.playerStakeFixed.toString(),
    slashBps: Number(game.slashBps),
    payoutBps: Number(game.payoutBpsOfCreatorStake),
    deadline: meta.deadline.toString(),
    active: Boolean(game.active),
    solved: Boolean(game.solved),
    expired: !game.active && !game.solved && meta.deadline < nowInSeconds(),
    cancelled: !game.active && !game.solved && meta.deadline >= nowInSeconds(),
    attemptCount: Number(game.attemptCount),
    maxAttempts: Number(game.maxAttemptsPerAddress),
    createdAt: meta.createdAt.toString(),
    creatorCutBps: Number(game.creatorCutBps),
    protocolCutBps: Number(game.protocolCutBps),
  };
}

export async function fetchChallengesFromChain(
  publicClient: PublicClient,
  factoryAddress: Address,
  gameAddress: Address,
): Promise<ChallengeData[]> {
  const gameIds = await readAllGameIds(publicClient, factoryAddress);

  if (!gameIds.length) {
    return [];
  }

  const challenges = await Promise.all(
    [...gameIds]
      .reverse()
      .map(async (gameId) => {
        const [meta, game] = await Promise.all([
          readChallengeMeta(publicClient, factoryAddress, gameId),
          readGame(publicClient, gameAddress, gameId),
        ]);

        return challengeFromChain(gameId, meta, game);
      }),
  );

  return challenges;
}

export async function fetchActiveChallengesFromChain(
  publicClient: PublicClient,
  factoryAddress: Address,
  gameAddress: Address,
): Promise<ChallengeData[]> {
  const challenges = await fetchChallengesFromChain(publicClient, factoryAddress, gameAddress);
  return challenges.filter((challenge) => challenge.active);
}

export async function fetchChallengeByIdFromChain(
  publicClient: PublicClient,
  factoryAddress: Address,
  gameAddress: Address,
  gameId: bigint,
): Promise<ChallengeData | null> {
  try {
    const [meta, game] = await Promise.all([
      readChallengeMeta(publicClient, factoryAddress, gameId),
      readGame(publicClient, gameAddress, gameId),
    ]);

    return challengeFromChain(gameId, meta, game);
  } catch {
    return null;
  }
}

export async function fetchProtocolStatsFromChain(
  publicClient: PublicClient,
  factoryAddress: Address,
  gameAddress: Address,
): Promise<ProtocolStatsData> {
  const challenges = await fetchChallengesFromChain(publicClient, factoryAddress, gameAddress);

  const totalChallenges = challenges.length;
  const activeChallenges = challenges.filter((challenge) => challenge.active).length;
  const solvedChallenges = challenges.filter((challenge) => challenge.solved).length;
  const expiredChallenges = challenges.filter((challenge) => challenge.expired).length;
  const totalGuesses = challenges.reduce((sum, challenge) => sum + challenge.attemptCount, 0);

  const totalProtocolFees = challenges
    .reduce((sum, challenge) => {
      const fees = BigInt(challenge.playerStake) * BigInt(challenge.protocolCutBps ?? 0) * BigInt(challenge.attemptCount);
      return sum + fees / 10_000n;
    }, 0n)
    .toString();

  return {
    totalChallenges,
    activeChallenges,
    solvedChallenges,
    expiredChallenges,
    totalGuesses,
    totalProtocolFees,
  };
}
