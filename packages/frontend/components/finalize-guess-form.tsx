"use client";

import { writeFinalizeGuess } from "@cipherbet/sdk";
import { FormEvent, useState } from "react";
import { useWalletClient } from "wagmi";

import { APP_CONFIG } from "@/lib/config";

export function FinalizeGuessForm() {
  const { data: walletClient } = useWalletClient();

  const [gameId, setGameId] = useState("1");
  const [guessId, setGuessId] = useState("1");
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!walletClient || !APP_CONFIG.gameAddress) {
      setError("Wallet or game address missing.");
      return;
    }

    try {
      setIsSubmitting(true);
      const hash = await writeFinalizeGuess(
        walletClient,
        APP_CONFIG.gameAddress,
        BigInt(gameId),
        BigInt(guessId),
      );
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel panel--resolve">
      <div className="panel-head">
        <h2>Finalize Guess</h2>
        <span className="chip">Settlement Relay</span>
      </div>
      <p className="small panel-subtitle">
        Pull-based settlement: anyone can finalize once the decrypt result is available.
      </p>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="row">
          <label>
            Game ID
            <input value={gameId} onChange={(e) => setGameId(e.target.value)} required />
          </label>
          <label>
            Guess ID
            <input value={guessId} onChange={(e) => setGuessId(e.target.value)} required />
          </label>
        </div>
        <button className="btn" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Finalizing..." : "Finalize Guess"}
        </button>
      </form>
      {txHash ? <p className="mono status status--ok">tx: {txHash}</p> : null}
      {error ? <p className="mono status status--error">error: {error}</p> : null}
    </section>
  );
}
