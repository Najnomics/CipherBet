"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { fadeInUp } from "@/lib/motion-variants";
import { formatCountdown, formatEth, truncateAddress, bpsToPercent } from "@/lib/utils";
import { useCountdown } from "@/lib/hooks/use-countdown";
import type { ChallengeData } from "@/lib/hooks/use-challenges";

interface ChallengeCardProps {
  challenge: ChallengeData;
}

function CardCountdown({ deadline }: { deadline: string }) {
  const deadlineMs = parseInt(deadline) * 1000;
  const { remainingMs, isExpired } = useCountdown(deadlineMs);

  return (
    <span className={`cc-countdown ${isExpired ? "cc-countdown--expired" : ""}`}>
      {isExpired ? "EXPIRED" : formatCountdown(remainingMs)}
    </span>
  );
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const statusLabel = challenge.solved
    ? "SOLVED"
    : challenge.active
      ? "ACTIVE"
      : "CLOSED";

  const statusClass = challenge.solved
    ? "cc-badge--solved"
    : challenge.active
      ? "cc-badge--active"
      : "cc-badge--closed";

  return (
    <motion.div className="cc-card" variants={fadeInUp}>
      <div className="cc-header">
        <span className={`cc-badge ${statusClass}`}>{statusLabel}</span>
        <span className="cc-id">#{challenge.id}</span>
      </div>

      <div className="cc-body">
        <div className="cc-row">
          <span className="cc-label">Creator</span>
          <span className="cc-value mono">{truncateAddress(challenge.creator)}</span>
        </div>
        <div className="cc-row">
          <span className="cc-label">Prize Pool</span>
          <span className="cc-value cc-value--highlight">
            {formatEth(BigInt(challenge.creatorStake))} ETH
          </span>
        </div>
        <div className="cc-row">
          <span className="cc-label">Entry Fee</span>
          <span className="cc-value">
            {formatEth(BigInt(challenge.playerStake))} ETH
          </span>
        </div>
        <div className="cc-row">
          <span className="cc-label">Win Payout</span>
          <span className="cc-value">{bpsToPercent(challenge.payoutBps)}</span>
        </div>
        <div className="cc-row">
          <span className="cc-label">Attempts</span>
          <span className="cc-value">
            {challenge.attemptCount} / {challenge.maxAttempts}
          </span>
        </div>
        <div className="cc-row">
          <span className="cc-label">Time Left</span>
          <CardCountdown deadline={challenge.deadline} />
        </div>
      </div>

      {challenge.active && !challenge.solved && (
        <Link href={`/game/${challenge.id}`} className="cc-enter">
          Enter Arena
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </motion.div>
  );
}
