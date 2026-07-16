import { useEffect, useState } from "react";
import logo from "@/assets/north-logo.png";

const LABELS = [
  "Initializing systems...",
  "Loading modules...",
  "Connecting to grid...",
  "Verifying integrity...",
  "Almost ready...",
];

const SESSION_KEY = "north_splash_shown";

export function Splash() {
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState(LABELS[0]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Show once per session
    if (sessionStorage.getItem(SESSION_KEY)) {
      setGone(true);
      setHidden(true);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    const dur = 1800;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const v = Math.round(e * 100);
      setPct(v);
      setLabel(LABELS[Math.min(LABELS.length - 1, Math.floor(e * LABELS.length))]);
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setTimeout(() => {
          setGone(true);
          setTimeout(() => setHidden(true), 650);
        }, 180);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (hidden) return null;

  return (
    <div id="splash" className={gone ? "gone" : ""}>
      <div className="splash-orbit">
        <div className="splash-mark">
          <img src={logo} alt="North" />
        </div>
      </div>
      <div>
        <div className="splash-brand">
          NORTH<span style={{ color: "var(--v2)" }}>·</span>STORE
        </div>
        <div className="splash-tag">{label}</div>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-info">
          <span>Loading Modules</span>
          <span className="pct">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
