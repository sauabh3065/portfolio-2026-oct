import * as THREE from "three";
import { DragonRound, distanceToSegment, type CombatPose } from "./dragon-combat";
import { smooth } from "./dragon-flight";
import type { createRiggedDragon } from "./dragon-model";

type Dragon = ReturnType<typeof createRiggedDragon>;
export type BreathRay = { origin: THREE.Vector3; direction: THREE.Vector3; length: number };

/** Shared by the renderer and real-skeleton tests. Damage uses deformed skin
 * vertices (claw, teeth, tail) against the opposing torso capsule. */
export function poseCombat(round: DragonRound, dragons: Dragon[]) {
  const samples: CombatPose[] = dragons.map((dragon, index) => {
    const sample = round.sample(index);
    dragon.root.position.set(sample.x, sample.y, sample.z);
    dragon.root.rotation.set(sample.pitch, sample.yaw, sample.bank, "YXZ");
    const dead = round.winner !== null && round.winner !== index;
    const animationTime = dead ? Math.min(round.wingTime[index], (round.defeatTime ?? 0) + 2.65) : round.wingTime[index];
    dragon.pose(animationTime, 0, sample, false);
    if (sample.feetPinned || (round.winner !== null && sample.y < 0.035)) dragon.ground();
    return sample;
  });
  // Keep the torso volumes tangent during grappling and shoulder impacts.
  // Wings and hands may interlock; the muscular bodies cannot pass through.
  const centers = dragons.map(d => d.bones.Body.getWorldPosition(new THREE.Vector3()));
  const delta = centers[1].clone().sub(centers[0]);
  const distance = delta.length();
  if (round.winner === null && distance < 0.8) {
    delta.normalize().multiplyScalar((0.8 - distance) / 2);
    dragons[0].root.position.sub(delta); dragons[1].root.position.add(delta);
    dragons.forEach(d => { d.root.updateMatrixWorld(true); d.mesh.skeleton.update(); });
  }
  const beat = round.beat;
  if (beat) {
    const attacker = dragons[beat.attacker], defender = dragons[1 - beat.attacker];
    const u = round.progress();
    const reach = smooth(0.26, 0.44, u) * (1 - smooth(0.64, 0.88, u));
    const target = (beat.defense === "block" ? defender.bones.LeftHand : defender.bones.UpperBack).getWorldPosition(new THREE.Vector3());
    if (beat.defense !== "block") {
      const approach = attacker.bones.UpperBack.getWorldPosition(new THREE.Vector3()).sub(target).normalize();
      target.addScaledVector(approach, 0.12);
    }
    attacker.reach(beat.kind, target, reach);
    if (beat.kind === "grapple") {
      const grip = attacker.bones.RightHand.getWorldPosition(new THREE.Vector3());
      defender.reach("grapple", grip, reach);
    }
  }
  const rays: BreathRay[] = dragons.map((dragon, i) => {
    const target = dragons[1 - i].bones.UpperBack.getWorldPosition(new THREE.Vector3());
    if ((samples[i].attack ?? 0) > 0 || (samples[i].charge ?? 0) > 0) dragon.aim(target, 1);
    const origin = dragon.mouth.getWorldPosition(new THREE.Vector3());
    // The visible stream and collision segment use exactly the same ray.
    const direction = target.sub(origin).normalize();
    return { origin, direction, length: 4.3 };
  });
  const active = round.activeStrike();
  if (active) {
    const attacker = dragons[active.attacker], defender = dragons[1 - active.attacker];
    const start = defender.bones.Body.getWorldPosition(new THREE.Vector3());
    const end = defender.bones.UpperBack.getWorldPosition(new THREE.Vector3());
    if (active.defense === "block") start.copy(defender.bones.LeftHand.getWorldPosition(new THREE.Vector3()));
    if (active.defense === "block") end.copy(start);
    let points: THREE.Vector3[], radius = active.defense === "block" ? 0.23 : 0.29;
    if (active.kind === "breath") {
      const ray = rays[active.attacker];
      points = Array.from({ length: 40 }, (_, i) => ray.origin.clone().addScaledVector(ray.direction, ray.length * i / 39));
      radius = 0.27;
    } else if (active.kind === "collision") {
      points = [attacker.bones.Body.getWorldPosition(new THREE.Vector3())];
      end.copy(start);
      radius = 0.805; // two physically touching torso capsule radii
    } else points = attacker.contactPoints(active.kind);
    points.sort((a, b) => distanceToSegment(a, start, end) - distanceToSegment(b, start, end));
    const point = points[0];
    round.registerContact({ point, target: end, distance: distanceToSegment(point, start, end), radius });
  }
  return { samples, rays };
}
