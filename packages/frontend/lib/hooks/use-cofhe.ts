"use client";

import {
  EncryptStep,
  Encryptable,
  createKeysStore,
  fetchKeys,
  type EncryptedUint32Input,
  type IStorage,
} from "@cofhe/sdk";
import { baseSepolia as cofheBaseSepolia } from "@cofhe/sdk/chains";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import type { InEuint32Input } from "@cipherbet/sdk";
import { encodeDigitsToPackedUint32 } from "@cipherbet/sdk";

type CofheState = "idle" | "connecting" | "connected" | "encrypting" | "error";

let sharedCofheClient: ReturnType<typeof createCofheClient> | null = null;
let sharedKeyWarmupPromise: Promise<void> | null = null;
const memoryKeyStorageMap = new Map<string, string>();

function createBrowserKeyStorage(): IStorage {
  return {
    getItem: async (name: string) => memoryKeyStorageMap.get(name) ?? null,
    setItem: async (name: string, value: unknown) => {
      memoryKeyStorageMap.set(name, String(value));
    },
    removeItem: async (name: string) => {
      memoryKeyStorageMap.delete(name);
    },
  };
}

function getCofheClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (sharedCofheClient) {
    return sharedCofheClient;
  }

  sharedCofheClient = createCofheClient(
    createCofheConfig({
      supportedChains: [cofheBaseSepolia],
      fheKeyStorage: createBrowserKeyStorage(),
      useWorkers: false,
    }),
  );

  return sharedCofheClient;
}

async function prefetchFheKeys(chainId: number) {
  const client = getCofheClient();
  const storage = createBrowserKeyStorage();

  if (!client || chainId !== cofheBaseSepolia.id) {
    return;
  }

  if (!sharedKeyWarmupPromise) {
    sharedKeyWarmupPromise = fetchKeys(
      client.config,
      chainId,
      0,
      () => {},
      () => {},
      createKeysStore(storage),
    ).then(() => undefined);
  }

  try {
    await sharedKeyWarmupPromise;
  } finally {
    sharedKeyWarmupPromise = null;
  }
}

function normalizeEncrypted(input: EncryptedUint32Input): InEuint32Input {
  return {
    ctHash: BigInt(input.ctHash),
    securityZone: input.securityZone,
    utype: input.utype,
    signature: input.signature as Hex,
  };
}

function normalizePlaintext(packed: number): InEuint32Input {
  return {
    ctHash: BigInt(packed),
    securityZone: 0,
    utype: 4,
    signature: "0x",
  };
}

function formatEncryptStep(step: EncryptStep | null): string | undefined {
  if (step == null) return undefined;

  switch (step) {
    case EncryptStep.InitTfhe:
      return "Initializing TFHE";
    case EncryptStep.FetchKeys:
      return "Fetching FHE keys";
    case EncryptStep.Pack:
      return "Packing encrypted input";
    case EncryptStep.Prove:
      return "Generating proof";
    case EncryptStep.Verify:
      return "Verifying proof";
    default:
      return String(step);
  }
}

export function useCofhe() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [state, setState] = useState<CofheState>("idle");
  const [error, setError] = useState<string>();
  const [encryptStep, setEncryptStep] = useState<EncryptStep | null>(null);
  const connectAttemptRef = useRef(0);

  useEffect(() => {
    if (!publicClient || !walletClient || !address) {
      getCofheClient()?.disconnect();
      setState("idle");
      setError(undefined);
      setEncryptStep(null);
      return;
    }

    const attempt = ++connectAttemptRef.current;
    let cancelled = false;
    const currentPublicClient = publicClient;
    const currentWalletClient = walletClient;

    async function connect() {
      const client = getCofheClient();

      if (!client) {
        setState("idle");
        return;
      }

      setState("connecting");
      setError(undefined);
      setEncryptStep(null);

      try {
        await client.connect(currentPublicClient, currentWalletClient);

        if (cancelled || connectAttemptRef.current !== attempt) return;

        const snapshot = client.getSnapshot();
        if (!snapshot.connected) {
          throw new Error("CoFHE client did not reach a connected state.");
        }

        setState("connected");
        console.log("[CoFHE] Connected", {
          account: snapshot.account,
          chainId: snapshot.chainId,
        });

        if (snapshot.chainId != null) {
          void prefetchFheKeys(snapshot.chainId).catch((prefetchError) => {
            const message =
              prefetchError instanceof Error
                ? prefetchError.message
                : "Failed to prefetch CoFHE public keys.";
            console.error("[CoFHE] Prefetch error:", message);
          });
        }
      } catch (err) {
        if (cancelled || connectAttemptRef.current !== attempt) return;
        const message = err instanceof Error ? err.message : "Failed to connect CoFHE.";
        console.error("[CoFHE] Connect error:", message);
        setError(message);
        setState("error");
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
  }, [publicClient, walletClient, address, chainId]);

  const encryptDigits = useCallback(async (
    digits: number[],
    options?: { account?: Address; chainId?: number },
  ): Promise<InEuint32Input> => {
    const packed = encodeDigitsToPackedUint32(digits);
    const client = getCofheClient();
    const targetChainId = options?.chainId ?? chainId;
    const targetAccount = options?.account ?? address;

    if (!client || !targetAccount || !targetChainId) {
      return normalizePlaintext(packed);
    }

    try {
      if (targetChainId === cofheBaseSepolia.id) {
        await prefetchFheKeys(targetChainId);
      }

      setState("encrypting");
      setError(undefined);
      setEncryptStep(null);

      const encrypted = await client
        .encryptInputs([Encryptable.uint32(BigInt(packed))])
        .setAccount(targetAccount)
        .setChainId(targetChainId)
        .onStep((step, context) => {
          if (context?.isStart) {
            setEncryptStep(step);
          }
          if (context?.isEnd) {
            console.log("[CoFHE] Step complete", {
              step,
              durationMs: context.duration,
              usedWorker: context.usedWorker,
              workerFailedError: context.workerFailedError,
            });
          }
        })
        .execute();

      setEncryptStep(null);
      setState("connected");

      return normalizeEncrypted(encrypted[0] as EncryptedUint32Input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "CoFHE encryption failed.";
      console.error("[CoFHE] Encryption error:", message);
      setEncryptStep(null);
      setError(message);
      setState("error");
      return normalizePlaintext(packed);
    }
  }, [address, chainId]);

  return {
    cofheState: state,
    cofheError: error,
    cofheStep: encryptStep,
    cofheStepLabel: formatEncryptStep(encryptStep),
    isReady: state === "connected",
    encryptDigits,
  };
}
