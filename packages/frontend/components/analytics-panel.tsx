"use client";

import { useMemo } from "react";

import { APP_CONFIG } from "@/lib/config";

export function AnalyticsPanel() {
  const graphHint = useMemo(() => {
    if (!APP_CONFIG.subgraphUrl) {
      return "Set NEXT_PUBLIC_SUBGRAPH_URL to enable live challenge and leaderboard queries.";
    }
    return `Subgraph endpoint configured: ${APP_CONFIG.subgraphUrl}`;
  }, []);

  return (
    <section className="panel panel--intel">
      <div className="panel-head">
        <h2>Live Analytics</h2>
        <span className="chip">Arena Feed</span>
      </div>
      <p className="small panel-subtitle">
        This panel is wired for event-driven data via subgraph. Use the provided query templates in
        `packages/subgraph` to hydrate active challenges, timeline, and user stats.
      </p>
      <p className="mono status">{graphHint}</p>
      <ul className="intel-list">
        <li className="small">Active challenges list</li>
        <li className="small">Guess lifecycle timeline</li>
        <li className="small">Creator/player leaderboard</li>
      </ul>
    </section>
  );
}
