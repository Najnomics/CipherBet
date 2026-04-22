"use client";

import { AnimatePresence, motion } from "framer-motion";

import { resultReveal } from "@/lib/motion-variants";
import { formatEth } from "@/lib/utils";

interface GuessResultProps {
  visible: boolean;
  won: boolean;
  amount: bigint;
  onClose: () => void;
}

export function GuessResult({ visible, won, amount, onClose }: GuessResultProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="result-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`result-card ${won ? "result-card--win" : "result-card--lose"}`}
            variants={resultReveal}
            initial="hidden"
            animate="show"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="result-icon">
              {won ? (
                <motion.svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <circle cx="36" cy="36" r="34" fill="none" stroke="var(--lime)" strokeWidth="3" />
                  <path
                    d="M20 36l10 10 22-22"
                    fill="none"
                    stroke="var(--lime)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              ) : (
                <motion.svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <circle cx="36" cy="36" r="34" fill="none" stroke="var(--alert)" strokeWidth="3" />
                  <path
                    d="M24 24l24 24M48 24l-24 24"
                    fill="none"
                    stroke="var(--alert)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </motion.svg>
              )}
            </div>

            <motion.h2
              className="result-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {won ? "CORRECT GUESS" : "WRONG GUESS"}
            </motion.h2>

            <motion.p
              className="result-amount"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              {won ? `+${formatEth(amount)} ETH` : `-${formatEth(amount)} ETH`}
            </motion.p>

            <motion.p
              className="result-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              {won ? "Payout has been sent to your wallet" : "Slash deducted from your stake"}
            </motion.p>

            <motion.button
              type="button"
              className="btn"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
