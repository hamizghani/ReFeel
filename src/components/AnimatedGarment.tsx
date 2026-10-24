import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, ArrowClockwise, ArrowsOut, MagnifyingGlassMinus, MagnifyingGlassPlus, ArrowUUpLeft } from '@phosphor-icons/react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GarmentPhysics, type ClothVariant } from '../cloth/physics';
import { dampingFactor, garmentPose, normaliseStep, pullEnvelope } from '../cloth/choreography';
import { mediaFor } from '../media';
import './garment.css';

export interface AnimatedGarmentProps {
  variant?: ClothVariant;
  step?: number;
  playing?: boolean;
  progress?: number;
  resetKey?: number;
  interactive?: boolean;
  comparison?: boolean;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
}

interface Deformable {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  base: Float32Array;
}
interface ViewerRuntime {
  wake: () => void;
  reset: () => void;
  action: (kind: 'left' | 'right' | 'in' | 'out') => void;
}

const MODEL_URL = '/models/cloud-animated.glb';
const focusNames = { garment: 'Full garment', back: 'Back view', label: 'Collar & label', hang: 'Hang & movement', pull: 'Gentle pull & release', cuff: 'Cuff & fabric detail' };

/** A procedural weave makes close-ups legible without a glossy plastic finish. */
function createWeave(): THREE.DataTexture {
  const size = 128, bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const warp = Math.sin(x * Math.PI / 2), weft = Math.sin(y * Math.PI / 2);
      bytes[i] = 128 + Math.round(warp * 17);
      bytes[i + 1] = 128 + Math.round(weft * 17);
      bytes[i + 2] = 252;
      bytes[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}


function materialKey(name: string): string {
  if (/button-hole/.test(name)) return 'button-hole';
  if (/button/.test(name)) return 'button';
  if (/inside-neck/.test(name)) return 'inside-neck';
  if (/seam|stitch|hem|edge/.test(name)) return 'seam';
  if (/label/.test(name)) return 'label';
  return 'fabric';
}

function materialFor(name: string, variant: ClothVariant, weave: THREE.Texture): THREE.Material {
  const blue = variant === 'reference';
  if (/button-hole/.test(name)) return new THREE.MeshStandardMaterial({ color: blue ? '#314754' : '#a4a393', roughness: .95 });
  if (/button/.test(name)) return new THREE.MeshPhysicalMaterial({ color: blue ? '#d8d9d0' : '#dfded1', roughness: .7, sheen: .05, sheenColor: new THREE.Color('#ffffff') });
  const inner = /inside-neck/.test(name);
  const trim = /seam|stitch|hem|edge/.test(name);
  const label = /label/.test(name);
  return new THREE.MeshPhysicalMaterial({
    color: label ? '#e6e5db' : inner ? blue ? '#698698' : '#bfbba9' : trim ? blue ? '#6c91aa' : '#bdb8a7' : blue ? '#7da0b8' : '#d4d0bc',
    roughness: .94,
    metalness: 0,
    sheen: blue ? .2 : .11,
    sheenColor: new THREE.Color(blue ? '#c3d7df' : '#f0efe8'),
    sheenRoughness: .85,
    normalMap: weave,
    normalScale: new THREE.Vector2(.12, .12),
    side: THREE.DoubleSide,
  });
}

export default function AnimatedGarment(props: AnimatedGarmentProps) {
  const { variant = 'cloud', interactive = true, comparison = false, className = '' } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const leftGripRef = useRef<HTMLDivElement>(null);
  const rightGripRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(props);
  latestRef.current = props;
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [exploring, setExploring] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stage = normaliseStep(props.step);
  const pose = garmentPose(stage, props.progress ?? 1);
  const photos = mediaFor(variant === 'reference' ? 'my-blue-blouse' : 'cloud-poplin').photos;
  const photo = photos[0];
  const labelPhoto = photos.find((item) => item.kind === 'label');

  useEffect(() => {
    const mount = mountRef.current, container = containerRef.current;
    if (!mount || !container) return;
    let disposed = false, failed = false, visible = true, frame = 0, lastTime = 0;
    let resizeObserver: ResizeObserver | undefined, intersectionObserver: IntersectionObserver | undefined;
    let renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined;
    let manual = false, manualGoal: THREE.Vector3 | undefined, settle = 0;
    let aspect = 1, lastNormalTime = 0, lastDiagnosticsTime = 0;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = reducedQuery.matches;
    setReduced(reduceMotion);
    setStatus('loading');
    container.dataset.garmentReady = 'false';
    container.dataset.physicsSteps = '0';
    container.dataset.meshCount = '0';
    delete container.dataset.loadError;
    setExploring(false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .015, 12);
    const garment = new THREE.Group();
    const physics = new GarmentPhysics(variant);
    const deformables: Deformable[] = [];
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const targetCamera = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    let lastStep = normaliseStep(latestRef.current.step), lastReset = latestRef.current.resetKey;
    let targetYaw = 0;
    const sourceMaterials: THREE.Material[] = [];
    const weave = createWeave();
    textures.add(weave);
    const onMotionPreference = (event: MediaQueryListEvent) => { reduceMotion = event.matches; setReduced(event.matches); reset(); };
    reducedQuery.addEventListener('change', onMotionPreference);

    function schedule() {
      if (!disposed && !failed && visible && !document.hidden && !frame) frame = requestAnimationFrame(renderFrame);
    }
    function wake() { settle = 0; schedule(); }
    function reset(viewOnly = false) {
      manual = false; manualGoal = undefined;
      setExploring(false);
      if (!viewOnly) physics.reset();
      const p = garmentPose(latestRef.current.step, reduceMotion ? 1 : latestRef.current.progress ?? 1, aspect);
      targetCamera.fromArray(p.camera); targetLook.fromArray(p.target); targetYaw = p.yaw;
      if (controls && reduceMotion) controls.target.copy(targetLook);
      wake();
    }
    function manualAction(kind: 'left' | 'right' | 'in' | 'out') {
      if (!controls || !interactive) return;
      manual = true; setExploring(true);
      const offset = camera.position.clone().sub(controls.target);
      if (kind === 'left' || kind === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), kind === 'left' ? -.35 : .35);
      else offset.multiplyScalar(kind === 'in' ? .8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
      manualGoal = controls.target.clone().add(offset);
      wake();
    }
    runtimeRef.current = { wake, reset: () => reset(true), action: manualAction };

    function updateSize() {
      if (!renderer || !controls) return;
      const width = Math.max(1, mount!.clientWidth), height = Math.max(1, mount!.clientHeight);
      aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      if (!manual) {
        const p = garmentPose(latestRef.current.step, reduceMotion ? 1 : latestRef.current.progress ?? 1, aspect);
        targetCamera.fromArray(p.camera);
      }
      wake();
    }

    function deform(time: number, force = false) {
      let maxDisplacement = 0;
      const computeNormals = force || time - lastNormalTime > 1000 / 30;
      for (const { mesh, base } of deformables) {
        const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        const array = positions.array as Float32Array;
        for (let i = 0; i < base.length; i += 3) {
          const [dx, dy, dz] = physics.sampleDisplacement(base[i], base[i + 1], base[i + 2]);
          array[i] = base[i] + dx; array[i + 1] = base[i + 1] + dy; array[i + 2] = base[i + 2] + dz;
          maxDisplacement = Math.max(maxDisplacement, Math.abs(dx), Math.abs(dy), Math.abs(dz));
        }
        positions.needsUpdate = true;
        if (computeNormals) mesh.geometry.computeVertexNormals();
      }
      if (computeNormals) lastNormalTime = time;
      container!.dataset.maxDisplacement = maxDisplacement.toFixed(6);
    }

    function renderFrame(time: number) {
      frame = 0;
      if (disposed || failed || !renderer || !controls || !visible || document.hidden) { lastTime = 0; return; }
      const frameStarted = performance.now();
      let physicsMs = 0, deformationMs = 0;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
      lastTime = time;
      const current = latestRef.current;
      const currentStep = normaliseStep(current.step);
      if (currentStep !== lastStep || current.resetKey !== lastReset) {
        const explicitReplay = current.resetKey !== lastReset;
        lastStep = currentStep; lastReset = current.resetKey;
        reset(!explicitReplay);
      }
      const progress = reduceMotion ? 1 : current.progress ?? 1;
      const nextPose = garmentPose(currentStep, progress, aspect);
      targetYaw = nextPose.yaw;
      const damping = dampingFactor(delta, reduceMotion ? 40 : 9);
      if (!manual) {
        targetCamera.fromArray(nextPose.camera); targetLook.fromArray(nextPose.target);
        if (reduceMotion) { camera.position.copy(targetCamera); controls.target.copy(targetLook); }
        else { camera.position.lerp(targetCamera, damping); controls.target.lerp(targetLook, damping); }
      } else if (manualGoal) {
        camera.position.lerp(manualGoal, damping);
        if (camera.position.distanceToSquared(manualGoal) < .000001) manualGoal = undefined;
      }
      if (!manual) {
        if (reduceMotion) garment.rotation.y = targetYaw;
        else garment.rotation.y += (targetYaw - garment.rotation.y) * damping;
      }
      const before = camera.position.clone();
      controls.update();
      const controlMoving = before.distanceToSquared(camera.position) > .00000001;
      const motion = reduceMotion ? 'rest' : nextPose.motion;
      const diagBefore = physics.diagnostics();
      const isPausedPose = current.playing === false && currentStep !== undefined && progress > 0 && progress < 1;
      const needsPhysics = !reduceMotion && !isPausedPose && (settle < 110 || (current.playing && !reduceMotion) || diagBefore.kineticEnergy > .0000003);
      if (needsPhysics) {
        const startedPhysics = performance.now();
        physics.advance(delta, motion, progress);
        physicsMs = performance.now() - startedPhysics;
        const startedDeformation = performance.now();
        deform(time);
        deformationMs = performance.now() - startedDeformation;
      }
      const cameraMoving = !manual && (camera.position.distanceToSquared(targetCamera) > .0000004 || controls.target.distanceToSquared(targetLook) > .0000001) || Boolean(manualGoal);
      const yawMoving = !manual && Math.abs(targetYaw - garment.rotation.y) > .00003;
      garment.updateMatrixWorld();
      for (const [side, element] of [[-1, leftGripRef.current], [1, rightGripRef.current]] as const) {
        if (!element) continue;
        const isPull = currentStep === 4, isSupport = currentStep === 0 || currentStep === 3;
        if (!isPull && !isSupport) { element.style.visibility = 'hidden'; continue; }
        const x = side * (isPull ? .16 : .145), y = isPull ? -.15 : .304, z = .135;
        const [dx, dy, dz] = physics.sampleDisplacement(x, y, z);
        const point = new THREE.Vector3(x + dx, y + dy, z + dz).applyMatrix4(garment.matrixWorld).project(camera);
        element.style.visibility = Math.abs(point.x) > .98 || Math.abs(point.y) > .98 ? 'hidden' : 'visible';
        element.style.transform = `translate(${(point.x + 1) * mount!.clientWidth / 2}px, ${(-point.y + 1) * mount!.clientHeight / 2}px)`;
        element.dataset.kind = isPull ? 'pull' : 'support';
        element.style.opacity = isPull ? String(.35 + .65 * pullEnvelope(progress)) : '.45';
      }
      const renderStarted = performance.now();
      renderer.render(scene, camera);
      const renderMs = performance.now() - renderStarted;
      const continueFrame = cameraMoving || yawMoving || controlMoving || needsPhysics || Boolean(current.playing && !reduceMotion);
      if (time - lastDiagnosticsTime > 250 || !continueFrame) {
        const diagnostics = physics.diagnostics();
        container!.dataset.physicsSteps = String(diagnostics.steps);
        container!.dataset.physicsStrain = Number(diagnostics.maxStrain).toFixed(4);
        container!.dataset.physicsEnergy = Number(diagnostics.kineticEnergy).toFixed(6);
        container!.dataset.garmentYaw = garment.rotation.y.toFixed(4);
        container!.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(5);
        container!.dataset.cameraAzimuth = controls.getAzimuthalAngle().toFixed(5);
        container!.dataset.cameraPolar = controls.getPolarAngle().toFixed(5);
        container!.dataset.cameraTargetY = controls.target.y.toFixed(5);
        container!.dataset.renderCalls = String(renderer.info.render.calls);
        container!.dataset.renderTriangles = String(renderer.info.render.triangles);
        container!.dataset.physicsMs = physicsMs.toFixed(3);
        container!.dataset.deformationMs = deformationMs.toFixed(3);
        container!.dataset.renderMs = renderMs.toFixed(3);
        container!.dataset.frameCpuMs = (performance.now() - frameStarted).toFixed(3);
        lastDiagnosticsTime = time;
      }
      settle++;
      if (continueFrame) schedule();
    }

    const onVisibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
      else wake();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      if (!disposed) { setStatus('error'); latestRef.current.onError?.(); }
      if (frame) cancelAnimationFrame(frame); frame = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    async function initialise() {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        if (disposed) { renderer.dispose(); return; }
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .95;
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.setAttribute('aria-label', `${variant === 'reference' ? 'Blue reference' : 'Cloud Poplin'} interactive 3D garment`);
        renderer.domElement.setAttribute('role', 'img');
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        mount!.appendChild(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = interactive;
        controls.enableDamping = true; controls.dampingFactor = .075;
        controls.enablePan = false;
        controls.minDistance = .22; controls.maxDistance = 4.8;
        controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI - .35;
        controls.rotateSpeed = .65; controls.zoomSpeed = .75;
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        // Horizontal drags explore; a vertical swipe remains a page scroll.
        renderer.domElement.style.touchAction = 'pan-y';
        controls.addEventListener('start', () => { manual = true; manualGoal = undefined; setExploring(true); wake(); });
        controls.addEventListener('change', schedule);
        controls.addEventListener('end', wake);
        const initial = garmentPose(latestRef.current.step, reduceMotion ? 1 : latestRef.current.progress ?? 1, aspect);
        camera.position.fromArray(initial.camera);
        controls.target.fromArray(initial.target);
        garment.rotation.y = initial.yaw;
        controls.update();
        scene.add(garment);
        scene.add(new THREE.HemisphereLight('#ffffff', '#e3dfec', 1.2));
        const key = new THREE.DirectionalLight('#fff9ec', 2.5);
        key.position.set(-2.5, 3.4, 3);
        key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = key.shadow.camera.bottom = -1;
        key.shadow.camera.right = key.shadow.camera.top = 1;
        key.shadow.camera.near = .1; key.shadow.camera.far = 9;
        key.shadow.bias = -.0003; key.shadow.normalBias = .015;
        scene.add(key);
        const fill = new THREE.DirectionalLight('#d6e4f4', .9); fill.position.set(2.8, 1, -1.5); scene.add(fill);
        const rim = new THREE.DirectionalLight('#ffffff', 1.25); rim.position.set(0, 2.5, -3); scene.add(rim);
        const floorGeometry = new THREE.PlaneGeometry(5, 5);
        const floorMaterial = new THREE.ShadowMaterial({ color: '#b7b0c2', opacity: .15 });
        geometries.add(floorGeometry); materials.add(floorMaterial);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; floor.position.y = -.46; floor.receiveShadow = true; scene.add(floor);
        resizeObserver = new ResizeObserver(updateSize); resizeObserver.observe(mount!);
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) { lastTime = 0; wake(); }
          else { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
        }, { rootMargin: '80px' });
        intersectionObserver.observe(container!);
        updateSize();
        const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
        if (disposed) {
          gltf.scene.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); const mats = Array.isArray(node.material) ? node.material : [node.material]; mats.forEach((m) => m.dispose()); } });
          return;
        }
        gltf.scene.updateMatrixWorld(true);
        const batches = new Map<string, { geometries: THREE.BufferGeometry[]; material: THREE.Material; parts: number }>();
        let authoredParts = 0;
        gltf.scene.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          // Defence in depth if a replacement archive accidentally retains V1 marks.
          if (/wear|label-print/.test(node.name)) return;
          const oldMaterials = Array.isArray(node.material) ? node.material : [node.material];
          sourceMaterials.push(...oldMaterials);
          const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
          const key = materialKey(node.name);
          let batch = batches.get(key);
          if (!batch) {
            const material = materialFor(key, variant, weave);
            materials.add(material);
            batch = { geometries: [], material, parts: 0 };
            batches.set(key, batch);
          }
          batch.geometries.push(geometry); batch.parts++; authoredParts++;
          node.geometry.dispose();
        });
        // Preserve the original subparts and attributes, while sharing six draw batches.
        // No vertex welding or decimation: hems, seams, buttons and labels still follow
        // precisely the same displacement field as the body and sleeves.
        for (const [name, batch] of batches) {
          const geometry = mergeGeometries(batch.geometries, false);
          batch.geometries.forEach((part) => part.dispose());
          if (!geometry) throw new Error('Garment parts could not be batched');
          geometries.add(geometry);
          const mesh = new THREE.Mesh(geometry, batch.material);
          mesh.name = `${name}-${batch.parts}-parts`; mesh.castShadow = true;
          mesh.receiveShadow = false; mesh.frustumCulled = false;
          const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
          positions.setUsage(THREE.DynamicDrawUsage);
          deformables.push({ mesh, base: new Float32Array(positions.array as Float32Array) });
          garment.add(mesh);
        }
        for (const material of sourceMaterials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) { value.dispose(); const image = value.image as ImageBitmap | undefined; image?.close?.(); }
          material.dispose();
        }
        // Static reduced-motion views still use a naturally settled physical pose.
        if (reduceMotion) { for (let i = 0; i < 120; i++) physics.advance(1 / 120, 'rest', 1); }
        deform(0, true);
        // Offscreen panels still need a real first frame before rendering is culled.
        const loadedPose = garmentPose(latestRef.current.step, reduceMotion ? 1 : latestRef.current.progress ?? 1, aspect);
        camera.position.fromArray(loadedPose.camera); controls.target.fromArray(loadedPose.target);
        garment.rotation.y = loadedPose.yaw; controls.update(); garment.updateMatrixWorld();
        renderer.render(scene, camera);
        container!.dataset.garmentReady = 'true';
        container!.dataset.meshCount = String(deformables.length);
        container!.dataset.authoredParts = String(authoredParts);
        setStatus('ready');
        latestRef.current.onReady?.();
        wake();
      } catch (error) {
        failed = true;
        if (!disposed) {
          container!.dataset.garmentReady = 'false';
          container!.dataset.loadError = error instanceof Error ? error.message : 'Viewer initialization failed';
          setStatus('error');
          latestRef.current.onError?.();
        }
        if (frame) cancelAnimationFrame(frame); frame = 0;
      }
    }
    void initialise();

    return () => {
      disposed = true; if (frame) cancelAnimationFrame(frame);
      runtimeRef.current = null;
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener('change', onMotionPreference);
      controls?.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [variant, attempt, interactive]);

  useEffect(() => { runtimeRef.current?.wake(); }, [props.step, props.playing, props.resetKey]);
  useEffect(() => { if (!reduced) runtimeRef.current?.wake(); }, [props.progress, reduced]);

  return <div ref={containerRef} className={`animated-garment ${comparison ? 'animated-garment-comparison' : ''} ${variant === 'reference' ? 'animated-garment-blue' : ''} ${className}`} data-variant={variant} data-step={stage ?? 'explore'} data-playing={Boolean(props.playing)}>
    <div ref={mountRef} className="garment-canvas-mount" /><div ref={leftGripRef} className="garment-grip garment-grip-left" aria-hidden="true"><i /><span /></div><div ref={rightGripRef} className="garment-grip garment-grip-right" aria-hidden="true"><i /><span /></div>
    {status !== 'ready' && <div className={`garment-fallback ${status === 'error' ? 'garment-load-error' : ''}`}>
      <img src={photo?.src} alt={`${variant === 'reference' ? 'Your blue reference' : 'Cloud Poplin'} photographic view`} />
      <div>{status === 'loading' ? <><span className="garment-loading-indicator" aria-hidden="true" /><p role="status">Preparing your garment…</p></> : <><strong>Explore the photo instead.</strong><p>The 3D view could not load on this device.</p><button className="button secondary" onClick={() => setAttempt((n) => n + 1)}>Try 3D again</button></>}</div>
    </div>}
    {status === 'ready' && <>
      <div className="garment-focus-tag"><ArrowsOut size={15} aria-hidden="true" /> {exploring ? 'Exploring your view' : focusNames[pose.focus]}</div>
      {stage === 2 && labelPhoto && <figure className="garment-label-inset"><img src={labelPhoto.src} alt="Actual Cloud Poplin collar-label photograph" /><figcaption>Label photo</figcaption></figure>}
      {interactive && <div className="garment-controls" aria-label="3D garment controls">
        <div><button type="button" onClick={() => runtimeRef.current?.action('left')} aria-label="Rotate garment left" title="Rotate left"><ArrowCounterClockwise size={20} /></button><button type="button" onClick={() => runtimeRef.current?.action('right')} aria-label="Rotate garment right" title="Rotate right"><ArrowClockwise size={20} /></button><button type="button" onClick={() => runtimeRef.current?.action('out')} aria-label="Zoom garment out" title="Zoom out"><MagnifyingGlassMinus size={20} /></button><button type="button" onClick={() => runtimeRef.current?.action('in')} aria-label="Zoom garment in" title="Zoom in"><MagnifyingGlassPlus size={20} /></button></div>
        <button type="button" className="garment-reset" aria-label="Reset view" onClick={() => runtimeRef.current?.reset()}><ArrowUUpLeft size={16} /><span className="garment-reset-full">Reset view</span><span className="garment-reset-short">Reset</span></button>
      </div>}
      {stage === undefined && <p className="garment-explore-hint">Drag sideways to rotate · pinch to zoom</p>}
      {reduced && <p className="garment-reduced-note">Reduced motion: showing the final view.</p>}
    </>}
  </div>;
}
