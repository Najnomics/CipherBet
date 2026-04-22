import type { Variants } from "framer-motion";

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const scaleIn: Variants = {
  hidden: { scale: 0.92, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { duration: 0.45 } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

export const resultReveal: Variants = {
  hidden: { scale: 0.5, opacity: 0, rotateY: 90 },
  show: {
    scale: 1,
    opacity: 1,
    rotateY: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};
