"use client";

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useMemo, useState } from "react";

export function ParticleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      particles: {
        number: { value: 36, density: { enable: true, width: 1200, height: 800 } },
        color: { value: ["#57e2ff", "#ffbc47", "#95f67a"] },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 2.5 } },
        move: {
          enable: true,
          speed: 0.4,
          direction: "none" as const,
          outModes: { default: "bounce" as const },
        },
        links: {
          enable: true,
          distance: 160,
          color: "#57e2ff",
          opacity: 0.12,
          width: 1,
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" as const },
        },
        modes: {
          grab: { distance: 140, links: { opacity: 0.3 } },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (!ready) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="particle-bg"
    />
  );
}
