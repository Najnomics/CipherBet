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

const GAS_BUFFER_NUMERATOR = 12n;
const GAS_BUFFER_DENOMINATOR = 10n;

async function estimateGasWithBuffer(
  publicClient: PublicClient,
  request: any,
): Promise<bigint> {
  try {
    const [estimatedGas, block] = await Promise.all([
      publicClient.estimateContractGas(request),
      publicClient.getBlock(),
    ]);
    const bufferedGas = (estimatedGas * GAS_BUFFER_NUMERATOR) / GAS_BUFFER_DENOMINATOR;
    const maxSafeGas = block.gasLimit > 100_000n ? block.gasLimit - 100_000n : block.gasLimit;

    if (bufferedGas >= maxSafeGas) {
      throw new Error(
        `Estimated gas ${bufferedGas.toString()} is too close to or above the current block gas limit ${block.gasLimit.toString()} on ${
          publicClient.chain?.name || "the selected network"
        }.`,
      );
    }

    return bufferedGas;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to prepare gas for this FHE transaction. ${message}`,
    );
  }
}

export function createFactoryContract(publicClient: PublicClient, address: Address) {
  return getContract({ address, abi: challengeFactoryAbi, client: publicClient });
}

export function createGameContract(publicClient: PublicClient, address: Address) {
  return getContract({ address, abi: challengeGameAbi, client: publicClient });
}

export async function writeCreateChallenge(
  publicClient: PublicClient,
  walletClient: WalletClient,
  factoryAddress: Address,
  params: GameParams,
  encryptedSecret: InEuint32Input,
): Promise<Hex> {
  const [account] = await walletClient.getAddresses();
  const request = {
    account,
    chain: walletClient.chain,
    address: factoryAddress,
    abi: challengeFactoryAbi,
    functionName: "createChallenge",
    args: [params, encryptedSecret],
    value: params.creatorStake,
  } as const;
  const gas = await estimateGasWithBuffer(publicClient, request);

  return walletClient.writeContract(
    {
      ...request,
      gas: (gas * 12n) / 10n,
    } as any,
  );
}

export async function writeCreateChallengeFromDigits(
  publicClient: PublicClient,
  walletClient: WalletClient,
  factoryAddress: Address,
  params: GameParams,
  packedSecret: number,
): Promise<Hex> {
  const encoded = encodePackedUint32ForContract(packedSecret);
  return writeCreateChallenge(publicClient, walletClient, factoryAddress, params, encoded);
}

export async function writeSubmitGuess(
  publicClient: PublicClient,
  walletClient: WalletClient,
  gameAddress: Address,
  gameId: bigint,
  encryptedGuess: InEuint32Input,
  playerStakeFixed: bigint,
): Promise<Hex> {
  const [account] = await walletClient.getAddresses();
  const request = {
    account,
    chain: walletClient.chain,
    address: gameAddress,
    abi: challengeGameAbi,
    functionName: "submitGuess",
    args: [gameId, encryptedGuess],
    value: playerStakeFixed,
  } as const;
  const gas = await estimateGasWithBuffer(publicClient, request);

  return walletClient.writeContract(
    {
      ...request,
      gas: (gas * 12n) / 10n,
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

export async function readGame(
  publicClient: PublicClient,
  gameAddress: Address,
  gameId: bigint,
) {
  return publicClient.readContract({
    address: gameAddress,
    abi: challengeGameAbi,
    functionName: "getGame",
    args: [gameId],
  });
}

export async function readGameCount(
  publicClient: PublicClient,
  gameAddress: Address,
) {
  return publicClient.readContract({
    address: gameAddress,
    abi: challengeGameAbi,
    functionName: "gameCount",
  });
}

export async function readAllGameIds(
  publicClient: PublicClient,
  factoryAddress: Address,
) {
  return publicClient.readContract({
    address: factoryAddress,
    abi: challengeFactoryAbi,
    functionName: "getAllGameIds",
  });
}

export async function readChallengeMeta(
  publicClient: PublicClient,
  factoryAddress: Address,
  gameId: bigint,
) {
  return publicClient.readContract({
    address: factoryAddress,
    abi: challengeFactoryAbi,
    functionName: "getChallengeMeta",
    args: [gameId],
  });
}
