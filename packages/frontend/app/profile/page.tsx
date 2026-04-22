"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAccount } from "wagmi";

import { GlowCard } from "@/components/ui/glow-card";
import { pageTransition, staggerContainer, fadeInUp } from "@/lib/motion-variants";
import { formatEth, truncateAddress } from "@/lib/utils";
import { useUserProfile } from "@/lib/hooks/use-leaderboard";
import { useMounted } from "@/lib/hooks/use-mounted";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: profile, isLoading } = useUserProfile(address);
  const mounted = useMounted();

  if (!mounted || !isConnected) {
    return (
      <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="24" r="12" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
            <path d="M10 56c0-12 10-20 22-20s22 8 22 20" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
          </svg>
          <p>Connect your wallet to view your profile.</p>
        </div>
      </motion.main>
    );
  }

  const winRate =
    profile && profile.totalGuessesSubmitted > 0
      ? ((profile.totalGuessesWon / profile.totalGuessesSubmitted) * 100).toFixed(1)
      : "0.0";

  const totalPayout = profile ? BigInt(profile.totalPayoutWon) : 0n;
  const totalSlashed = profile ? BigInt(profile.totalSlashed) : 0n;
  const netPnl = totalPayout - totalSlashed;
  const isProfitable = netPnl >= 0n;

  return (
    <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title">
          <span className="glitch-text">Player Profile</span>
        </h1>
        <p className="page-sub mono">{address ? truncateAddress(address, 8) : ""}</p>
      </motion.div>

      {isLoading ? (
        <div className="gr-loading">
          <motion.div
            className="encrypt-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg width="48" height="48" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="8 6" />
            </svg>
          </motion.div>
        </div>
      ) : !profile ? (
        <motion.div className="empty-state" variants={fadeInUp} initial="hidden" animate="show">
          <p>No activity found for this address.</p>
          <Link href="/" className="btn">Enter the Arena</Link>
        </motion.div>
      ) : (
        <motion.div
          className="profile-grid"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeInUp}>
            <GlowCard color="cyan">
              <h3 className="create-section-title">Overview</h3>
              <div className="profile-stats">
                <div className="gr-stat">
                  <span className="ps-label">Challenges Created</span>
                  <strong>{profile.totalChallengesCreated}</strong>
                </div>
                <div className="gr-stat">
                  <span className="ps-label">Guesses Submitted</span>
                  <strong>{profile.totalGuessesSubmitted}</strong>
                </div>
                <div className="gr-stat">
                  <span className="ps-label">Wins</span>
                  <strong>{profile.totalGuessesWon}</strong>
                </div>
                <div className="gr-stat">
                  <span className="ps-label">Win Rate</span>
                  <strong>{winRate}%</strong>
                </div>
              </div>
            </GlowCard>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <GlowCard color={isProfitable ? "lime" : "alert"}>
              <h3 className="create-section-title">Profit & Loss</h3>
              <div className="profile-stats">
                <div className="gr-stat">
                  <span className="ps-label">Total Payouts</span>
                  <strong style={{ color: "var(--lime)" }}>+{formatEth(totalPayout)} ETH</strong>
                </div>
                <div className="gr-stat">
                  <span className="ps-label">Total Slashed</span>
                  <strong style={{ color: "var(--alert)" }}>-{formatEth(totalSlashed)} ETH</strong>
                </div>
                <div className="gr-stat">
                  <span className="ps-label">Net P&L</span>
                  <strong style={{ color: isProfitable ? "var(--lime)" : "var(--alert)" }}>
                    {isProfitable ? "+" : ""}{formatEth(netPnl)} ETH
                  </strong>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}
