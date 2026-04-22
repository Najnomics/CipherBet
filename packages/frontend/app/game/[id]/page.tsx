"use client";

import { writeSubmitGuess, writeFinalizeGuess } from "@cipherbet/sdk";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { useMounted } from "@/lib/hooks/use-mounted";
import { useCofhe } from "@/lib/hooks/use-cofhe";
import { DigitWheel } from "@/components/ui/digit-wheel";
import { GlowCard } from "@/components/ui/glow-card";
import { GuessResult } from "@/components/game/guess-result";
import { pageTransition, fadeInUp, staggerContainer } from "@/lib/motion-variants";
import {
  formatCountdown,
  formatEth,
  truncateAddress,
  bpsToPercent,
  baseScanTx,
} from "@/lib/utils";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { useChallenge, type GuessData } from "@/lib/hooks/use-challenges";
import { APP_CONFIG } from "@/lib/config";

function GameCountdown({ deadline }: { deadline: string }) {
  const deadlineMs = parseInt(deadline) * 1000;
  const { remainingMs, isExpired, progress } = useCountdown(deadlineMs);
  const ringCircumference = 2 * Math.PI * 52;
  const ringOffset = ringCircumference * (1 - Math.min(progress, 1));

  return (
    <div className="gr-countdown">
      <svg className="clock-ring" viewBox="0 0 140 140" aria-hidden>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#57e2ff" />
            <stop offset="100%" stopColor="#ffbc47" />
          </linearGradient>
        </defs>
        <circle className="ring-bg" cx="70" cy="70" r="52" />
        <circle
          className="ring-fg"
          cx="70"
          cy="70"
          r="52"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringOffset}
        />
      </svg>
      <div className="gr-countdown-text">
        <span className="clock-label">{isExpired ? "Expired" : "Time Left"}</span>
        <strong className={isExpired ? "text-alert" : ""}>
          {isExpired ? "00:00:00" : formatCountdown(remainingMs)}
        </strong>
      </div>
    </div>
  );
}

function GuessRow({ guess }: { guess: GuessData }) {
  const stateClass =
    guess.state === "FINALIZED"
      ? guess.won
        ? "gr-guess--win"
        : "gr-guess--lose"
      : guess.state === "EVALUATING"
        ? "gr-guess--eval"
        : "";

  return (
    <motion.div className={`gr-guess ${stateClass}`} variants={fadeInUp}>
      <span className="mono">{truncateAddress(guess.player)}</span>
      <span className="gr-guess-state">
        {guess.state === "FINALIZED"
          ? guess.won
            ? "WON"
            : "LOST"
          : guess.state === "EVALUATING"
            ? "EVALUATING..."
            : "SUBMITTED"}
      </span>
      {guess.exactMatches != null && guess.partialMatches != null && (
        <span className="gr-guess-feedback">
          {guess.exactMatches} exact / {guess.partialMatches} partial
        </span>
      )}
      {guess.payout && BigInt(guess.payout) > 0n && (
        <span className="gr-guess-amount" style={{ color: "var(--lime)" }}>
          +{formatEth(BigInt(guess.payout))} ETH
        </span>
      )}
      {guess.slash && BigInt(guess.slash) > 0n && (
        <span className="gr-guess-amount" style={{ color: "var(--alert)" }}>
          -{formatEth(BigInt(guess.slash))} ETH
        </span>
      )}
    </motion.div>
  );
}

function HowToPlayCard() {
  return (
    <GlowCard color="cyan" delay={0.18} className="gr-help">
      <div className="gr-help-head">
        <h2 className="create-section-title">How To Crack The Code</h2>
        <span className="chip">Mastermind Rules</span>
      </div>

      <div className="gr-help-grid">
        <div className="gr-help-block">
          <span className="ps-label">Goal</span>
          <p className="small">Reach <strong>4 exact</strong>. That means every digit is correct and in the correct position.</p>
        </div>
        <div className="gr-help-block">
          <span className="ps-label">Exact</span>
          <p className="small">A digit exists in the secret and is already in the right slot.</p>
        </div>
        <div className="gr-help-block">
          <span className="ps-label">Partial</span>
          <p className="small">A digit exists in the secret, but it currently sits in the wrong slot.</p>
        </div>
        <div className="gr-help-block">
          <span className="ps-label">Strongest Clue</span>
          <p className="small"><strong>0 exact / 0 partial</strong> means none of those four digits belong in the code.</p>
        </div>
      </div>

      <div className="gr-help-example">
        <span className="ps-label">Example</span>
        <p className="small">
          If the secret were <span className="mono">5173</span> and you guessed <span className="mono">4321</span>,
          the result would be <strong>0 exact / 2 partial</strong>. Two digits belong in the code, but both are misplaced.
        </p>
      </div>

      <div className="gr-help-strategy">
        <span className="ps-label">Best Solving Pattern</span>
        <ul className="gr-help-list">
          <li>Start with four different digits to maximize information.</li>
          <li>Eliminate digits aggressively whenever you get <span className="mono">0 exact / 0 partial</span>.</li>
          <li>Once you find useful digits, rotate fewer positions per guess.</li>
          <li>Use later guesses to lock positions one by one instead of reshuffling everything.</li>
        </ul>
      </div>
    </GlowCard>
  );
}

export default function GameRoomPage() {
  const params = useParams();
  const gameId = params.id as string;
  const { data: challenge, isLoading } = useChallenge(gameId);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const { encryptDigits } = useCofhe();

  const [digits, setDigits] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [guessPhase, setGuessPhase] = useState<"idle" | "encrypting" | "submitting">("idle");
  const [guessTxHash, setGuessTxHash] = useState<string>();
  const [guessError, setGuessError] = useState<string>();

  const [finalizeIds, setFinalizeIds] = useState({ gameId: "", guessId: "" });
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeTxHash, setFinalizeTxHash] = useState<string>();
  const [finalizeError, setFinalizeError] = useState<string>();

  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{ won: boolean; amount: bigint }>({
    won: false,
    amount: 0n,
  });

  async function onGuessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuessError(undefined);

    if (!walletClient || !publicClient || !APP_CONFIG.gameAddress || !challenge) {
      setGuessError("Wallet or game address missing.");
      return;
    }

    try {
      setGuessPhase("encrypting");
      const encryptedGuess = await encryptDigits([...digits]);

      setGuessPhase("submitting");
      const hash = await writeSubmitGuess(
        publicClient,
        walletClient,
        APP_CONFIG.gameAddress,
        BigInt(gameId),
        encryptedGuess,
        BigInt(challenge.playerStake),
      );
      setGuessTxHash(hash);
      setGuessPhase("idle");
    } catch (err) {
      setGuessError(err instanceof Error ? err.message : "Failed to submit guess");
      setGuessPhase("idle");
    }
  }

  async function onFinalize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFinalizeError(undefined);

    if (!walletClient || !APP_CONFIG.gameAddress) {
      setFinalizeError("Wallet or game address missing.");
      return;
    }

    try {
      setIsFinalizing(true);
      const hash = await writeFinalizeGuess(
        walletClient,
        APP_CONFIG.gameAddress,
        BigInt(finalizeIds.gameId || gameId),
        BigInt(finalizeIds.guessId),
      );
      setFinalizeTxHash(hash);
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : "Failed to finalize");
    } finally {
      setIsFinalizing(false);
    }
  }

  if (isLoading) {
    return (
      <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
        <div className="gr-loading">
          <motion.div
            className="encrypt-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg width="60" height="60" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="8 6" />
            </svg>
          </motion.div>
          <p>Loading challenge...</p>
        </div>
      </motion.main>
    );
  }

  if (!challenge) {
    return (
      <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
        <div className="empty-state">
          <p>Challenge #{gameId} not found.</p>
          <Link href="/" className="btn">Back to Arena</Link>
        </div>
      </motion.main>
    );
  }

  const isActive = challenge.active && !challenge.solved;

  return (
    <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
      <GuessResult
        visible={showResult}
        won={resultData.won}
        amount={resultData.amount}
        onClose={() => setShowResult(false)}
      />

      {/* Header */}
      <motion.div className="gr-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="gr-header-left">
          <Link href="/" className="gr-back">&larr; Arena</Link>
          <h1 className="page-title">Challenge #{gameId}</h1>
        </div>
        <span className={`cc-badge ${challenge.solved ? "cc-badge--solved" : isActive ? "cc-badge--active" : "cc-badge--closed"}`}>
          {challenge.solved ? "SOLVED" : isActive ? "ACTIVE" : "CLOSED"}
        </span>
      </motion.div>

      {/* Game Info */}
      <div className="gr-info-grid">
        <GlowCard color="cyan" delay={0.1}>
          <GameCountdown deadline={challenge.deadline} />
        </GlowCard>

        <GlowCard color="amber" delay={0.15}>
          <div className="gr-stats">
            <div className="gr-stat">
              <span className="ps-label">Creator</span>
              <strong className="mono">{truncateAddress(challenge.creator)}</strong>
            </div>
            <div className="gr-stat">
              <span className="ps-label">Prize Pool</span>
              <strong>{formatEth(BigInt(challenge.creatorStake))} ETH</strong>
            </div>
            <div className="gr-stat">
              <span className="ps-label">Entry Fee</span>
              <strong>{formatEth(BigInt(challenge.playerStake))} ETH</strong>
            </div>
            <div className="gr-stat">
              <span className="ps-label">Win Payout</span>
              <strong>{bpsToPercent(challenge.payoutBps)}</strong>
            </div>
            <div className="gr-stat">
              <span className="ps-label">Slash Rate</span>
              <strong>{bpsToPercent(challenge.slashBps)}</strong>
            </div>
            <div className="gr-stat">
              <span className="ps-label">Attempts</span>
              <strong>{challenge.attemptCount} / {challenge.maxAttempts}</strong>
            </div>
          </div>
        </GlowCard>
      </div>

      <HowToPlayCard />

      {/* Submit Guess */}
      {isActive && (
        <GlowCard color="lime" delay={0.2} className="gr-guess-section">
          <h2 className="create-section-title">Submit Your Guess</h2>
          <p className="small">You win by finding all 4 exact matches. Each resolved guess reveals exact and partial matches.</p>
          <form onSubmit={onGuessSubmit}>
            <div className="create-digit-wrap">
              <DigitWheel value={digits} onChange={setDigits} disabled={guessPhase !== "idle"} />
            </div>

            {guessPhase !== "idle" && (
              <div className="encrypt-animation" style={{ margin: "16px 0" }}>
                <motion.div
                  className="encrypt-ring"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <svg width="40" height="40" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="var(--lime)" strokeWidth="2" strokeDasharray="8 6" />
                  </svg>
                </motion.div>
                <p className="small">{guessPhase === "encrypting" ? "Encrypting guess..." : "Submitting tx..."}</p>
              </div>
            )}

            <motion.button
              type="submit"
              className="btn alt create-submit"
              disabled={!isConnected || guessPhase !== "idle"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {!mounted
                ? "Loading..."
                : !isConnected
                  ? "Connect Wallet"
                  : guessPhase !== "idle"
                    ? "Processing..."
                    : `Submit Guess (${formatEth(BigInt(challenge.playerStake))} ETH)`}
            </motion.button>
          </form>

          {guessTxHash && (
            <p className="mono status status--ok">
              tx:{" "}
              <a href={baseScanTx(guessTxHash)} target="_blank" rel="noopener noreferrer">
                {guessTxHash.slice(0, 16)}...
              </a>
            </p>
          )}
          {guessError && <p className="mono status status--error">{guessError}</p>}
        </GlowCard>
      )}

      {/* Finalize */}
      <GlowCard delay={0.25} className="gr-guess-section">
        <h2 className="create-section-title">Finalize Guess</h2>
        <p className="small">Pull-based settlement: anyone can finalize once decrypt result is ready.</p>
        <form onSubmit={onFinalize} className="form-stack">
          <div className="row">
            <label>
              Guess ID
              <input
                value={finalizeIds.guessId}
                onChange={(e) => setFinalizeIds((p) => ({ ...p, guessId: e.target.value }))}
                placeholder="e.g. 1"
                required
              />
            </label>
          </div>
          <button type="submit" className="btn" disabled={isFinalizing || !isConnected}>
            {isFinalizing ? "Finalizing..." : "Finalize Guess"}
          </button>
        </form>
        {finalizeTxHash && (
          <p className="mono status status--ok">
            tx:{" "}
            <a href={baseScanTx(finalizeTxHash)} target="_blank" rel="noopener noreferrer">
              {finalizeTxHash.slice(0, 16)}...
            </a>
          </p>
        )}
        {finalizeError && <p className="mono status status--error">{finalizeError}</p>}
      </GlowCard>

      {/* Guess History */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="section-title">Guess History</h2>
        {!challenge.guesses?.length ? (
          <p className="small" style={{ color: "var(--muted)" }}>No guesses submitted yet.</p>
        ) : (
          <motion.div className="gr-guess-list" variants={staggerContainer} initial="hidden" animate="show">
            {challenge.guesses.map((g) => (
              <GuessRow key={g.id} guess={g} />
            ))}
          </motion.div>
        )}
      </motion.section>
    </motion.main>
  );
}
