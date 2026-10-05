import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRiggedDragon } from "./dragon-model";
import type { BattleMode } from "./dragon-flight";
import { DragonRound } from "./dragon-combat";
import { poseCombat } from "./dragon-combat-rig";

export type DragonSceneState = { mode: BattleMode | "finished"; reducedMotion: boolean; round: number; seed: number };

function disposeObjects(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      if ("geometry" in object) geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    }
  });
  materials.forEach(material => {
    Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    material.dispose();
  });
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close(); });
}

export async function createDragonScene(element: HTMLDivElement, getState: () => DragonSceneState, signal: AbortSignal, onFinished: (winner: number) => void) {
  const response = await fetch("/models/dragon/dragon.glb", { signal });
  if (!response.ok) throw new Error(`Dragon model request failed (${response.status}).`);
  const asset = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "");
  if (signal.aborted) { disposeObjects(asset.scene); return () => {}; }
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let observer: ResizeObserver | undefined;
  let visibility: IntersectionObserver | undefined;
  let disposed = false;
  const disposers: (() => void)[] = [];
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    renderer?.setAnimationLoop(null);
    observer?.disconnect();
    visibility?.disconnect();
    controls?.dispose();
    disposers.forEach(dispose => dispose());
    disposeObjects(scene);
    disposeObjects(asset.scene);
    renderer?.dispose();
    renderer?.domElement.remove();
  };
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
    camera.position.set(0, 7, 15);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minPolarAngle = 0.85;
    controls.maxPolarAngle = 1.3;
    controls.minAzimuthAngle = -0.45;
    controls.maxAzimuthAngle = 0.45;
    controls.update();
    scene.add(new THREE.HemisphereLight(0xd8e7ff, 0x353142, 2.1));
    const key = new THREE.DirectionalLight(0xffefdf, 3.4);
    key.position.set(-3, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 28 });
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.025;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fcfff, 2.3);
    rim.position.set(3, 5, -5);
    scene.add(rim);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.65, 0.2, 96), new THREE.MeshStandardMaterial({ color: 0x121921, roughness: 0.86, metalness: 0.15 }));
    platform.position.y = -0.1;
    platform.receiveShadow = true;
    scene.add(platform);
    for (const radius of [5.35, 4.9]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 5, 96), new THREE.MeshStandardMaterial({ color: 0x65705c, roughness: 0.7, transparent: true, opacity: 0.5 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.008;
      scene.add(ring);
    }
    const dragons = [createRiggedDragon(asset, 0), createRiggedDragon(asset, 1)];
    dragons.forEach(dragon => { scene.add(dragon.root); disposers.push(dragon.dispose); });
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteCanvas.height = 64;
    const ctx = spriteCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(0.18, "#ffffffb0"); gradient.addColorStop(1, "#ffffff00");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(spriteCanvas);
    const count = 90;
    const breaths = [0xff7835, 0x8cddff].map(color => {
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color, size: 0.17, map: texture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      scene.add(points);
      const light = new THREE.PointLight(color, 0, 4);
      scene.add(light);
      return { geometry, positions, material, light, points };
    });
    let visible = true;
    let lastFrame = performance.now();
    let roundID = getState().round;
    let round = new DragonRound(getState().seed);
    let accumulator = 0;
    let announced = false;
    let frame: ReturnType<typeof poseCombat> | null = null;
    let idleTime = 0;
    let firstFrame = true;
    let dirty = true;
    const frameDirection = new THREE.Vector3();
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer!.setSize(width, height);
      camera.aspect = width / height;
      // Fit an invariant volume enclosing platform, paths, tails and full wings.
      const verticalFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = Math.max(4.2 / verticalFov, 6.4 / (verticalFov * camera.aspect)) + 4;
      frameDirection.copy(camera.position).sub(controls!.target).normalize();
      camera.position.copy(controls!.target).addScaledVector(frameDirection, distance);
      camera.updateProjectionMatrix();
      controls!.update();
      dirty = true;
    };
    observer = new ResizeObserver(resize); observer.observe(element); resize();
    visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; lastFrame = performance.now(); });
    visibility.observe(element);
    const onVisibility = () => { lastFrame = performance.now(); };
    document.addEventListener("visibilitychange", onVisibility);
    disposers.push(() => document.removeEventListener("visibilitychange", onVisibility));
    controls.addEventListener("change", () => { dirty = true; });
    const move = (event: KeyboardEvent) => {
      if (getState().mode === "paused" || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const azimuth = THREE.MathUtils.clamp(controls!.getAzimuthalAngle() + (event.key === "ArrowLeft" ? -0.08 : 0.08), -0.45, 0.45);
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls!.target));
      spherical.theta = azimuth;
      camera.position.setFromSpherical(spherical).add(controls!.target);
      controls!.update(); dirty = true;
    };
    element.addEventListener("keydown", move);
    disposers.push(() => element.removeEventListener("keydown", move));
    const impactGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xffe2b1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(impactGlow);
    const origin = new THREE.Vector3(), direction = new THREE.Vector3();
    const lateral = new THREE.Vector3(), vertical = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    renderer.setAnimationLoop((now: number) => {
      const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.05));
      lastFrame = now;
      if (!visible || document.hidden) return;
      const state = getState();
      controls!.enabled = state.mode !== "paused";
      if (state.round !== roundID) {
        roundID = state.round; round = new DragonRound(state.seed);
        accumulator = 0; idleTime = 0; announced = false; frame = null;
        breaths.forEach(b => { b.points.visible = false; b.light.intensity = 0; });
        impactGlow.visible = false;
      }
      if (state.mode === "paused" && !firstFrame) {
        if (dirty) { renderer!.render(scene, camera); dirty = false; }
        return;
      }
      if (state.mode === "idle") {
        if (!state.reducedMotion) idleTime += dt;
        dragons.forEach((dragon, i) => {
          dragon.root.position.set(i === 0 ? -3 : 3, 0, 0);
          dragon.root.rotation.set(0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0);
          dragon.pose(0, idleTime + i * 1.3, null, state.reducedMotion);
        });
      } else if (state.mode === "running") {
        accumulator += dt;
        // Fixed steps prevent low frame rates from skipping a contact window.
        while (accumulator >= 1 / 60) {
          round.advance(1 / 60);
          frame = poseCombat(round, dragons);
          accumulator -= 1 / 60;
        }
        if (round.finished && !announced) { announced = true; onFinished(round.winner!); }
      } else if (state.mode === "finished" && round.winner !== null) {
        // Only the victor breathes; the defeated rig remains exactly frozen.
        if (!state.reducedMotion) idleTime += dt;
        const winner = dragons[round.winner];
        const pose = round.sample(round.winner);
        winner.pose(round.wingTime[round.winner], idleTime, null, state.reducedMotion);
        winner.root.position.set(pose.x, 0, pose.z);
        winner.root.rotation.set(0, pose.yaw, 0);
        winner.ground();
      }
      const samples = frame?.samples;
      const battleTime = round.time;
      const impact = round.impacts.at(-1);
      const flash = impact ? Math.max(0, 1 - (battleTime - impact.time) / 0.28) : 0;
      impactGlow.visible = flash > 0 && state.mode !== "idle";
      if (impact) impactGlow.position.set(impact.point.x, impact.point.y, impact.point.z);
      impactGlow.scale.setScalar(0.3 + (1 - flash) * 0.4);
      impactGlow.material.opacity = flash * 0.65;
      dragons.forEach((dragon, index) => {
        const attack = state.mode === "idle" || round.winner !== null ? 0 : samples?.[index]?.attack ?? 0;
        const ray = frame?.rays[index];
        if (ray) { origin.copy(ray.origin); direction.copy(ray.direction); }
        else { dragon.mouth.getWorldPosition(origin); direction.set(0, 0, 1); }
        const length = ray?.length ?? 0;
        lateral.crossVectors(direction, up).normalize();
        vertical.crossVectors(lateral, direction).normalize();
        const breath = breaths[index];
        breath.points.visible = attack > 0.001;
        breath.material.opacity = attack * 0.62;
        breath.light.intensity = attack * 2.4 + (round.winner === null ? samples?.[index]?.charge ?? 0 : 0) * 0.8;
        breath.light.position.copy(origin);
        for (let i = 0; i < count; i++) {
          const progress = (i / count + battleTime * 1.35) % 1;
          const angle = i * 2.399 + battleTime * 1.5;
          const spread = (0.018 + progress * 0.13) * Math.sin(i * 17.3);
          const x = Math.sin(angle) * spread, y = Math.cos(angle) * spread;
          const offset = i * 3;
          breath.positions[offset] = origin.x + direction.x * progress * length + lateral.x * x + vertical.x * y;
          breath.positions[offset + 1] = origin.y + direction.y * progress * length + lateral.y * x + vertical.y * y;
          breath.positions[offset + 2] = origin.z + direction.z * progress * length + lateral.z * x + vertical.z * y;
        }
        breath.geometry.attributes.position.needsUpdate = true;
      });
      controls!.update();
      renderer!.render(scene, camera);
      firstFrame = false; dirty = false;
    });
    return cleanup;
  } catch (error) { cleanup(); throw error; }
}
