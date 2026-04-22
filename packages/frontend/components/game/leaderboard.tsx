"use client";

import { motion } from "framer-motion";

import { staggerContainer, fadeInUp } from "@/lib/motion-variants";
import { truncateAddress, formatEth } from "@/lib/utils";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";

const RANK_COLORS = ["var(--amber)", "#c0c0c0", "#cd7f32"];

export function Leaderboard() {
  const { data: entries, isLoading } = useLeaderboard();

  return (
    <div className="lb-container">
      <div className="panel-head">
        <h2>Leaderboard</h2>
        <span className="chip">Top Players</span>
      </div>

      {isLoading ? (
        <div className="lb-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="lb-skeleton" />
          ))}
        </div>
      ) : !entries?.length ? (
        <p className="small" style={{ color: "var(--muted)", padding: "16px 0" }}>
          No winners yet. Be the first to crack a code.
        </p>
      ) : (
        <motion.div
          className="lb-list"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {entries.map((entry, i) => (
            <motion.div key={entry.id} className="lb-row" variants={fadeInUp}>
              <span
                className="lb-rank"
                style={{ color: i < 3 ? RANK_COLORS[i] : "var(--muted)" }}
              >
                #{i + 1}
              </span>
              <span className="lb-address mono">{truncateAddress(entry.id)}</span>
              <span className="lb-stat">
                {entry.totalGuessesWon}W / {entry.totalGuessesSubmitted}G
              </span>
              <span className="lb-payout">
                {formatEth(BigInt(entry.totalPayoutWon))} ETH
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
