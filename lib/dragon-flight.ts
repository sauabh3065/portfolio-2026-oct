/** Deterministic choreography in seconds. Every animated system uses this clock. */
export type BattleMode = "idle" | "running" | "paused";
export type FlightSample = {
  x: number; y: number; z: number;
  yaw: number; pitch: number; bank: number;
  flight: number; wings: number; crouch: number; attack: number;
};
export const TAKEOFF_DURATION = 3.6;
export const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return Math.max(0, Math.min(1, x * x * x * (x * (x * 6 - 15) + 10)));
};
/** Takeoff is sampled independently from the combat round. The endpoint keeps
 * both dragons facing each other, avoiding a heading snap into the first clash. */
export function sampleFlight(time: number, index: number): FlightSample {
  const side = index === 0 ? -1 : 1;
  const ascent = smooth(0.85, 2.5, time);
  return {
    x: side * 3, y: (1.65 + index * 0.35) * ascent, z: 0,
    yaw: -side * Math.PI / 2,
    pitch: -Math.sin(ascent * Math.PI) * 0.12, bank: 0,
    flight: smooth(0.85, 2.4, time), wings: smooth(0.35, 1.5, time),
    crouch: 0.2 * smooth(0, 0.55, time) * (1 - smooth(0.55, 1, time)),
    attack: 0,
  };
}
