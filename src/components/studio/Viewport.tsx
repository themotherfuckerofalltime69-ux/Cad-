import { useEffect, useRef } from "react";
import { compileModel } from "@/lib/cad/compile";
import { useStudio, type Command, type StudioState } from "@/lib/cad/store";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function Viewport() {
  const hostRef = useRef<HTMLDivElement>(null);
  const error = useStudio((s) => s.error);
  const showGizmo = useStudio((s) => s.showGizmo);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let dead = false;
    let raf = 0;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import("three");
      if (dead) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090d16);
      scene.fog = new THREE.FogExp2(0x090d16, 0.035);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "webgl-canvas";
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir1 = new THREE.DirectionalLight(0xffffff, useStudio.getState().keyLight);
      dir1.position.set(5, 10, 7);
      dir1.castShadow = true;
      dir1.shadow.mapSize.set(1024, 1024);
      scene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0x2563eb, 0.8);
      dir2.position.set(-5, 5, -5);
      scene.add(dir2);

      const grid = new THREE.GridHelper(20, 40, 0x374151, 0x1f2937);
      grid.position.y = -1.5;
      grid.visible = useStudio.getState().showGrid;
      scene.add(grid);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.ShadowMaterial({ opacity: 0.38 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.5;
      ground.receiveShadow = true;
      scene.add(ground);

      let group: import("three").Object3D | null = null;
      let lastGood = useStudio.getState().sourceCode;
      let applying = false;
      let seenRev = -1;
      let seenCmd = -1;
      let autoRotate = useStudio.getState().autoRotate;
      let dragging = false;
      let previous = { x: 0, y: 0 };
      const targetRotation = { x: 0.5, y: 0.8 };
      const currentRotation = { x: 0.5, y: 0.8 };
      let cameraRadius = 8;
      let touchStartDist = 0;

      function disposeObject(obj: import("three").Object3D) {
        obj.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else if (material) material.dispose();
        });
      }

      function countFaces(root: import("three").Object3D) {
        let count = 0;
        root.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh || !mesh.geometry) return;
          if (mesh.geometry.index) count += mesh.geometry.index.count / 3;
          else {
            const pos = mesh.geometry.getAttribute("position");
            if (pos) count += pos.count / 3;
          }
        });
        return Math.floor(count);
      }

      function publishStats() {
        if (!group) return;
        applying = true;
        useStudio.setState({
          faceCount: countFaces(group),
          position: {
            x: round2(group.position.x),
            y: round2(group.position.y),
            z: round2(group.position.z),
          },
        });
        applying = false;
      }

      function eachMaterial(
        root: import("three").Object3D,
        visit: (mat: import("three").Material, mesh: import("three").Mesh) => void,
      ) {
        root.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of list) visit(mat, mesh);
        });
      }

      function applyLook(s: StudioState) {
        if (!group) return;
        eachMaterial(group, (mat) => {
          if ("wireframe" in mat) {
            (mat as import("three").MeshStandardMaterial).wireframe =
              s.mode === "sculpting" || s.mode === "uv";
          }
          if (s.mode === "material") {
            if ("roughness" in mat) (mat as import("three").MeshStandardMaterial).roughness = s.roughness;
            if ("metalness" in mat) (mat as import("three").MeshStandardMaterial).metalness = s.metalness;
          }
          if (s.mode === "texture" && mat instanceof THREE.MeshStandardMaterial) {
            mat.color.set(s.tint);
          }
        });
      }

      function tagShadows(root: import("three").Object3D) {
        root.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });
      }

      function rebuild(code: string) {
        const next = compileModel(THREE, code);
        if (group) {
          scene.remove(group);
          disposeObject(group);
        }
        const ratio = useStudio.getState().ratio;
        next.scale.set(ratio, ratio, ratio);
        next.position.set(0, 0, 0);
        next.rotation.set(0, 0, 0);
        tagShadows(next);
        group = next;
        scene.add(group);
        applyLook(useStudio.getState());
      }

      function tryCompile(code: string) {
        try {
          rebuild(code);
          lastGood = code;
          applying = true;
          useStudio.setState({ error: null });
          applying = false;
          publishStats();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Compilation failed";
          if (group == null) {
            try {
              rebuild(lastGood);
            } catch {
              /* keep the empty stage */
            }
          }
          applying = true;
          useStudio.setState({
            error: `Compilation/Execution Error:\n${message}`,
            sourceCode: lastGood,
            status: null,
          });
          applying = false;
        }
      }

      function paintVertices() {
        if (!group) return;
        group.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh || !mesh.geometry) return;
          const pos = mesh.geometry.getAttribute("position");
          if (!pos) return;
          const colors = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const t = Math.min(1, Math.max(0, (y + 1.5) / 3));
            colors.setXYZ(i, 0.05, 0.55 + t * 0.4, 1);
          }
          mesh.geometry.setAttribute("color", colors);
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of list) {
            if (mat && "vertexColors" in mat) {
              (mat as import("three").MeshStandardMaterial).vertexColors = true;
              mat.needsUpdate = true;
            }
          }
        });
      }

      function runTool(tool: StudioState["activeTool"]) {
        if (!group) return;
        if (tool === "mov") group.position.y += 0.2;
        if (tool === "rot") group.rotation.y += Math.PI / 8;
        if (tool === "scl") {
          group.scale.multiplyScalar(1.1);
          applying = true;
          useStudio.setState({ ratio: Math.min(3, round2(group.scale.x)) });
          applying = false;
        }
        if (tool === "ext") {
          group.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh || !mesh.geometry) return;
            const geo = mesh.geometry;
            geo.computeVertexNormals();
            const pos = geo.getAttribute("position");
            const normal = geo.getAttribute("normal");
            if (!pos || !normal) return;
            for (let i = 0; i < pos.count; i++) {
              pos.setXYZ(
                i,
                pos.getX(i) + normal.getX(i) * 0.05,
                pos.getY(i) + normal.getY(i) * 0.05,
                pos.getZ(i) + normal.getZ(i) * 0.05,
              );
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            geo.computeBoundingSphere();
          });
        }
        if (tool === "cut") {
          group.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh || !mesh.geometry || mesh.userData.cut) return;
            const lines = new THREE.LineSegments(
              new THREE.WireframeGeometry(mesh.geometry),
              new THREE.LineBasicMaterial({ color: 0x00f0ff }),
            );
            mesh.add(lines);
            mesh.userData.cut = true;
          });
        }
        if (tool === "bvl") {
          eachMaterial(group, (mat) => {
            if (!("roughness" in mat) || !("metalness" in mat)) return;
            const std = mat as import("three").MeshStandardMaterial;
            std.roughness = Math.max(0, std.roughness - 0.1);
            std.metalness = Math.min(1, std.metalness + 0.1);
          });
        }
        if (tool === "dec") {
          group.scale.set(1, 1, 1);
          applying = true;
          useStudio.setState({ ratio: 1 });
          applying = false;
        }
        publishStats();
      }

      function runCommand(command: Command) {
        if (command.kind === "tool") runTool(command.tool);
        if (command.kind === "scale" && group) {
          const ratio = Math.min(3, Math.max(0.05, command.ratio));
          group.scale.set(ratio, ratio, ratio);
          publishStats();
        }
        if (command.kind === "position" && group) {
          group.position.set(command.x, command.y, command.z);
          publishStats();
        }
        if (command.kind === "reset-camera") {
          targetRotation.x = 0.5;
          targetRotation.y = 0.8;
          cameraRadius = 8;
        }
        if (command.kind === "screenshot") {
          const url = renderer.domElement.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = "typeless-viewport.png";
          a.click();
        }
        if (command.kind === "vertex") paintVertices();
      }

      function resize() {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w < 2 || h < 2) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }

      function sync(s: StudioState) {
        if (applying) return;
        autoRotate = s.autoRotate;
        grid.visible = s.showGrid;
        dir1.intensity = s.keyLight;
        if (s.revision !== seenRev) {
          seenRev = s.revision;
          tryCompile(s.sourceCode);
        }
        applyLook(s);
        if (s.command && s.command.id !== seenCmd) {
          seenCmd = s.command.id;
          runCommand(s.command);
        }
      }

      const unsub = useStudio.subscribe(sync);
      sync(useStudio.getState());
      resize();

      const observer = new ResizeObserver(() => resize());
      observer.observe(host);

      function onPointerDown(e: PointerEvent) {
        if (e.pointerType === "touch") return;
        dragging = true;
        previous = { x: e.clientX, y: e.clientY };
      }
      function onPointerMove(e: PointerEvent) {
        if (!dragging || e.pointerType === "touch") return;
        const dx = e.clientX - previous.x;
        const dy = e.clientY - previous.y;
        targetRotation.y += dx * 0.005;
        targetRotation.x += dy * 0.005;
        targetRotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, targetRotation.x));
        previous = { x: e.clientX, y: e.clientY };
      }
      function onPointerUp() {
        dragging = false;
      }
      function onWheel(e: WheelEvent) {
        e.preventDefault();
        cameraRadius += e.deltaY * 0.005;
        cameraRadius = Math.max(3, Math.min(20, cameraRadius));
      }
      function onTouchStart(e: TouchEvent) {
        if (e.touches.length === 1) {
          dragging = true;
          previous = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          dragging = false;
          touchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      }
      function onTouchMove(e: TouchEvent) {
        if (dragging && e.touches.length === 1) {
          const dx = e.touches[0].clientX - previous.x;
          const dy = e.touches[0].clientY - previous.y;
          targetRotation.y += dx * 0.005;
          targetRotation.x += dy * 0.005;
          targetRotation.x = Math.max(
            -Math.PI / 2 + 0.01,
            Math.min(Math.PI / 2 - 0.01, targetRotation.x),
          );
          previous = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          cameraRadius += (touchStartDist - dist) * 0.01;
          cameraRadius = Math.max(3, Math.min(20, cameraRadius));
          touchStartDist = dist;
        }
      }
      function onTouchEnd() {
        dragging = false;
      }

      host.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      host.addEventListener("wheel", onWheel, { passive: false });
      host.addEventListener("touchstart", onTouchStart, { passive: true });
      host.addEventListener("touchmove", onTouchMove, { passive: true });
      host.addEventListener("touchend", onTouchEnd);

      function animate() {
        raf = requestAnimationFrame(animate);
        if (!dragging && autoRotate) targetRotation.y += 0.002;
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
        camera.position.x = cameraRadius * Math.sin(currentRotation.y) * Math.cos(currentRotation.x);
        camera.position.y = cameraRadius * Math.sin(currentRotation.x);
        camera.position.z = cameraRadius * Math.cos(currentRotation.y) * Math.cos(currentRotation.x);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }
      animate();

      cleanup = () => {
        cancelAnimationFrame(raf);
        unsub();
        observer.disconnect();
        host.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        host.removeEventListener("wheel", onWheel);
        host.removeEventListener("touchstart", onTouchStart);
        host.removeEventListener("touchmove", onTouchMove);
        host.removeEventListener("touchend", onTouchEnd);
        if (group) disposeObject(group);
        ground.geometry.dispose();
        (ground.material as import("three").Material).dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      dead = true;
      cleanup();
    };
  }, []);

  return (
    <div
      className="viewport"
      ref={hostRef}
      role="img"
      aria-label="3D viewport. Drag to orbit, scroll or pinch to zoom."
    >
      {showGizmo ? <div className="viewport-gizmo">XYZ</div> : null}
      {error ? (
        <div className="error-console" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
