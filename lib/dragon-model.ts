import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { CCDIKSolver } from "three/addons/animation/CCDIKSolver.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { type FlightSample } from "./dragon-flight";
import type { CombatAnimation, AttackKind } from "./dragon-combat";

const SCALE = 0.4;
const vec = new THREE.Vector3();
const parentRotation = new THREE.Quaternion();

function skinMaterial(source: THREE.MeshBasicMaterial, red: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source.map!.image as CanvasImageSource, 0, 0, 16, 16);
  const pixels = ctx.getImageData(0, 0, 16, 16);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    let color: number[];
    if (b > r * 1.2 && b > g * 1.1) {
      const shade = Math.max(0.42, b / 220);
      color = (red ? [193, 68, 39] : [57, 140, 166]).map(v => v * shade);
    } else if (r > 210 && g < 100) color = red ? [255, 165, 55] : [115, 240, 255];
    else if (r > 170 && g > 170) color = [210, 194, 160];
    else color = [r * 0.65, g * 0.65, b * 0.65];
    pixels.data.set([...color.map(Math.round), 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.59, metalness: 0.08, side: THREE.DoubleSide });
  // Scale relief is evaluated in the undeformed skin coordinates, so it follows
  // the skinned surface rather than sliding through the dragon as it moves.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vSkinPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinPosition = position;');
    shader.fragmentShader = 'varying vec3 vSkinPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 scaleUV = vec2(vSkinPosition.z * 11.0, (vSkinPosition.x + vSkinPosition.y) * 14.0);
      scaleUV.x += mod(floor(scaleUV.y), 2.0) * 0.5;
      vec2 cell = fract(scaleUV) - 0.5;
      float scaleRelief = smoothstep(0.52, 0.18, length(cell * vec2(1.0, 1.35)));
      diffuseColor.rgb *= 0.82 + 0.18 * scaleRelief;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(normal + vec3(-dFdx(scaleRelief), -dFdy(scaleRelief), 0.0) * 0.28);
    `);
  };
  material.customProgramCacheKey = () => "dragon-scales-v1";
  return material;
}

export function createRiggedDragon(asset: GLTF, index: number) {
  const root = new THREE.Group();
  const model = clone(asset.scene);
  model.scale.setScalar(SCALE);
  root.add(model);
  let mesh!: THREE.SkinnedMesh;
  model.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    mesh = object;
    object.geometry = object.geometry.clone();
    // Average normals at shared positions to remove the source's faceted shading.
    const p = object.geometry.attributes.position, n = object.geometry.attributes.normal;
    const normals = new Map<string, THREE.Vector3>();
    const key = (i: number) => `${p.getX(i).toFixed(5)},${p.getY(i).toFixed(5)},${p.getZ(i).toFixed(5)}`;
    for (let i = 0; i < p.count; i++) {
      const sum = normals.get(key(i)) ?? new THREE.Vector3();
      sum.add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
      normals.set(key(i), sum);
    }
    for (let i = 0; i < p.count; i++) { const v = normals.get(key(i))!.normalize(); n.setXYZ(i, v.x, v.y, v.z); }
    object.material = skinMaterial(object.material as THREE.MeshBasicMaterial, index === 0);
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  if (!mesh) throw new Error("Dragon asset is missing its skin and skeleton.");
  const bones = Object.fromEntries(mesh.skeleton.bones.map(b => [b.name, b]));
  const mixer = new THREE.AnimationMixer(model);
  const idleClip = asset.animations.find(a => a.name === "Idle-loop")!;
  const flightClip = asset.animations.find(a => a.name === "Flying-loop")!;
  if (!idleClip || !flightClip) throw new Error("Dragon asset is missing its idle or flight clip.");
  const idle = mixer.clipAction(idleClip).play();
  const flight = mixer.clipAction(flightClip).play();
  idle.paused = flight.paused = true;
  idle.setEffectiveWeight(1); flight.setEffectiveWeight(0);
  mixer.update(0);
  model.updateMatrixWorld(true);
  mesh.skeleton.update();
  const groundOffset = -new THREE.Box3().setFromObject(model, true).min.y;
  model.position.y = groundOffset;
  const feet = ["LeftHand", "RightHand", "LeftFoot", "RightFoot"];
  const footTargets = feet.map(name => ({
    foot: bones[name], target: bones[`${name}Target`],
    position: model.worldToLocal(bones[name].getWorldPosition(new THREE.Vector3())),
  }));
  const boneIndex = (name: string) => mesh.skeleton.bones.findIndex(b => b.name === name);
  const ik = new CCDIKSolver(mesh, feet.map(name => {
    const limb = name.includes("Hand") ? "Arm" : "Leg";
    const side = name.startsWith("Left") ? "Left" : "Right";
    return {
      target: boneIndex(`${name}Target`), effector: boneIndex(name),
      links: [limb === "Arm" ? "Low" : "Bottom", "Mid", "Top"].map(suffix => ({ index: boneIndex(`${side}${limb}${suffix}`) })),
      iteration: 8, maxAngle: 0.15,
    };
  }));
  const mouth = new THREE.Object3D();
  // The head's local +Y runs along the snout in this Blender rig.
  mouth.position.set(0, 0.83, 0.03);
  bones.Head.add(mouth);
  const neutralHead = new THREE.Quaternion();
  const neutralJaw = new THREE.Quaternion();
  const world = new THREE.Vector3();
  const bodyIdle = model.worldToLocal(bones.Body.getWorldPosition(new THREE.Vector3())).y;

  const animatedPose = mesh.skeleton.bones.map(bone => ({
    bone, position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
  }));

  function pose(time: number, idleTime: number, sample: (FlightSample & Partial<CombatAnimation>) | null, reducedMotion: boolean) {
    // AnimationMixer may skip unchanged tracks. Restore the last unmodified
    // animated pose first, so idle breathing and tail offsets never accumulate.
    animatedPose.forEach(({ bone, position, quaternion, scale }) => {
      bone.position.copy(position); bone.quaternion.copy(quaternion); bone.scale.copy(scale);
    });
    const flying = sample?.flight ?? 0;
    idle.time = 0;
    flight.time = (Math.max(0, time - 1.25) * (0.85 + index * 0.035)) % flightClip.duration;
    idle.setEffectiveWeight(1 - flying);
    flight.setEffectiveWeight(flying);
    // Reset every channel before adding procedural follow-through; no accumulation.
    mixer.update(0);
    animatedPose.forEach(({ bone, position, quaternion, scale }) => {
      position.copy(bone.position); quaternion.copy(bone.quaternion); scale.copy(bone.scale);
    });
    const wingBlend = sample?.wings ?? 0;
    if (wingBlend > flying) {
      const base = new Map<THREE.Bone, THREE.Quaternion>();
      Object.values(bones).filter(b => b.name.includes("Wing")).forEach(b => base.set(b, b.quaternion.clone()));
      idle.setEffectiveWeight(0); flight.setEffectiveWeight(1); mixer.update(0);
      const targets = new Map([...base.keys()].map(b => [b, b.quaternion.clone()]));
      idle.setEffectiveWeight(1 - flying); flight.setEffectiveWeight(flying); mixer.update(0);
      const extra = (wingBlend - flying) / Math.max(0.001, 1 - flying);
      base.forEach((q, b) => b.quaternion.copy(q).slerp(targets.get(b)!, extra));
    }
    model.position.y = groundOffset;
    model.updateWorldMatrix(true, true);
    const bodyY = model.worldToLocal(bones.Body.getWorldPosition(world)).y;
    model.position.y -= (bodyY - bodyIdle) * SCALE;
    if (sample && sample.crouch > 0) {
      bones.Body.parent!.getWorldQuaternion(parentRotation).invert();
      vec.set(0, -sample.crouch / SCALE, 0).applyQuaternion(parentRotation);
      bones.Body.position.add(vec);
    }
    if (!sample && !reducedMotion) {
      // Feet and wings stay still; only the chest, neck and tail breathe.
      bones.UpperBack.scale.x *= 1 + Math.sin(idleTime * 1.5) * 0.012;
      bones.Neck1.rotation.z += Math.sin(idleTime * 0.55) * 0.025;
      bones.Head.rotation.x += Math.sin(idleTime * 0.7) * 0.018;
    }
    Object.values(bones).filter(b => /^Tail[0-4]$/.test(b.name)).forEach((b, i) => {
      const t = sample ? time : reducedMotion ? 0 : idleTime;
      b.rotation.z += Math.sin(t * (sample ? 2 : 0.7) - i * 0.6) * (sample ? 0.1 : 0.025) + (sample?.bank ?? 0) * (0.3 + i * 0.1);
    });
    if (sample && (time < 0.88 || sample.feetPinned)) {
      model.updateWorldMatrix(true, true);
      footTargets.forEach(({ target, position }) => {
        world.copy(position); model.localToWorld(world);
        target.position.copy(target.parent!.worldToLocal(world));
      });
      model.updateWorldMatrix(true, true);
      ik.update();
    }
    const threat = (sample?.threat ?? 0) + (sample?.roar ?? 0);
    const fatigue = sample?.fatigue ?? 0;
    const collapse = sample?.collapse ?? 0;
    bones.Neck0.rotation.x -= threat * 0.18;
    bones.Head.rotation.x -= threat * 0.12;
    bones.Head.rotation.z += (sample?.hit ?? 0) * 0.22;
    bones.Neck1.rotation.x += fatigue * 0.12 + collapse * 0.38;
    bones.Head.rotation.x += collapse * 0.32;
    bones.Jaw.rotation.x += (sample?.attack ?? 0) * 0.25 + threat * 0.5 + (sample?.charge ?? 0) * 0.16 + (sample?.bite ?? 0) * 0.45;
    for (const side of ["Left", "Right"]) {
      const sign = side === "Left" ? 1 : -1;
      const reach = (sample?.claw ?? 0) + (sample?.grapple ?? 0);
      bones[`${side}ArmTop`].rotation.z += sign * ((sample?.block ?? 0) * 0.6 + reach * 0.25);
      bones[`${side}ArmMid`].rotation.x -= reach * 0.35;
      bones[`${side}LegMid`].rotation.x += collapse * 0.6;
      bones[`${side}ArmMid`].rotation.x += collapse * 0.5;
    }
    for (let i = 0; i < 5; i++) {
      bones[`Tail${i}`].rotation.z += (sample?.tail ?? 0) * Math.sin(i * 0.45 + time * 4) * 0.12;
    }
    neutralHead.copy(bones.Head.quaternion);
    neutralJaw.copy(bones.Jaw.quaternion);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
  }

  function aim(target: THREE.Vector3, strength: number) {
    if (strength <= 0) return;
    bones.Head.getWorldPosition(world);
    vec.copy(target).sub(world).normalize();
    bones.Head.parent!.getWorldQuaternion(parentRotation).invert();
    vec.applyQuaternion(parentRotation);
    const desired = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec);
    bones.Head.quaternion.copy(neutralHead).slerp(desired, strength * 0.45);
    bones.Jaw.quaternion.copy(neutralJaw);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
  }
  root.updateMatrixWorld(true);
  mesh.skeleton.update();
  type Surface = { marker: THREE.Object3D; indices: number[]; chain: THREE.Bone[] };
  function surface(name: string, axis: "z", direction: number, chain: string[]): Surface {
    const joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    const candidates: { index: number; score: number }[] = [];
    const boneID = mesh.skeleton.bones.indexOf(bones[name]);
    for (let i = 0; i < joints.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (joints.getComponent(i, j) === boneID) weight += weights.getComponent(i, j);
      if (weight > 0.6) { mesh.getVertexPosition(i, vec); candidates.push({ index: i, score: vec[axis] * direction }); }
    }
    candidates.sort((a, b) => b.score - a.score);
    const indices = candidates.slice(0, 6).map(c => c.index);
    if (!indices.length) throw new Error(`Missing ${name} contact surface`);
    const marker = new THREE.Object3D();
    mesh.getVertexPosition(indices[0], vec); mesh.localToWorld(vec);
    marker.position.copy(bones[name].worldToLocal(vec));
    bones[name].add(marker);
    return { marker, indices, chain: chain.map(n => bones[n]) };
  }
  const surfaces = {
    left: surface("LeftHand", "z", 1, ["LeftArmLow", "LeftArmMid", "LeftArmTop"]),
    right: surface("RightHand", "z", 1, ["RightArmLow", "RightArmMid", "RightArmTop"]),
    bite: surface("Head", "z", 1, ["Head", "Neck3", "Neck2", "Neck1", "Neck0"]),
    tail: surface("Tail4", "z", -1, ["Tail4", "Tail3", "Tail2", "Tail1", "Tail0"]),
  };
  const jointPosition = new THREE.Vector3(), end = new THREE.Vector3(), goal = new THREE.Vector3();
  const inverse = new THREE.Quaternion(), rotation = new THREE.Quaternion(), axis = new THREE.Vector3();
  function reach(kind: AttackKind, target: THREE.Vector3, strength: number) {
    if (strength <= 0 || kind === "collision" || kind === "breath") return;
    const selected = kind === "bite" ? [surfaces.bite] : kind === "tail" ? [surfaces.tail] : [surfaces.left, surfaces.right];
    selected.forEach(surface => {
      const original = surface.chain.map(b => b.quaternion.clone());
      for (let iteration = 0; iteration < 12; iteration++) {
        for (const joint of surface.chain) {
          joint.getWorldPosition(jointPosition); joint.getWorldQuaternion(inverse).invert();
          surface.marker.getWorldPosition(end).sub(jointPosition).applyQuaternion(inverse).normalize();
          goal.copy(target).sub(jointPosition).applyQuaternion(inverse).normalize();
          rotation.setFromUnitVectors(end, goal);
          const angle = 2 * Math.acos(THREE.MathUtils.clamp(rotation.w, -1, 1));
          if (angle > 0.14) { axis.set(rotation.x, rotation.y, rotation.z).normalize(); rotation.setFromAxisAngle(axis, 0.14); }
          joint.quaternion.multiply(rotation);
          joint.updateWorldMatrix(true, true);
        }
      }
      surface.chain.forEach((bone, i) => { const solved = bone.quaternion.clone(); bone.quaternion.copy(original[i]).slerp(solved, strength); });
      // Blend above must preserve the solved pose before restoring its source.
      root.updateMatrixWorld(true);
    });
    mesh.skeleton.update();
  }
  function contactPoints(kind: AttackKind) {
    const selected = kind === "bite" ? [surfaces.bite] : kind === "tail" ? [surfaces.tail] : [surfaces.left, surfaces.right];
    return selected.flatMap(s => s.indices.map(i => mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)));
  }
  function ground() {
    root.updateMatrixWorld(true); mesh.skeleton.update();
    const bounds = new THREE.Box3().setFromObject(root, true);
    root.position.y -= bounds.min.y;
    root.updateMatrixWorld(true); mesh.skeleton.update();
  }
  return { root, model, mesh, bones, mouth, pose, aim, reach, contactPoints, ground, mixer, groundOffset,
    dispose: () => { mixer.stopAllAction(); mixer.uncacheRoot(model); mesh.skeleton.dispose(); } };
}
