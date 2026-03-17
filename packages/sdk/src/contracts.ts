import {
  type Address,
  getContract,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

import { challengeFactoryAbi } from "./abi/factory";
import { challengeGameAbi } from "./abi/game";
import { encodePackedUint32ForContract } from "./encoding";
import type { GameParams, InEuint32Input } from "./types";

export function createFactoryContract(publicClient: PublicClient, address: Address) {
  return getContract({ address, abi: challengeFactoryAbi, client: publicClient });
}

export function createGameContract(publicClient: PublicClient, address: Address) {
  return getContract({ address, abi: challengeGameAbi, client: publicClient });
}

export async function writeCreateChallenge(
  walletClient: WalletClient,
  factoryAddress: Address,
  params: GameParams,
  encryptedSecret: InEuint32Input,
): Promise<Hex> {
  const [account] = await walletClient.getAddresses();
  return walletClient.writeContract(
    {
      account,
      chain: walletClient.chain,
      address: factoryAddress,
      abi: challengeFactoryAbi,
      functionName: "createChallenge",
      args: [params, encryptedSecret],
      value: params.creatorStake,
    } as any,
  );
}

export async function writeCreateChallengeFromDigits(
  walletClient: WalletClient,
  factoryAddress: Address,
  params: GameParams,
  packedSecret: number,
): Promise<Hex> {
  const encoded = encodePackedUint32ForContract(packedSecret);
  return writeCreateChallenge(walletClient, factoryAddress, params, encoded);
}

export async function writeSubmitGuess(
  walletClient: WalletClient,
  gameAddress: Address,
  gameId: bigint,
  encryptedGuess: InEuint32Input,
  playerStakeFixed: bigint,
): Promise<Hex> {
  const [account] = await walletClient.getAddresses();
  return walletClient.writeContract(
    {
      account,
      chain: walletClient.chain,
      address: gameAddress,
      abi: challengeGameAbi,
      functionName: "submitGuess",
      args: [gameId, encryptedGuess],
      value: playerStakeFixed,
    } as any,
  );
}

export async function writeFinalizeGuess(
  walletClient: WalletClient,
  gameAddress: Address,
  gameId: bigint,
  guessId: bigint,
): Promise<Hex> {
  const [account] = await walletClient.getAddresses();
  return walletClient.writeContract(
    {
      account,
      chain: walletClient.chain,
      address: gameAddress,
      abi: challengeGameAbi,
      functionName: "finalizeGuess",
      args: [gameId, guessId],
    } as any,
  );
}
