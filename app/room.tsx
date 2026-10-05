"use client";
import { useEffect, useRef, useState } from "react";
export default function Room() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading workspace…");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const { OrbitControls } =
        await import("three/addons/controls/OrbitControls.js");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 1.9, 16);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableDamping = true;
      controls.minPolarAngle = Math.PI / 3;
      controls.maxPolarAngle = Math.PI / 2;
      controls.minAzimuthAngle = -0.5;
      controls.maxAzimuthAngle = 0.5;
      controls.target.set(0, 0, 0);
      scene.add(new THREE.AmbientLight(0x9badd7, 1.4));
      const key = new THREE.DirectionalLight(0xe4eaff, 3);
      key.position.set(2, 6, 8);
      scene.add(key);
      const rim = new THREE.PointLight(0xa8b4ff, 90);
      rim.position.set(-3, 4, 4);
      scene.add(rim);
      const green = new THREE.PointLight(0xb4f57c, 35);
      green.position.set(4, 1, 4);
      scene.add(green);
      const resize = () => {
        const { width, height } = element.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();
      let active = true;
      const visibility = new IntersectionObserver((entries) => {
        active = entries[0].isIntersecting;
      });
      visibility.observe(element);
      renderer.setAnimationLoop(() => {
        if (active && !document.hidden) {
          controls.update();
          renderer.render(scene, camera);
        }
      });
      const disposeScene = () => {
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            mats.forEach((m) => {
              Object.values(m).forEach((v) => {
                if (v instanceof THREE.Texture) v.dispose();
              });
              m.dispose();
            });
          }
        });
      };
      cleanup = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        visibility.disconnect();
        controls.dispose();
        disposeScene();
        renderer.dispose();
        renderer.domElement.remove();
      };
      const gltf = await new GLTFLoader().loadAsync("/models/room.glb");
      if (disposed) {
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => m.dispose(),
            );
          }
        });
        return;
      }
      const model = gltf.scene;
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const name = obj.name;
        let color = "#6b6d7b";
        if (name.includes("body1")) color = "#444757";
        else if (name.includes("cabin") || name.includes("table"))
          color = "#433b37";
        else if (name.includes("chair")) color = "#222735";
        else if (name.includes("_________6")) color = "#506565";
        else if (name.includes("pillow")) color = "#a9c581";
        else if (name.includes("comp") || name.includes("radiator"))
          color = "#c3cad1";
        else if (name.includes("emis")) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#bcffe0",
            emissive: "#75dab9",
            emissiveIntensity: 2,
          });
          return;
        }
        obj.material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.78,
          metalness: 0.15,
        });
      });
      model.rotation.y = -Math.PI / 4;
      const size = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      model.scale.setScalar(7.8 / Math.max(size.x, size.y, size.z));
      const center = new THREE.Box3()
        .setFromObject(model)
        .getCenter(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
      setStatus("");
      const move = (event: KeyboardEvent) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        model.rotation.y += event.key === "ArrowLeft" ? -0.08 : 0.08;
      };
      element.addEventListener("keydown", move);
      const oldCleanup = cleanup;
      cleanup = () => {
        element.removeEventListener("keydown", move);
        oldCleanup();
      };
    })().catch((error: unknown) => {
      if (!disposed) {
        console.error("Unable to render the 3D workspace:", error);
        cleanup();
        setStatus("The 3D workspace could not load. Please refresh to try again.");
      }
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div className="room-canvas">
      {/* Keep React's status updates separate from Three.js's canvas. */}
      <div
        ref={host}
        className="room-renderer"
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D developer workspace. Drag to rotate or use the left and right arrow keys."
      />
      {status && <div className="scene-status" role="status">{status}</div>}
    </div>
  );
}
