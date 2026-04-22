"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

import { APP_CONFIG } from "@/lib/config";
import { graphClient } from "@/lib/graphql/client";
import { fetchProtocolStatsFromChain } from "@/lib/onchain-challenges";
import { graphRetryDecider } from "@/lib/hooks/use-query-utils";
import { GET_LEADERBOARD, GET_PROTOCOL_STATS, GET_USER_PROFILE } from "@/lib/graphql/queries";

export interface LeaderboardEntry {
  id: string;
  totalGuessesWon: number;
  totalGuessesSubmitted: number;
  totalPayoutWon: string;
}

export interface ProtocolStatsData {
  totalChallenges: number;
  activeChallenges: number;
  solvedChallenges: number;
  expiredChallenges: number;
  totalGuesses: number;
  totalProtocolFees: string;
}

export interface UserProfile {
  id: string;
  totalChallengesCreated: number;
  totalGuessesSubmitted: number;
  totalGuessesWon: number;
  totalPayoutWon: string;
  totalSlashed: string;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const data = await graphClient.request<{ users: LeaderboardEntry[] }>(GET_LEADERBOARD);
      return data.users;
    },
    retry: graphRetryDecider,
    staleTime: 30_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useProtocolStats() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["protocolStats"],
    queryFn: async () => {
      const canUseChainFallback =
        !!publicClient && !!APP_CONFIG.factoryAddress && !!APP_CONFIG.gameAddress;

      try {
        const data = await graphClient.request<{ protocolStats: ProtocolStatsData | null }>(
          GET_PROTOCOL_STATS,
        );

        if (!canUseChainFallback) {
          return data.protocolStats;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        const onchainStats = await fetchProtocolStatsFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );

        if (!data.protocolStats || (data.protocolStats.totalChallenges === 0 && onchainStats.totalChallenges > 0)) {
          return onchainStats;
        }

        return data.protocolStats;
      } catch (error) {
        if (!canUseChainFallback) {
          throw error;
        }

        const factoryAddress = APP_CONFIG.factoryAddress!;
        const gameAddress = APP_CONFIG.gameAddress!;

        return fetchProtocolStatsFromChain(
          publicClient,
          factoryAddress,
          gameAddress,
        );
      }
    },
    retry: graphRetryDecider,
    staleTime: 30_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useUserProfile(address: string | undefined) {
  return useQuery({
    queryKey: ["userProfile", address],
    queryFn: async () => {
      const data = await graphClient.request<{ user: UserProfile | null }>(GET_USER_PROFILE, {
        id: address?.toLowerCase(),
      });
      return data.user;
    },
    enabled: !!address,
    retry: graphRetryDecider,
    staleTime: 30_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}
