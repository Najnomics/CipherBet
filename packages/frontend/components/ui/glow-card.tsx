"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  color?: "cyan" | "amber" | "lime" | "alert";
  className?: string;
  delay?: number;
}

export function GlowCard({ children, color = "cyan", className, delay = 0 }: GlowCardProps) {
  return (
    <motion.div
      className={clsx("glow-card", `glow-card--${color}`, className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {children}
    </motion.div>
  );
}
