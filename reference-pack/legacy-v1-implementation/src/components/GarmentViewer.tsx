import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type * as Three from "three";
import type { Listing, ViewMode } from "../domain";
import "./viewer.css";

export interface GarmentViewerProps {
  listing: Listing;
  reference?: Listing;
  mode?: ViewMode;
  compact?: boolean;
  onModeChange?: (mode: ViewMode) => void;
}

type RenderState = "loading" | "ready" | "fallback" | "error";
type FallbackReason =
  | "static"
  | "webgl-off"
  | "no-model"
  | "unavailable"
  | "another-view";
type ViewerRuntime = {
  setMode: (mode: ViewMode) => void;
  rotate: (horizontal: number, vertical?: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  replay: () => void;
  pause: () => void;
};

// Every mounted viewer can offer a poster, but only one owns a live GPU context.
let activeViewer: { token: symbol; release: () => void } | undefined;
const MODES: { value: ViewMode; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "drape", label: "Drape" },
  { value: "movement", label: "Movement" },
  { value: "surface", label: "Surface" },
];
const MODE_LABELS: Record<ViewMode, string> = {
  neutral: "Neutral view",
  drape: "Drape view",
  movement: "Movement view",
  surface: "Surface detail",
  front: "Front view",
  label: "Label detail",
  wear: "Visible wear detail",
};

function disposeObject(root: Three.Object3D) {
  const geometries = new Set<Three.BufferGeometry>();
  const materials = new Set<Three.Material>();
  const textures = new Set<Three.Texture>();
  root.traverse((object) => {
    const mesh = object as Three.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (
            value &&
            typeof value === "object" &&
            "isTexture" in value &&
            value.isTexture
          ) {
            textures.add(value as Three.Texture);
          }
        }
      }
    }
  });
  textures.forEach((texture) => {
    texture.dispose();
    const image = texture.image as { close?: () => void } | undefined;
    image?.close?.();
  });
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export function GarmentViewer({
  listing,
  reference,
  mode,
  compact = false,
  onModeChange,
}: GarmentViewerProps) {
  const [ownMode, setOwnMode] = useState<ViewMode>(mode ?? "neutral");
  const currentMode = mode ?? ownMode;
  const [renderState, setRenderState] = useState<RenderState>("loading");
  const [fallbackReason, setFallbackReason] =
    useState<FallbackReason>("unavailable");
  const [staticView, setStaticView] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const runtime = useRef<ViewerRuntime | null>(null);
  const modeRef = useRef(currentMode);
  const reducedMotionRef = useRef(reducedMotion);
  const explanationId = useId();
  const stages = reference ? [reference, listing] : [listing];
  const modelKey = stages
    .map((stage) => `${stage.id}:${stage.model ?? ""}`)
    .join("|");
  const forceWebglOff =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("webgl") === "off";
  modeRef.current = currentMode;
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      reducedMotionRef.current = media.matches;
      setReducedMotion(media.matches);
      if (media.matches) runtime.current?.pause();
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    runtime.current?.setMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    setPlaying(false);
    if (staticView || forceWebglOff || stages.some((stage) => !stage.model)) {
      setFallbackReason(
        staticView ? "static" : forceWebglOff ? "webgl-off" : "no-model",
      );
      setRenderState("fallback");
      return;
    }
    if (!visible) return;

    const token = Symbol("garment-viewer");
    const abort = new AbortController();
    let cancelled = false;
    let renderer: Three.WebGLRenderer | undefined;
    let controls:
      | {
          dispose: () => void;
          update: () => boolean;
          target: Three.Vector3;
          minDistance: number;
          maxDistance: number;
        }
      | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let animationFrame = 0;
    let loadedRoots: Three.Object3D[] = [];
    let removeContextListener: (() => void) | undefined;
    let removeControlListener: (() => void) | undefined;
    let removeResizeListener: (() => void) | undefined;

    function teardown() {
      if (cancelled) return;
      cancelled = true;
      abort.abort();
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      removeResizeListener?.();
      removeContextListener?.();
      removeControlListener?.();
      controls?.dispose();
      loadedRoots.forEach(disposeObject);
      loadedRoots = [];
      if (renderer) {
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
      runtime.current = null;
      if (activeViewer?.token === token) activeViewer = undefined;
    }

    setRenderState("loading");
    void (async () => {
      try {
        const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
          import("three"),
          import("three/addons/controls/OrbitControls.js"),
          import("three/addons/loaders/GLTFLoader.js"),
        ]);
        if (cancelled) return;
        activeViewer?.release();
        activeViewer = {
          token,
          release: () => {
            teardown();
            setPlaying(false);
            setFallbackReason("another-view");
            setRenderState("fallback");
          },
        };
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "low-power",
          });
        } catch {
          teardown();
          setFallbackReason("unavailable");
          setRenderState("fallback");
          return;
        }
        const webgl = renderer;
        webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        webgl.outputColorSpace = THREE.SRGBColorSpace;
        webgl.toneMapping = THREE.ACESFilmicToneMapping;
        webgl.toneMappingExposure = 1.1;
        webgl.setClearColor(0x000000, 0);
        webgl.domElement.setAttribute("aria-hidden", "true");
        webgl.domElement.dataset.testid = "garment-canvas";
        webgl.domElement.className = "gv-canvas";
        element.appendChild(webgl.domElement);
        const lostContext = (event: Event) => {
          event.preventDefault();
          if (cancelled) return;
          teardown();
          setPlaying(false);
          setFallbackReason("unavailable");
          setRenderState("fallback");
        };
        webgl.domElement.addEventListener("webglcontextlost", lostContext);
        removeContextListener = () =>
          webgl.domElement.removeEventListener("webglcontextlost", lostContext);

        const loader = new GLTFLoader();
        const results = await Promise.allSettled(
          stages.map(async (stage) => {
            const url = new URL(stage.model!, window.location.href);
            const response = await fetch(url, { signal: abort.signal });
            if (!response.ok) throw new Error("Model could not be loaded");
            const buffer = await response.arrayBuffer();
            const gltf = await loader.parseAsync(
              buffer,
              new URL(".", url).href,
            );
            return gltf.scene;
          }),
        );
        loadedRoots = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        if (cancelled) {
          loadedRoots.forEach(disposeObject);
          loadedRoots = [];
          return;
        }
        if (results.some((result) => result.status === "rejected"))
          throw new Error("Model could not be loaded");

        const views = loadedRoots.map((root, index) => {
          const scene = new THREE.Scene();
          const group = new THREE.Group();
          const bounds = new THREE.Box3().setFromObject(root);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const scale = 1.65 / Math.max(size.x, size.y, size.z, 0.01);
          root.position.sub(center);
          group.add(root);
          group.scale.setScalar(scale);
          scene.add(group);
          root.traverse((object) => {
            const mesh = object as Three.Mesh;
            if (!mesh.isMesh) return;
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            for (const material of materials) {
              if ("roughness" in material) {
                const fabric = material as Three.MeshStandardMaterial;
                fabric.metalness = 0;
                fabric.roughness = Math.max(
                  0.62,
                  Math.min(0.99, fabric.roughness),
                );
              }
            }
          });
          const ambient = new THREE.HemisphereLight(0xffffff, 0xc7bcb5, 2.1);
          const key = new THREE.DirectionalLight(0xffffff, 2.4);
          key.position.set(-2, 3, 4);
          const fill = new THREE.DirectionalLight(0xe3edff, 1.0);
          fill.position.set(3, 1, 2);
          const rim = new THREE.DirectionalLight(0xffffff, 0.7);
          rim.position.set(1, 2, -3);
          scene.add(ambient, key, fill, rim);
          return { scene, group, root, key, stage: stages[index] };
        });
        const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 30);
        camera.position.set(0, 0.02, 3.0);
        const orbit = new OrbitControls(camera, webgl.domElement);
        controls = orbit;
        orbit.enableDamping = false;
        orbit.enablePan = false;
        orbit.minDistance = 0.35;
        orbit.maxDistance = 5;
        orbit.minPolarAngle = 0.25;
        orbit.maxPolarAngle = Math.PI - 0.25;
        orbit.rotateSpeed = 0.65;
        orbit.zoomSpeed = 0.8;
        orbit.touches.ONE = THREE.TOUCH.ROTATE;
        orbit.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        let width = 1;
        let height = 1;
        let activeMode = modeRef.current;
        let movementStarted = 0;
        let movementActive = false;

        function draw() {
          if (cancelled) return;
          const hostBounds = element!.getBoundingClientRect();
          webgl.setScissorTest(false);
          webgl.clear();
          webgl.setScissorTest(true);
          views.forEach((view, index) => {
            const panel = panels.current[index];
            if (!panel) return;
            const rectangle = panel.getBoundingClientRect();
            const x = rectangle.left - hostBounds.left;
            const y = height - (rectangle.bottom - hostBounds.top);
            camera.aspect = rectangle.width / Math.max(rectangle.height, 1);
            camera.updateProjectionMatrix();
            webgl.setViewport(x, y, rectangle.width, rectangle.height);
            webgl.setScissor(x, y, rectangle.width, rectangle.height);
            webgl.render(view.scene, camera);
          });
        }

        function resize() {
          if (cancelled) return;
          const rectangle = element!.getBoundingClientRect();
          width = Math.max(1, rectangle.width);
          height = Math.max(1, rectangle.height);
          webgl.setSize(width, height, false);
          draw();
        }

        function stopMovement() {
          movementActive = false;
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
          setPlaying(false);
        }

        function movementFrame(now: number) {
          if (cancelled || !movementActive) return;
          const seconds = Math.max(0, (now - movementStarted) / 1000);
          const envelope = Math.sin(Math.min(seconds / 4, 1) * Math.PI);
          views.forEach((view) => {
            view.group.rotation.y = Math.sin(seconds * 2.8) * 0.24 * envelope;
            view.group.rotation.z = Math.sin(seconds * 3.4) * 0.04 * envelope;
          });
          draw();
          if (seconds < 4)
            animationFrame = requestAnimationFrame(movementFrame);
          else stopMovement();
        }

        function featureTarget(kind: "label" | "wear") {
          const root = views[0].root;
          const features: Three.Object3D[] = [];
          const printedLabels: Three.Object3D[] = [];
          root.traverse((object) => {
            if (kind === "label" && /label.*print/i.test(object.name))
              printedLabels.push(object);
            if (
              (kind === "label"
                ? /woven-neck-label/i
                : /(?:cuff.*(?:wear|stain))|(?:(?:wear|stain).*cuff)/i
              ).test(object.name)
            )
              features.push(object);
          });
          views[0].group.updateMatrixWorld(true);
          const selected = printedLabels.length ? printedLabels : features;
          const bounds = new THREE.Box3();
          selected.forEach((feature) =>
            bounds.union(new THREE.Box3().setFromObject(feature)),
          );
          return selected.length
            ? bounds.getCenter(new THREE.Vector3())
            : new THREE.Vector3(
                kind === "wear" ? 0.6 : 0,
                kind === "wear" ? -0.33 : 0.58,
                0.1,
              );
        }

        function setMode(next: ViewMode, animate = true) {
          stopMovement();
          activeMode = next;
          views.forEach((view) => {
            view.group.rotation.set(0, 0, 0);
            view.key.position.set(
              next === "surface" ? -3 : -2,
              next === "surface" ? 0.2 : 3,
              4,
            );
            view.key.intensity = next === "surface" ? 3 : 2.4;
          });
          let target = new THREE.Vector3(0, 0, 0);
          let distance = 3.0;
          if (next === "front") distance = 2.7;
          if (next === "drape") {
            distance = 2.65;
            views.forEach((view) => view.group.rotation.set(0, -0.28, -0.07));
          }
          if (next === "surface") {
            target.set(0, -0.03, 0.15);
            distance = 1.05;
          }
          if (next === "label" || next === "wear") {
            target = featureTarget(next);
            distance = next === "label" ? 0.35 : 0.55;
          }
          if (next === "movement" && reducedMotionRef.current) {
            views.forEach((view) => view.group.rotation.set(0, 0.2, 0.03));
          }
          orbit.target.copy(target);
          // The authored label is sewn into the inner back neckline. A high
          // front angle looks through that opening instead of through the body.
          const offset =
            next === "label"
              ? new THREE.Vector3(0, 0.26, 0.24)
              : new THREE.Vector3(0, next === "drape" ? -0.12 : 0.04, distance);
          camera.position.copy(target).add(offset);
          orbit.update();
          draw();
          if (next === "movement" && animate && !reducedMotionRef.current) {
            movementStarted = performance.now();
            movementActive = true;
            setPlaying(true);
            animationFrame = requestAnimationFrame(movementFrame);
          }
        }

        const controlChange = () => draw();
        const controlStart = () => stopMovement();
        orbit.addEventListener("change", controlChange);
        orbit.addEventListener("start", controlStart);
        removeControlListener = () => {
          orbit.removeEventListener("change", controlChange);
          orbit.removeEventListener("start", controlStart);
        };
        runtime.current = {
          setMode,
          rotate: (horizontal, vertical = 0) => {
            stopMovement();
            const spherical = new THREE.Spherical().setFromVector3(
              camera.position.clone().sub(orbit.target),
            );
            spherical.theta += horizontal;
            spherical.phi = THREE.MathUtils.clamp(
              spherical.phi + vertical,
              orbit.minPolarAngle,
              orbit.maxPolarAngle,
            );
            camera.position
              .copy(orbit.target)
              .add(new THREE.Vector3().setFromSpherical(spherical));
            orbit.update();
            draw();
          },
          zoom: (factor) => {
            const offset = camera.position.clone().sub(orbit.target);
            const distance = THREE.MathUtils.clamp(
              offset.length() * factor,
              orbit.minDistance,
              orbit.maxDistance,
            );
            camera.position.copy(orbit.target).add(offset.setLength(distance));
            orbit.update();
            draw();
          },
          reset: () => setMode(activeMode, false),
          replay: () => setMode("movement"),
          pause: () => {
            stopMovement();
            draw();
          },
        };
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(element);
          panels.current.forEach(
            (panel) => panel && resizeObserver!.observe(panel),
          );
        }
        window.addEventListener("resize", resize);
        removeResizeListener = () =>
          window.removeEventListener("resize", resize);
        resize();
        setMode(modeRef.current);
        setRenderState("ready");
      } catch (error) {
        if (
          cancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        teardown();
        setPlaying(false);
        setRenderState("error");
      }
    })();
    return teardown;
    // Asset identities, rather than object references, determine GPU lifetimes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey, staticView, forceWebglOff, attempt, visible]);

  function selectMode(next: ViewMode) {
    if (mode === undefined) setOwnMode(next);
    onModeChange?.(next);
  }

  function retry() {
    setStaticView(false);
    setAttempt((value) => value + 1);
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      renderState !== "ready" ||
      event.target !== event.currentTarget ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const commands: Record<string, () => void> = {
      ArrowLeft: () => runtime.current?.rotate(-0.2),
      ArrowRight: () => runtime.current?.rotate(0.2),
      ArrowUp: () => runtime.current?.rotate(0, -0.15),
      ArrowDown: () => runtime.current?.rotate(0, 0.15),
      "+": () => runtime.current?.zoom(0.85),
      "=": () => runtime.current?.zoom(0.85),
      "-": () => runtime.current?.zoom(1.18),
      "0": () => runtime.current?.reset(),
      Home: () => runtime.current?.reset(),
    };
    const command = commands[event.key];
    if (command) {
      event.preventDefault();
      command();
    }
  }

  const fallbackText =
    renderState === "error"
      ? "The 3D garment could not load. Its authored static view is available below."
      : fallbackReason === "static"
        ? "Static view selected."
        : fallbackReason === "no-model"
          ? "An authored static view is available for this garment."
          : fallbackReason === "another-view"
            ? "Static view is available while another garment uses 3D."
            : "3D is unavailable in this browser. The authored static view is available.";
  const canChooseMode = mode === undefined || Boolean(onModeChange);
  const canRetry = !forceWebglOff && stages.every((stage) => stage.model);

  return (
    <section
      className={`garment-viewer${compact ? " gv-compact" : ""}${reference ? " gv-paired" : ""}`}
      data-testid="garment-viewer"
      data-mode={currentMode}
      data-render-state={renderState}
      data-fallback-reason={
        renderState === "fallback" ? fallbackReason : undefined
      }
      data-playing={playing ? "true" : "false"}
      aria-label={
        reference
          ? `Compare ${listing.name} with ${reference.name}`
          : `${listing.name} garment viewer`
      }
    >
      <div
        ref={host}
        className="gv-stage"
        data-testid="garment-stage"
        role="group"
        tabIndex={renderState === "ready" ? 0 : -1}
        onKeyDown={keyboard}
        aria-label={`${MODE_LABELS[currentMode]}. Interactive garment illustration.`}
        aria-describedby={explanationId}
      >
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            ref={(node) => {
              panels.current[index] = node;
            }}
            className="gv-panel"
            style={{ "--gv-background": stage.background } as CSSProperties}
            data-testid={
              reference && index === 0
                ? "reference-viewport"
                : "listing-viewport"
            }
            data-side={reference && index === 0 ? "reference" : "listing"}
          >
            <div className="gv-item-label">
              <span>
                {reference && index === 0 ? "Your reference" : "This garment"}
              </span>
              <strong>{stage.name}</strong>
            </div>
            <img
              className={`gv-poster gv-poster-${currentMode}${renderState === "ready" ? " gv-poster-hidden" : ""}`}
              src={stage.poster}
              alt={`${stage.name}, authored static garment illustration`}
              draggable="false"
            />
            <span className="gv-ground" aria-hidden="true" />
          </div>
        ))}
        <span className="gv-view-label">
          {renderState === "ready"
            ? MODE_LABELS[currentMode]
            : "Static garment view"}
        </span>
        {renderState === "loading" && (
          <div className="gv-loading" role="status">
            <span className="gv-spinner" aria-hidden="true" />
            Preparing your 3D view…
          </div>
        )}
      </div>
      <div className="gv-toolbar">
        {canChooseMode ? (
          <div
            className="gv-modes"
            role="group"
            aria-label="Garment view modes"
          >
            {MODES.map((item) => (
              <button
                type="button"
                key={item.value}
                className={currentMode === item.value ? "gv-mode-active" : ""}
                aria-pressed={currentMode === item.value}
                onClick={() => selectMode(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="gv-capture-mode">{MODE_LABELS[currentMode]}</span>
        )}
        {renderState === "ready" && (
          <div
            className="gv-camera-controls"
            role="group"
            aria-label="3D camera controls"
          >
            <button
              type="button"
              aria-label="Rotate garment left"
              title="Rotate left"
              onClick={() => runtime.current?.rotate(-0.25)}
            >
              ↶
            </button>
            <button
              type="button"
              aria-label="Rotate garment right"
              title="Rotate right"
              onClick={() => runtime.current?.rotate(0.25)}
            >
              ↷
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => runtime.current?.zoom(1.18)}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => runtime.current?.zoom(0.85)}
            >
              +
            </button>
            <button
              type="button"
              className="gv-reset"
              onClick={() => runtime.current?.reset()}
            >
              Reset
            </button>
          </div>
        )}
      </div>
      <div className="gv-caption">
        <p id={explanationId}>
          {renderState === "ready"
            ? currentMode === "movement"
              ? reducedMotion
                ? "Reduced motion: a still illustrative pose. This is not measured fabric behaviour."
                : "A four-second illustrative motion. This is not measured fabric behaviour."
              : "Illustrative 3D. Drag to rotate; pinch or scroll to zoom. Arrow keys rotate, +/− zoom, 0 resets."
            : renderState === "loading"
              ? "Illustrative 3D is loading. Seller evidence remains separate."
              : fallbackText}
        </p>
        <div className="gv-view-actions">
          {renderState === "ready" &&
            currentMode === "movement" &&
            !reducedMotion && (
              <button
                type="button"
                onClick={() =>
                  playing ? runtime.current?.pause() : runtime.current?.replay()
                }
              >
                {playing ? "Pause motion" : "Replay motion"}
              </button>
            )}
          {renderState === "ready" && (
            <button type="button" onClick={() => setStaticView(true)}>
              Static view
            </button>
          )}
          {(renderState === "error" || renderState === "fallback") &&
            canRetry && (
              <button type="button" onClick={retry}>
                {fallbackReason === "static" && renderState === "fallback"
                  ? "Open 3D view"
                  : "Retry 3D"}
              </button>
            )}
        </div>
      </div>
    </section>
  );
}

export default GarmentViewer;
