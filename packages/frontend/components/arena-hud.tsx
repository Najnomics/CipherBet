"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function ArenaHud() {
  const [now, setNow] = useState(() => Date.now());
  const [windowStart] = useState(() => Date.now());

  const endTs = useMemo(() => {
    const envTs = Number(process.env.NEXT_PUBLIC_ARENA_DEMO_END_TS);
    if (!Number.isNaN(envTs) && envTs > Date.now()) {
      return envTs;
    }
    return windowStart + DEFAULT_WINDOW_MS;
  }, [windowStart]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, endTs - now);
  const elapsedMs = Math.max(0, now - windowStart);
  const progress = Math.min(1, elapsedMs / DEFAULT_WINDOW_MS);
  const ringCircumference = 2 * Math.PI * 52;
  const ringOffset = ringCircumference * (1 - progress);

  return (
    <section className="hud">
      <article className="hud-card hud-card--status">
        <p className="hud-title">Arena Status</p>
        <div className="hud-grid">
          <div>
            <span className="hud-label">Network</span>
            <strong>Base Sepolia</strong>
          </div>
          <div>
            <span className="hud-label">Protocol</span>
            <strong>CipherBet v1</strong>
          </div>
          <div>
            <span className="hud-label">Privacy Engine</span>
            <strong>CoFHE Live</strong>
          </div>
          <div>
            <span className="hud-label">Settlement</span>
            <strong>Pull Finalize</strong>
          </div>
        </div>
      </article>

      <article className="hud-card hud-card--clock">
        <p className="hud-title">Arena Countdown</p>
        <div className="clock-wrap">
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
          <div className="clock-core">
            <span className="clock-label">Time Left</span>
            <strong>{formatRemaining(remainingMs)}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
