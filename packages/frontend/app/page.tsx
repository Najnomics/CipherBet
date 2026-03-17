import { AnalyticsPanel } from "@/components/analytics-panel";
import { ArenaHud } from "@/components/arena-hud";
import { CreateChallengeForm } from "@/components/create-challenge-form";
import { FinalizeGuessForm } from "@/components/finalize-guess-form";
import { SubmitGuessForm } from "@/components/submit-guess-form";

export default function HomePage() {
  return (
    <main className="arena">
      <section className="hero">
        <svg className="hero-reticle" viewBox="0 0 220 220" aria-hidden>
          <circle cx="110" cy="110" r="82" />
          <circle cx="110" cy="110" r="54" />
          <path d="M110 18v28M110 174v28M18 110h28M174 110h28" />
        </svg>
        <p className="hero-kicker">FHE-Native Onchain Arena</p>
        <h1>CipherBet Protocol</h1>
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
      </section>

      <ArenaHud />

      <section className="grid">
        <CreateChallengeForm />
        <SubmitGuessForm />
        <FinalizeGuessForm />
        <AnalyticsPanel />
      </section>
    </main>
  );
}
