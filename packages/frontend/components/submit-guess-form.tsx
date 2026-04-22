"use client";

import { writeSubmitGuess } from "@cipherbet/sdk";
import { encryptGuess, initializeCofheWithViem } from "@cipherbet/sdk/fhe";
import { FormEvent, useState } from "react";
import { parseEther } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

import { APP_CONFIG } from "@/lib/config";

export function SubmitGuessForm() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [gameId, setGameId] = useState("1");
  const [guess, setGuess] = useState("0000");
  const [stake, setStake] = useState("0.002");
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!walletClient || !publicClient || !APP_CONFIG.gameAddress) {
      setError("Wallet or game address missing.");
      return;
    }

    try {
      setIsSubmitting(true);
      await initializeCofheWithViem(publicClient, walletClient, "TESTNET");
      const encryptedGuess = await encryptGuess(guess.split("").map((d) => Number(d)));

      const hash = await writeSubmitGuess(
        publicClient,
        walletClient,
        APP_CONFIG.gameAddress,
        BigInt(gameId),
        encryptedGuess,
        parseEther(stake),
      );

      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel panel--guess">
      <div className="panel-head">
        <h2>Submit Guess</h2>
        <span className="chip">Player Terminal</span>
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          Game ID
          <input value={gameId} onChange={(e) => setGameId(e.target.value)} required />
        </label>
        <label>
          Guess Digits (4)
          <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={4} required />
        </label>
        <label>
          Stake (ETH)
          <input value={stake} onChange={(e) => setStake(e.target.value)} required />
        </label>
        <button className="btn alt" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit Guess"}
        </button>
      </form>
      {txHash ? <p className="mono status status--ok">tx: {txHash}</p> : null}
      {error ? <p className="mono status status--error">error: {error}</p> : null}
    </section>
  );
}
