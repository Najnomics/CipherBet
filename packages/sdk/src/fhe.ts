import { Encryptable, cofhejs, type CoFheInUint32, type Environment } from "cofhejs/web";
import type { Address, Hex, PublicClient, WalletClient } from "viem";

import { encodeDigitsToPackedUint32 } from "./encoding";
import type { InEuint32Input, PermitManager, PermitRecord } from "./types";

function requireSuccess<T>(
  result: { success: true; data: T } | { success: false; error: { message: string } },
): T {
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function normalizeInEuint32(input: CoFheInUint32): InEuint32Input {
  const signature = input.signature.startsWith("0x")
    ? (input.signature as Hex)
    : (`0x${input.signature}` as Hex);

  return {
    ctHash: BigInt(input.ctHash),
    securityZone: input.securityZone,
    utype: input.utype,
    signature,
  };
}

export async function initializeCofheWithViem(
  publicClient: PublicClient,
  walletClient: WalletClient,
  environment: Environment = "TESTNET",
): Promise<void> {
  requireSuccess(
    await cofhejs.initializeWithViem({
      viemClient: publicClient,
      viemWalletClient: walletClient,
      environment,
      generatePermit: true,
    }),
  );
}

export async function encryptPackedUint32(
  packed: number | bigint,
  securityZone = 0,
): Promise<InEuint32Input> {
  const encrypted = requireSuccess(
    await cofhejs.encrypt([Encryptable.uint32(BigInt(packed), securityZone)]),
  )[0] as CoFheInUint32;

  return normalizeInEuint32(encrypted);
}

export async function encryptSecret(
  digits: readonly number[],
  securityZone = 0,
): Promise<InEuint32Input> {
  const packed = encodeDigitsToPackedUint32(digits);
  return encryptPackedUint32(packed, securityZone);
}

export async function encryptGuess(
  digits: readonly number[],
  securityZone = 0,
): Promise<InEuint32Input> {
  const packed = encodeDigitsToPackedUint32(digits);
  return encryptPackedUint32(packed, securityZone);
}

export async function getOrCreatePermit(
  permitManager: PermitManager,
  account: Address,
  ttlSeconds = 3600,
  existingPermit?: PermitRecord,
): Promise<PermitRecord> {
  if (existingPermit && permitManager.isPermitValid(existingPermit)) {
    return existingPermit;
  }

  return permitManager.generatePermit(account, ttlSeconds);
}
