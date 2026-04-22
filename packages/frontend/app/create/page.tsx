"use client";

import { type GameParams, writeCreateChallenge } from "@cipherbet/sdk";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";

import { DigitWheel } from "@/components/ui/digit-wheel";
import { GlowCard } from "@/components/ui/glow-card";
import { pageTransition } from "@/lib/motion-variants";
import { APP_CONFIG } from "@/lib/config";
import { bpsToPercent, baseScanTx } from "@/lib/utils";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useCofhe } from "@/lib/hooks/use-cofhe";

const DEFAULTS = {
  creatorStake: "0.01",
  playerStake: "0.002",
  slashBps: 2000,
  creatorCutBps: 7000,
  protocolCutBps: 3000,
  payoutBps: 1500,
  durationHours: 168,
  maxAttempts: 10,
  cooldownSeconds: 0,
};

type Phase = "configure" | "encrypting" | "submitting" | "success";

export default function CreateChallengePage() {
  const { isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { cofheState, cofheStepLabel, encryptDigits } = useCofhe();

  const [digits, setDigits] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [form, setForm] = useState(DEFAULTS);
  const [phase, setPhase] = useState<Phase>("configure");
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();

  const mounted = useMounted();
  const isCorrectChain = chainId === APP_CONFIG.chain.id;

  const canSubmit = useMemo(() => {
    return (
      mounted &&
      isConnected &&
      isCorrectChain &&
      !!walletClient &&
      !!APP_CONFIG.factoryAddress &&
      phase === "configure"
    );
  }, [mounted, isConnected, isCorrectChain, walletClient, phase]);

  async function handleSwitchNetwork() {
    setError(undefined);

    try {
      await switchChainAsync({ chainId: APP_CONFIG.chain.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch to Base Sepolia.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!isConnected) {
      setError("Connect your wallet first.");
      return;
    }

    if (!isCorrectChain) {
      setError(`Switch your wallet to ${APP_CONFIG.chain.name} before creating a challenge.`);
      return;
    }

    if (!walletClient || !publicClient || !APP_CONFIG.factoryAddress) {
      setError("Wallet or factory address missing.");
      return;
    }

    try {
      setPhase("encrypting");
      const encryptedInput = await encryptDigits([...digits], {
        account: APP_CONFIG.factoryAddress,
        chainId: APP_CONFIG.chain.id,
      });

      setPhase("submitting");

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

      console.log("[Create] Params:", params);
      console.log("[Create] Encrypted:", encryptedInput);

      const hash = await writeCreateChallenge(
        publicClient,
        walletClient,
        APP_CONFIG.factoryAddress,
        params,
        encryptedInput,
      );
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["challenges"] }),
        queryClient.invalidateQueries({ queryKey: ["protocolStats"] }),
      ]);
      setTxHash(hash);
      setPhase("success");
    } catch (err) {
      console.error("[Create] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setPhase("configure");
    }
  }

  const cofheLabel =
    cofheState === "connected"
      ? "CoFHE Connected"
      : cofheState === "connecting"
        ? "CoFHE Connecting..."
        : cofheState === "encrypting"
          ? cofheStepLabel || "Encrypting with CoFHE..."
          : cofheState === "error"
            ? "CoFHE Error"
            : "CoFHE Idle";

  return (
    <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <span className="glitch-text">Create Challenge</span>
        </h1>
        <p className="page-sub">Set your secret code, configure the rules, and stake ETH.</p>
        {mounted && (
          <>
            <p className="small" style={{ marginTop: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  marginRight: 6,
                  background:
                    cofheState === "connected"
                      ? "var(--lime)"
                      : cofheState === "connecting" || cofheState === "encrypting"
                        ? "var(--amber)"
                        : "var(--alert)",
                }}
              />
              {cofheLabel}
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              Network: {isConnected ? (isCorrectChain ? APP_CONFIG.chain.name : "Wrong network") : "Wallet disconnected"}
            </p>
          </>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === "success" && txHash ? (
          <motion.div
            key="success"
            className="create-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="create-success-icon">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="38" fill="none" stroke="var(--lime)" strokeWidth="2" />
                <motion.path
                  d="M22 40l12 12 24-24"
                  fill="none"
                  stroke="var(--lime)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </svg>
            </div>
            <h2>Challenge Created!</h2>
            <p className="mono">
              <a href={baseScanTx(txHash)} target="_blank" rel="noopener noreferrer">
                {txHash}
              </a>
            </p>
            <div className="create-success-actions">
              <Link href="/" className="btn">
                Back to Arena
              </Link>
            </div>
          </motion.div>
        ) : phase === "encrypting" || phase === "submitting" ? (
          <motion.div
            key="processing"
            className="create-processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="encrypt-animation">
              <motion.div
                className="encrypt-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="8 6" />
                </svg>
              </motion.div>
              <motion.svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                className="encrypt-lock"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke="var(--cyan)" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="var(--cyan)" strokeWidth="2" />
              </motion.svg>
            </div>
            <p className="encrypt-label">
              {phase === "encrypting"
                ? cofheStepLabel || "Encrypting secret with CoFHE..."
                : "Submitting transaction..."}
            </p>
            {error && <p className="mono status status--error">{error}</p>}
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="create-form"
            onSubmit={onSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Secret Code */}
            <GlowCard color="cyan" className="create-section">
              <h3 className="create-section-title">Secret Code</h3>
              <p className="small">Choose 4 digits. This will be encrypted with FHE before going onchain.</p>
              <div className="create-digit-wrap">
                <DigitWheel value={digits} onChange={setDigits} disabled={!mounted || phase !== "configure"} />
              </div>
              <p className="small">Use the arrows or type directly into each digit box.</p>
            </GlowCard>

            {/* Stakes */}
            <div className="create-row">
              <GlowCard color="amber" delay={0.1} className="create-section">
                <h3 className="create-section-title">Stakes</h3>
                <label>
                  Creator Stake (ETH)
                  <input
                    value={form.creatorStake}
                    onChange={(e) => setForm((p) => ({ ...p, creatorStake: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Player Entry Fee (ETH)
                  <input
                    value={form.playerStake}
                    onChange={(e) => setForm((p) => ({ ...p, playerStake: e.target.value }))}
                    required
                  />
                </label>
              </GlowCard>

              <GlowCard color="lime" delay={0.15} className="create-section">
                <h3 className="create-section-title">Economics</h3>
                <label>
                  Slash Rate ({bpsToPercent(form.slashBps)})
                  <input
                    type="number"
                    value={form.slashBps}
                    onChange={(e) => setForm((p) => ({ ...p, slashBps: Number(e.target.value) }))}
                    required
                  />
                </label>
                <label>
                  Win Payout ({bpsToPercent(form.payoutBps)} of stake)
                  <input
                    type="number"
                    value={form.payoutBps}
                    onChange={(e) => setForm((p) => ({ ...p, payoutBps: Number(e.target.value) }))}
                    required
                  />
                </label>
              </GlowCard>
            </div>

            {/* Rules */}
            <GlowCard delay={0.2} className="create-section">
              <h3 className="create-section-title">Rules</h3>
              <div className="create-row">
                <label>
                  Max Attempts per Player
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
                <label>
                  Creator Cut ({bpsToPercent(form.creatorCutBps)})
                  <input
                    type="number"
                    value={form.creatorCutBps}
                    onChange={(e) => setForm((p) => ({ ...p, creatorCutBps: Number(e.target.value) }))}
                    required
                  />
                </label>
                <label>
                  Protocol Fee ({bpsToPercent(form.protocolCutBps)})
                  <input
                    type="number"
                    value={form.protocolCutBps}
                    onChange={(e) => setForm((p) => ({ ...p, protocolCutBps: Number(e.target.value) }))}
                    required
                  />
                </label>
              </div>
            </GlowCard>

            {/* Summary */}
            <GlowCard color="cyan" delay={0.25} className="create-section create-summary">
              <h3 className="create-section-title">Summary</h3>
              <div className="create-summary-grid">
                <div>
                  <span className="ps-label">Your Stake</span>
                  <strong>{form.creatorStake} ETH</strong>
                </div>
                <div>
                  <span className="ps-label">Entry Fee</span>
                  <strong>{form.playerStake} ETH</strong>
                </div>
                <div>
                  <span className="ps-label">Payout on Win</span>
                  <strong>{bpsToPercent(form.payoutBps)}</strong>
                </div>
                <div>
                  <span className="ps-label">Wrong Guess Slash</span>
                  <strong>{bpsToPercent(form.slashBps)}</strong>
                </div>
              </div>
            </GlowCard>

            {error && <p className="mono status status--error">Error: {error}</p>}

            {!mounted ? (
              <motion.button type="button" className="btn create-submit" disabled>
                Loading...
              </motion.button>
            ) : !isConnected ? (
              <motion.button type="button" className="btn create-submit" disabled>
                Connect Wallet First
              </motion.button>
            ) : !isCorrectChain ? (
              <motion.button
                type="button"
                className="btn alt create-submit"
                onClick={handleSwitchNetwork}
                disabled={isSwitchingChain}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSwitchingChain ? "Switching Network..." : `Switch to ${APP_CONFIG.chain.name}`}
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                className="btn create-submit"
                disabled={!canSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {cofheState === "connected"
                  ? "Encrypt & Create Challenge"
                  : cofheState === "connecting"
                    ? "Connecting CoFHE..."
                    : cofheState === "encrypting"
                      ? cofheStepLabel || "Encrypting..."
                    : "CoFHE Not Ready"}
              </motion.button>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
