import { sampleFlight, smooth, type FlightSample } from "./dragon-flight";

export type AttackKind = "claw" | "bite" | "tail" | "breath" | "grapple" | "collision";
export type CombatAnimation = {
  threat: number; claw: number; bite: number; tail: number; grapple: number;
  block: number; charge: number; hit: number; fatigue: number; collapse: number;
  roar: number; walk: number; feetPinned: boolean;
};
export type CombatPose = FlightSample & Partial<CombatAnimation>;
export type Vec3 = { x: number; y: number; z: number };
export type Contact = { point: Vec3; target: Vec3; distance: number; radius: number };
export type CombatBeat = {
  start: number; duration: number; kind: AttackKind; attacker: number;
  defense: "hit" | "block" | "dodge"; damage: number; angle: number;
  ground?: boolean; final?: boolean;
};
export type Impact = { time: number; attacker: number; defender: number; kind: AttackKind; point: Vec3; damage: number };
const mix = (a: number, b: number, f: number) => a + (b - a) * f;
const pulse = (a: number, b: number, c: number, d: number, t: number) => smooth(a, b, t) * (1 - smooth(c, d, t));

export class DragonRound {
  time = 0;
  wingTime = [0, 0];
  health = [100, 100];
  winner: number | null = null;
  defeatTime: number | null = null;
  impacts: Impact[] = [];
  private connected = new Set<number>();
  readonly lead: number;
  readonly beats: CombatBeat[];
  private defeatPoses: CombatPose[] | null = null;

  constructor(seed: number) {
    this.lead = seed & 1;
    const rival = 1 - this.lead;
    const mirror = seed & 2 ? -1 : 1;
    const list: Omit<CombatBeat, "start">[] = [
      { duration: 3.3, kind: "claw", attacker: this.lead, defense: "block", damage: 0, angle: 0 },
      { duration: 3.1, kind: "bite", attacker: rival, defense: "dodge", damage: 0, angle: 0.38 },
      { duration: 3.5, kind: "tail", attacker: this.lead, defense: "hit", damage: 22, angle: -0.25 },
      { duration: 3.4, kind: "breath", attacker: rival, defense: "hit", damage: 17, angle: 0.2 },
      { duration: 4.0, kind: "bite", attacker: rival, defense: "hit", damage: 22, angle: -0.16, ground: true },
      { duration: 3.8, kind: "grapple", attacker: this.lead, defense: "hit", damage: 24, angle: 0.28 },
      { duration: 3.4, kind: "breath", attacker: this.lead, defense: "hit", damage: 18, angle: -0.2 },
      { duration: 3.4, kind: "claw", attacker: rival, defense: "hit", damage: 20, angle: 0.2 },
      { duration: 3.4, kind: "collision", attacker: this.lead, defense: "hit", damage: 100, angle: 0, final: true },
    ];
    let start = 4.8;
    this.beats = list.map(beat => { const result = { ...beat, angle: beat.angle * mirror, start }; start += beat.duration; return result; });
  }
  get finished() { return this.defeatTime !== null && this.time >= this.defeatTime + 4.6; }
  get beat() {
    if (this.winner !== null) return null;
    return this.beats.find(b => this.time >= b.start && this.time < b.start + b.duration) ?? (this.time >= this.beats.at(-1)!.start ? this.beats.at(-1)! : null);
  }
  get phase() {
    if (this.finished) return "finished";
    if (this.winner !== null) return "landing";
    if (this.time < 1.2) return "threat";
    if (this.time < 4.8) return "takeoff";
    return this.beat?.kind ?? "recover";
  }
  progress(beat = this.beat) {
    if (!beat) return 0;
    const elapsed = this.time - beat.start;
    // If a finishing strike misses, recover and try again. Never award a
    // time-based knockout or damage without an actual contact report.
    return beat.final ? (elapsed % beat.duration) / beat.duration : elapsed / beat.duration;
  }
  advance(dt: number) {
    if (!this.finished) {
      const step = Math.max(0, Math.min(dt, 0.1));
      this.time += step;
      if (this.time > 1.2) this.wingTime.forEach((_, i) => { this.wingTime[i] += step * (0.85 + this.health[i] / 100 * 0.15); });
    }
  }
  activeStrike() {
    const beat = this.beat, progress = this.progress(beat);
    if (!beat || progress < 0.43 || progress > 0.65 || this.connected.has(beat.start)) return null;
    return beat;
  }
  registerContact(contact: Contact): boolean {
    const beat = this.activeStrike();
    if (!beat || !Number.isFinite(contact.distance) || contact.distance > contact.radius) return false;
    if (beat.defense === "dodge") return false;
    this.connected.add(beat.start);
    const defender = 1 - beat.attacker;
    const damage = beat.defense === "block" ? 0 : Math.min(this.health[defender], beat.damage);
    this.health[defender] -= damage;
    this.impacts.push({ time: this.time, attacker: beat.attacker, defender, kind: beat.kind, point: { ...contact.point }, damage });
    if (this.health[defender] === 0) {
      this.defeatPoses = [this.sample(0), this.sample(1)];
      this.winner = beat.attacker;
      this.defeatTime = this.time;
    }
    return true;
  }
  reaction(index: number) {
    const impact = this.impacts.at(-1);
    if (!impact) return 0;
    const affected = impact.damage > 0 ? impact.defender : impact.attacker;
    if (affected !== index) return 0;
    return pulse(0, 0.06, 0.16, 0.75, this.time - impact.time);
  }
  sample(index: number): CombatPose {
    const side = index === 0 ? -1 : 1;
    const inward = -side * Math.PI / 2;
    const fatigue = 1 - this.health[index] / 100;
    if (this.defeatTime !== null && this.defeatPoses) {
      const t = Math.min(this.time - this.defeatTime, 4.6);
      const loser = index !== this.winner;
      const original = this.defeatPoses[index];
      const land = smooth(loser ? 0.15 : 0.45, loser ? 2.0 : 2.6, t);
      const collapse = loser ? smooth(1.5, 2.65, t) : 0;
      return {
        ...original,
        x: mix(original.x, side * (loser ? 2.25 : 2.1), smooth(0, 2.4, t)),
        y: Math.max(0, original.y * (1 - land)),
        z: mix(original.z, loser ? 0.7 : -0.4, smooth(0, 2.4, t)),
        yaw: mix(original.yaw, inward, smooth(0, 2.4, t)),
        pitch: loser ? 0.2 * Math.sin(land * Math.PI) : 0,
        bank: loser ? collapse * 1.35 : original.bank * (1 - land),
        flight: original.flight * (1 - land), wings: original.wings * (1 - land),
        crouch: 0, attack: 0, claw: 0, bite: 0, tail: 0, grapple: 0,
        block: 0, charge: 0, threat: 0, hit: 0,
        collapse, roar: loser ? 0 : pulse(2.55, 2.95, 3.45, 4.4, t),
        fatigue, walk: 0, feetPinned: false,
      };
    }
    if (this.time < 1.2) return {
      x: side * 3, y: 0, z: 0, yaw: inward, pitch: 0, bank: 0,
      flight: 0, wings: 0, crouch: 0.04 * Math.sin(this.time / 1.2 * Math.PI), attack: 0,
      threat: pulse(0, 0.4, 0.75, 1.2, this.time), feetPinned: true, fatigue,
    };
    if (this.time < 4.8) {
      const sample = sampleFlight(this.time - 1.2, index);
      return { ...sample, y: sample.y - index * 0.35 * smooth(1.6, 3.6, this.time - 1.2), fatigue };
    }
    const beat = this.beat!;
    const u = this.progress(beat);
    const attacker = index === beat.attacker;
    const close = pulse(0.1, 0.46, 0.68, 1, u);
    const strike = pulse(0.18, 0.46, 0.6, 0.9, u);
    const contact = pulse(0.35, 0.47, 0.59, 0.78, u);
    const windup = pulse(0.03, 0.22, 0.38, 0.49, u);
    const previous = this.beats[Math.max(0, this.beats.indexOf(beat) - 1)];
    const angle = mix(previous === beat ? 0 : previous.angle, beat.angle, smooth(0, 0.3, u));
    const near = beat.kind === "collision" ? 0.52 : beat.kind === "grapple" ? 0.80 : beat.kind === "tail" ? 1.17 : beat.kind === "breath" ? 2.1 : beat.kind === "claw" ? 0.8 : 1.03;
    const dodge = !attacker && beat.defense === "dodge" ? pulse(0.23, 0.46, 0.67, 0.98, u) : 0;
    const grounded = beat.ground ? pulse(0, 0.3, 0.72, 1, u) : 0;
    const lastGround = previous !== beat && previous.ground;
    const altitude = (1 - grounded) * (1.65 + 0.16 * Math.sin(u * Math.PI) * (attacker ? 1 : -1));
    const reaction = this.reaction(index);
    const localX = side * mix(3, near, close) + side * reaction * 0.18;
    const localZ = (beat.kind === "grapple" ? side * 0.28 : side * 0.12) * close + dodge * side * 1.45;
    const tailTurn = attacker && beat.kind === "tail" ? Math.PI * strike : 0;
    return {
      x: localX * Math.cos(angle) - localZ * Math.sin(angle),
      y: altitude + dodge * 0.5 - fatigue * 0.07 * Math.sin(this.time * 1.7) * Math.sin(u * Math.PI) * (1 - grounded),
      z: localX * Math.sin(angle) + localZ * Math.cos(angle),
      yaw: inward - angle + tailTurn,
      pitch: -windup * (attacker ? 0.08 : 0) + reaction * 0.13,
      bank: beat.defense === "dodge" && !attacker ? Math.PI * 2 * smooth(0.26, 0.74, u) : side * Math.sin(u * Math.PI * 2) * 0.12 * (1 - grounded),
      flight: 1 - grounded, wings: 1 - grounded,
      crouch: grounded * windup * 0.1,
      attack: attacker && beat.kind === "breath" ? contact : 0,
      claw: attacker && beat.kind === "claw" ? strike : 0,
      bite: attacker && beat.kind === "bite" ? strike : 0,
      tail: attacker && beat.kind === "tail" ? strike : 0,
      grapple: beat.kind === "grapple" ? strike : 0,
      block: !attacker && beat.defense === "block" ? strike : 0,
      charge: attacker && beat.kind === "breath" ? windup : 0,
      threat: 0, hit: reaction, fatigue, collapse: 0, roar: 0,
      walk: grounded * Math.sin(close * Math.PI), feetPinned: grounded > 0.98,
      // Keep canonical endpoints shared by consecutive exchanges.
      ...(u < 0.001 && lastGround ? { flight: 1, wings: 1 } : {}),
    };
  }
}

export function distanceToSegment(point: Vec3, a: Vec3, b: Vec3) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy + (point.z - a.z) * dz) / Math.max(1e-9, dx * dx + dy * dy + dz * dz)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy, point.z - a.z - t * dz);
}
