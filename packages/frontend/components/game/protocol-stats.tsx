"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

import { useProtocolStats } from "@/lib/hooks/use-leaderboard";

function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [count, value]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(v);
    });
    return unsubscribe;
  }, [rounded]);

  return (
    <motion.div
      className="ps-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="ps-label">{label}</span>
      <strong className="ps-value">
        <span ref={ref}>0</span>
      </strong>
    </motion.div>
  );
}

export function ProtocolStats() {
  const { data: stats } = useProtocolStats();

  const items = [
    { label: "Total Challenges", value: stats?.totalChallenges ?? 0 },
    { label: "Active", value: stats?.activeChallenges ?? 0 },
    { label: "Solved", value: stats?.solvedChallenges ?? 0 },
    { label: "Total Guesses", value: stats?.totalGuesses ?? 0 },
  ];

  return (
    <div className="ps-bar">
      {items.map((item) => (
        <AnimatedCounter key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
