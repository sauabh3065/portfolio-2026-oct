"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Swords } from "lucide-react";

import type { DragonSceneState } from "../lib/dragon-scene";

export default function DragonBattle() {
  const host = useRef<HTMLDivElement>(null);
  const sceneState = useRef<DragonSceneState>({ mode: "idle", reducedMotion: false, round: 0, seed: 0 });
  const [mode, setMode] = useState<DragonSceneState["mode"]>("idle");
  const [winner, setWinner] = useState<number | null>(null);
  const [status, setStatus] = useState("Preparing the arena…");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const abort = new AbortController();
    let cleanup = () => {};
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      sceneState.current.reducedMotion = preference.matches;
      if (preference.matches && sceneState.current.mode === "running") {
        sceneState.current.mode = "paused";
        setMode("paused");
      }
    };
    applyPreference();
    preference.addEventListener("change", applyPreference);
    import("../lib/dragon-scene")
      .then(({ createDragonScene }) => createDragonScene(element, () => sceneState.current, abort.signal, victor => {
        if (abort.signal.aborted) return;
        sceneState.current.mode = "finished";
        setWinner(victor); setMode("finished");
      }))
      .then(dispose => {
        if (abort.signal.aborted) { dispose(); return; }
        cleanup = dispose;
        setStatus("");
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        console.error("Unable to render the dragon battle:", error);
        cleanup();
        setFailed(true);
        setStatus("The arena could not load. Check your connection and WebGL support, then try again.");
      });
    return () => {
      abort.abort();
      preference.removeEventListener("change", applyPreference);
      cleanup();
    };
  }, [attempt]);

  function advance() {
    if (sceneState.current.mode === "idle" || sceneState.current.mode === "finished") {
      sceneState.current.round += 1;
      sceneState.current.seed = crypto.getRandomValues(new Uint32Array(1))[0];
      setWinner(null);
    }
    const next = sceneState.current.mode === "running" ? "paused" : "running";
    sceneState.current.mode = next;
    setMode(next);
  }

  function retry() {
    sceneState.current.mode = "idle";
    setMode("idle"); setFailed(false); setStatus("Preparing the arena…");
    setAttempt(value => value + 1);
  }

  const label = mode === "idle" ? "Fight" : mode === "running" ? "Pause" : mode === "finished" ? "Fight Again" : "Resume";
  return (
    <div className="room-canvas dragon-canvas" data-battle-state={mode} data-winner={winner === null ? undefined : winner === 0 ? "fire" : "ice"}>
      {/* Keep Three.js's canvas isolated from React's controls and status updates. */}
      <div ref={host} className="room-renderer" tabIndex={0} role="img"
        aria-label="Red and blue dragons on a stone arena. Start their battle with Fight. Drag or use the arrow keys to rotate the view when the battle is not paused."
        aria-describedby="dragon-battle-description" />
      {status && <div className="scene-status" role="status">{status}{failed && <button className="battle-button" onClick={retry}>Try again</button>}</div>}
      {!status && <div className="battle-controls">
        <p id="dragon-battle-description" aria-live="polite">
          {mode === "idle" ? "Two rivals. Your call." : mode === "paused" ? "Battle paused" : mode === "finished" ? (winner === 0 ? "Fire Dragon Wins" : "Ice Dragon Wins") : "Ember vs. Frost"}
        </p>
        <button className="battle-button" onClick={advance} aria-label={label + (mode === "idle" ? ": start the dragon battle" : " dragon battle")}>
          {mode === "idle" ? <Swords size={16} /> : mode === "running" ? <Pause size={16} /> : <Play size={16} />}
          {label}
        </button>
      </div>}
    </div>
  );
}
