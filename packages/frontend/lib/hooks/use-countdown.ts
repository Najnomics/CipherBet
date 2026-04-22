"use client";

import { useEffect, useState } from "react";

export function useCountdown(deadlineMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, deadlineMs - now);
  const isExpired = remainingMs <= 0;
  const totalMs = Math.max(1, deadlineMs - (deadlineMs - 86400000)); // fallback
  const progress = isExpired ? 1 : Math.min(1, 1 - remainingMs / (deadlineMs - Date.now() + remainingMs));

  return { remainingMs, isExpired, progress };
}
