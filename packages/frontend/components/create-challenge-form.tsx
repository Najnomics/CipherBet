"use client";

import { type GameParams, writeCreateChallenge } from "@cipherbet/sdk";
import { encryptSecret, initializeCofheWithViem } from "@cipherbet/sdk/fhe";
import { FormEvent, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { APP_CONFIG } from "@/lib/config";

const DEFAULTS = {
  secret: "3715",
  creatorStake: "0.05",
  playerStake: "0.002",
  slashBps: 2000,
  creatorCutBps: 7000,
  protocolCutBps: 3000,
  payoutBps: 1500,
  durationHours: 168,
  maxAttempts: 10,
  cooldownSeconds: 0,
};

export function CreateChallengeForm() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [form, setForm] = useState(DEFAULTS);
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return isConnected && !!walletClient && !!publicClient && !!APP_CONFIG.factoryAddress;
  }, [isConnected, publicClient, walletClient]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!walletClient || !publicClient || !APP_CONFIG.factoryAddress) {
      setError("Wallet or factory address missing.");
      return;
    }

    try {
      setIsSubmitting(true);

      const digits = form.secret.split("").map((d) => Number(d));
      await initializeCofheWithViem(publicClient, walletClient, "TESTNET");
      const encryptedInput = await encryptSecret(digits);

      const params: GameParams = {
        creatorStake: parseEther(form.creatorStake),
        playerStakeFixed: parseEther(form.playerStake),
        slashBps: form.slashBps,
        creatorCutBps: form.creatorCutBps,
        protocolCutBps: form.protocolCutBps,
        payoutBpsOfCreatorStake: form.payoutBps,
        seqLen: 4,
        durationSeconds: BigInt(form.durationHours * 3600),
        maxAttemptsPerAddress: form.maxAttempts,
        cooldownSeconds: BigInt(form.cooldownSeconds),
      };

      const hash = await writeCreateChallenge(
        publicClient,
        walletClient,
        APP_CONFIG.factoryAddress,
        params,
        encryptedInput,
      );
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create challenge");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel panel--forge">
      <div className="panel-head">
        <h2>Create Challenge</h2>
        <span className="chip">Creator Console</span>
      </div>
      <p className="small panel-subtitle">
        v1 packs 4 digits into one uint32 and encrypts it with CoFHE before submitting onchain.
      </p>
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          Secret Digits (4)
          <input
            value={form.secret}
            onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
            maxLength={4}
            required
          />
        </label>

        <div className="row">
          <label>
            Creator Stake (ETH)
            <input
              value={form.creatorStake}
              onChange={(e) => setForm((p) => ({ ...p, creatorStake: e.target.value }))}
              required
            />
          </label>
          <label>
            Player Stake (ETH)
            <input
              value={form.playerStake}
              onChange={(e) => setForm((p) => ({ ...p, playerStake: e.target.value }))}
              required
            />
          </label>
        </div>

        <div className="row">
          <label>
            Slash BPS
            <input
              type="number"
              value={form.slashBps}
              onChange={(e) => setForm((p) => ({ ...p, slashBps: Number(e.target.value) }))}
              required
            />
          </label>
          <label>
            Payout BPS
            <input
              type="number"
              value={form.payoutBps}
              onChange={(e) => setForm((p) => ({ ...p, payoutBps: Number(e.target.value) }))}
              required
            />
          </label>
        </div>

        <div className="row">
          <label>
            Creator Cut BPS
            <input
              type="number"
              value={form.creatorCutBps}
              onChange={(e) => setForm((p) => ({ ...p, creatorCutBps: Number(e.target.value) }))}
              required
            />
          </label>
          <label>
            Protocol Cut BPS
            <input
              type="number"
              value={form.protocolCutBps}
              onChange={(e) => setForm((p) => ({ ...p, protocolCutBps: Number(e.target.value) }))}
              required
            />
          </label>
        </div>

        <div className="row">
          <label>
            Max Attempts
            <input
              type="number"
              value={form.maxAttempts}
              onChange={(e) => setForm((p) => ({ ...p, maxAttempts: Number(e.target.value) }))}
              required
            />
          </label>
          <label>
            Duration (hours)
            <input
              type="number"
              value={form.durationHours}
              onChange={(e) => setForm((p) => ({ ...p, durationHours: Number(e.target.value) }))}
              required
            />
          </label>
        </div>

        <button className="btn" disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? "Creating..." : "Create Challenge"}
        </button>
      </form>
      {txHash ? <p className="mono status status--ok">tx: {txHash}</p> : null}
      {error ? <p className="mono status status--error">error: {error}</p> : null}
    </section>
  );
}
