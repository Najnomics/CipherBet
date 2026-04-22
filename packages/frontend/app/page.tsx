"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { ChallengeCard } from "@/components/game/challenge-card";
import { Leaderboard } from "@/components/game/leaderboard";
import { ProtocolStats } from "@/components/game/protocol-stats";
import { staggerContainer, fadeInUp, pageTransition } from "@/lib/motion-variants";
import { useActiveChallenges } from "@/lib/hooks/use-challenges";

export default function HomePage() {
  const { data: challenges, isLoading } = useActiveChallenges();

  return (
    <motion.main className="arena" variants={pageTransition} initial="initial" animate="animate">
      {/* Hero */}
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <svg className="hero-reticle" viewBox="0 0 220 220" aria-hidden>
          <circle cx="110" cy="110" r="82" />
          <circle cx="110" cy="110" r="54" />
          <path d="M110 18v28M110 174v28M18 110h28M174 110h28" />
        </svg>
        <p className="hero-kicker">FHE-Native Onchain Arena</p>
        <h1>
          <span className="glitch-text">CipherBet Protocol</span>
        </h1>
        <p className="hero-copy">
          Enter encrypted challenge rooms backed by real ETH. Secrets stay hidden, guesses stay
          private, and settlement happens onchain with no referee.
        </p>
        <div className="hero-strip">
          <article className="hero-stat">
            <span className="hero-stat-label">Engine</span>
            <strong>Fhenix CoFHE</strong>
          </article>
          <article className="hero-stat">
            <span className="hero-stat-label">Mode</span>
            <strong>Single-Winner</strong>
          </article>
          <article className="hero-stat">
            <span className="hero-stat-label">Settlement</span>
            <strong>Pull Finalize</strong>
          </article>
        </div>
      </motion.section>

      {/* Protocol Stats */}
      <ProtocolStats />

      {/* Active Challenges */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="section-head">
          <h2 className="section-title">Active Challenges</h2>
          <Link href="/create" className="btn">
            Create Challenge
          </Link>
        </div>

        {isLoading ? (
          <div className="cc-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="cc-skeleton" />
            ))}
          </div>
        ) : !challenges?.length ? (
          <motion.div className="empty-state" variants={fadeInUp} initial="hidden" animate="show">
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
              <polygon
                points="32,4 60,18 60,46 32,60 4,46 4,18"
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="2"
              />
              <circle cx="32" cy="32" r="8" fill="none" stroke="var(--cyan)" strokeWidth="2" opacity="0.5" />
            </svg>
            <p>No active challenges yet.</p>
            <Link href="/create" className="btn">
              Be the First Creator
            </Link>
          </motion.div>
        ) : (
          <motion.div
            className="cc-grid"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {challenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* Leaderboard */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Leaderboard />
      </motion.section>
    </motion.main>
  );
}
