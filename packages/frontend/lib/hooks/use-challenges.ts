"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

import { APP_CONFIG } from "@/lib/config";
import { graphClient } from "@/lib/graphql/client";
import {
  fetchActiveChallengesFromChain,
  fetchChallengeByIdFromChain,
  fetchChallengesFromChain,
} from "@/lib/onchain-challenges";
import { graphRetryDecider } from "@/lib/hooks/use-query-utils";
import {
  GET_ACTIVE_CHALLENGES,
  GET_ALL_CHALLENGES,
  GET_CHALLENGE_BY_ID,
} from "@/lib/graphql/queries";

export interface ChallengeData {
  id: string;
  creator: string;
  creatorStake: string;
  playerStake: string;
  slashBps: number;
  payoutBps: number;
  deadline: string;
  active: boolean;
  solved: boolean;
  expired?: boolean;
  cancelled?: boolean;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  creatorCutBps?: number;
  protocolCutBps?: number;
  guesses?: GuessData[];
}

export interface GuessData {
  id: string;
  player: string;
  stake: string;
  won: boolean | null;
  exactMatches?: number | null;
  partialMatches?: number | null;
  payout: string;
  slash: string;
  protocolFee: string;
  state: string;
  createdAt: string;
  resolvedAt: string | null;
  challenge?: ChallengeData;
}

export function useActiveChallenges() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["challenges", "active"],
    queryFn: async () => {
      const canUseChainFallback =
        !!publicClient && !!APP_CONFIG.factoryAddress && !!APP_CONFIG.gameAddress;

      try {
        const data = await graphClient.request<{ challenges: ChallengeData[] }>(
          GET_ACTIVE_CHALLENGES,
        );
        if (!data.challenges.length || !canUseChainFallback) {
          return data.challenges;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        const onchainChallenges = await fetchActiveChallengesFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );

        return onchainChallenges.length > 0 ? onchainChallenges : data.challenges;
      } catch (error) {
        if (!canUseChainFallback) {
          throw error;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        return fetchActiveChallengesFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );
      }
    },
    retry: graphRetryDecider,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useAllChallenges() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["challenges", "all"],
    queryFn: async () => {
      const canUseChainFallback =
        !!publicClient && !!APP_CONFIG.factoryAddress && !!APP_CONFIG.gameAddress;

      try {
        const data = await graphClient.request<{ challenges: ChallengeData[] }>(GET_ALL_CHALLENGES);
        if (!data.challenges.length || !canUseChainFallback) {
          return data.challenges;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        const onchainChallenges = await fetchChallengesFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );

        return onchainChallenges.length > 0 ? onchainChallenges : data.challenges;
      } catch (error) {
        if (!canUseChainFallback) {
          throw error;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        return fetchChallengesFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );
      }
    },
    retry: graphRetryDecider,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useChallenge(id: string | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const canUseChainFallback =
        !!id && !!publicClient && !!APP_CONFIG.factoryAddress && !!APP_CONFIG.gameAddress;

      try {
        const data = await graphClient.request<{ challenge: ChallengeData | null }>(
          GET_CHALLENGE_BY_ID,
          { id },
        );

        if (data.challenge || !canUseChainFallback) {
          return data.challenge;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        return fetchChallengeByIdFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
          BigInt(id),
        );
      } catch (error) {
        if (!canUseChainFallback) {
          throw error;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        return fetchChallengeByIdFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
          BigInt(id),
        );
      }
    },
    enabled: !!id,
    retry: graphRetryDecider,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}
