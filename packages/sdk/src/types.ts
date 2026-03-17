import type { Address, Hex } from "viem";

export interface InEuint32Input {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hex;
}

export type ChallengeId = bigint;
export type GuessId = bigint;

export interface GameParams {
  creatorStake: bigint;
  playerStakeFixed: bigint;
  slashBps: number;
  creatorCutBps: number;
  protocolCutBps: number;
  payoutBpsOfCreatorStake: number;
  seqLen: number;
  durationSeconds: bigint;
  maxAttemptsPerAddress: number;
  cooldownSeconds: bigint;
}

export interface PermitRecord {
  account: Address;
  signature: Hex;
  expiresAt: number;
}

export interface CofheClientLike {
  encryptUint32(value: number | bigint, securityZone?: number): Promise<InEuint32Input>;
}

export interface PermitManager {
  generatePermit(account: Address, ttlSeconds?: number): Promise<PermitRecord>;
  isPermitValid(permit: PermitRecord): boolean;
}
