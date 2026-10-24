import { lazy, Suspense, useEffect, useReducer, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, CornersOut, GridFour, Pause, Play, Record, ArrowCounterClockwise, FloppyDisk, X } from "@phosphor-icons/react";
import type { Listing } from "../domain";
import { mediaFor } from "../media";
import { newTake, recordingTransition, TAKE_LENGTH } from "../recording";
const AnimatedGarment = lazy(() => import("./AnimatedGarment"));

export const RECORDING_TASKS = [
  { name: "Full garment", cue: "Show the full shirt", tip: "Hold it by the shoulders or use a hanger. Keep the neckline, sleeves and hem in view.", purpose: "Start with the overall shape. Compare the proportions with a piece you already know.", kind: "front" },
  { name: "Back view", cue: "Flip your shirt over", tip: "Turn slowly to show the back and both sleeves. You can also drag the example to look around.", purpose: "The back reveals seams and shape that a front photo leaves out.", kind: "back" },
  { name: "Label", cue: "Bring the label closer", tip: "Show the actual size and care label clearly. Use the real photograph below to read the prepared garment's label.", purpose: "A label can support size and composition. The animated label is only an illustration.", kind: "label" },
  { name: "Hang & move", cue: "Let it hang naturally", tip: "Gently move the hanger, then let the fabric settle. Watch how the hem and folds follow the movement.", purpose: "Notice whether it keeps a crisper shape or falls more loosely. The example demonstrates the action.", kind: "front" },
  { name: "Gentle pull", cue: "Pull gently, then release", tip: "Hold a small section, pull gently once, then release. Stop if the fabric feels fragile.", purpose: "Compare give using the owner's and seller's descriptions. Animated stretching is not a measurement.", kind: "detail" },
  { name: "Fabric up close", cue: "Show the fabric and any wear", tip: "Bring the cuff, seams and surface closer. Check the photographs for actual visible texture and condition.", purpose: "Visible texture is useful; softness comes from the person who has touched the piece.", kind: "wear" },
] as const;

interface GuidedRecordingProps {
  garment: Listing; stage: number; capturedSteps: number[]; mode: "seller" | "reference";
  onComplete: (step: number) => void; onNext: () => void; onRetake: (step: number) => void;
  onFinish: () => void; onExit: () => void; onPrevious?: () => void;
  reviewOnly?: boolean; onViewStep?: (step: number) => void;
  exitLabel?: string; finishLabel?: string; storageAvailable?: boolean;
}

export default function GuidedRecording(props: GuidedRecordingProps) {
  const { garment, capturedSteps, mode, onComplete, onNext, onFinish, onExit, reviewOnly = false, storageAvailable = true } = props;
  const stage = Math.max(0, Math.min(props.stage, 5));
  const baseTask = RECORDING_TASKS[stage];
  const task = { ...baseTask, cue: stage === 1 && !["Tops", "Shirts"].includes(garment.category) ? "Turn the garment over" : stage === 0 && !["Tops", "Shirts"].includes(garment.category) ? "Show the full garment" : baseTask.cue };
  const saved = capturedSteps.includes(stage);
  const [take, act] = useReducer(recordingTransition, undefined, () => newTake());
  const [grid, setGrid] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const enlargeRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);
  const collection = mediaFor(garment.templateId ?? garment.id).photos;
  const exactPhoto = collection.find(photo => photo.kind === task.kind);
  const photo = exactPhoto ?? (task.kind === "wear" ? collection.find(p => p.kind === "detail") : undefined) ?? collection[0];
  const templateId = garment.templateId ?? garment.id;
  const variant = templateId === "cloud-poplin" ? "cloud" : templateId === "my-blue-blouse" ? "reference" : undefined;
  const [modelReady, setModelReady] = useState(!variant);
  const running = take.phase === "playing";
  const progress = Math.min(1, take.elapsed / TAKE_LENGTH);
  const timerText = `00:${String(Math.floor(take.elapsed)).padStart(2, "0")}`;

  useEffect(() => {
    if (!running || !modelReady) return;
    let frame = 0;
    let previous = performance.now();
    const advance = (now: number) => {
      const seconds = Math.max(0, (now - previous) / 1000);
      previous = now;
      act({ type: "TICK", seconds });
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [running, modelReady]);
  useEffect(() => {
    submitted.current = false;
    act({ type: "REPLAY" });
    setImageFailed(false);
    nextRef.current?.focus({ preventScroll: true });
  }, [stage, garment.id]);
  useEffect(() => {
    if (!expanded) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setExpanded(false); enlargeRef.current?.focus(); }
      if (event.key === "Tab") {
        const items = modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener("keydown", escape); };
  }, [expanded]);
  function next() {
    if (submitted.current) return;
    submitted.current = true;
    act({ type: "SAVE" });
    if (!saved && !reviewOnly) onComplete(stage);
    if (stage === 5) onFinish(); else onNext();
  }
  function replay() { setResetKey(key => key + 1); act({ type: "REPLAY" }); }
  function previous() { if (stage > 0) { props.onPrevious?.(); } }
  const nextLabel = stage === 5 ? props.finishLabel ?? (mode === "seller" ? "Review listing" : "Save familiar piece") : "Next";
  const frame = (interactive: boolean) => <div className={`recording-viewfinder ${variant ? "is-animated" : "is-photographic"} ${(task.kind === "front" || task.kind === "back") ? "is-full-view" : ""}`}>
    {variant ? <Suspense fallback={<div className="recording-model-loading"><img src={collection[0]?.src} alt={garment.name} /><span>Preparing your animated example…</span></div>}><AnimatedGarment variant={variant} step={stage} playing={running} progress={progress} resetKey={resetKey} interactive={interactive} onReady={() => setModelReady(true)} onError={() => setModelReady(true)} /></Suspense> : !imageFailed && photo ? <img src={photo.src} alt={`${garment.name}, ${photo.label.toLowerCase()} prepared example`} onError={() => setImageFailed(true)} /> : <div className="recording-image-error"><Record size={38} aria-hidden="true" /><strong>This example photo could not load.</strong><button className="button secondary" onClick={() => setImageFailed(false)}>Try photo again</button></div>}
    {grid && <div className="recording-grid" aria-hidden="true" />}
    <div className="recording-frame-top"><span className="recording-live"><span className={running ? "pulse-dot" : ""} />{running ? "DEMO" : take.phase === "paused" ? "PAUSED" : "READY"} {timerText}</span><span className="recording-example">{variant === "reference" ? "Illustrative reference" : variant ? "Animated example" : "Photo example"}</span></div>
    <div className="recording-frame-bottom"><div className="recording-instruction"><span>{saved ? <CheckCircle size={24} weight="fill" /> : <Record size={24} />}</span><strong id="recording-step-instruction">{task.cue}</strong></div></div>
  </div>;

  return <section className="recording recording-v3" aria-label={`${mode === "seller" ? "Seller" : "Private reference"} guided recording`}>
    <div className="recording-garment-bar"><img src={collection[0]?.src} alt="" /><div><strong>{garment.name}</strong><span>Size {garment.size} · {mode === "seller" ? "Listing draft" : "Your private reference"}</span></div><span className="recording-save-label"><Check size={16} /> {storageAvailable ? "Progress saved here" : "Session only"}</span></div>
    <div className="recording-progress-panel"><div className="recording-progress-heading"><span className="recording-step-disc">STEP<br /><strong>{stage + 1} OF 6</strong></span><h2>{task.name}</h2><span>{capturedSteps.length} of 6 steps complete</span></div><div className="recording-progress-bars" role="progressbar" aria-label="Walkthrough progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={capturedSteps.length} aria-valuetext={`${capturedSteps.length} of 6 demonstration steps complete`}>{RECORDING_TASKS.map((item, index) => <span key={item.name} className={capturedSteps.includes(index) ? "complete" : index === stage ? "current" : ""} />)}</div><ol className="recording-task-list">{RECORDING_TASKS.map((item, index) => <li key={item.name} className={index === stage ? "active" : capturedSteps.includes(index) ? "done" : ""}>{capturedSteps.includes(index) ? <CheckCircle size={16} weight="fill" /> : <span>{index + 1}</span>} {item.name}</li>)}</ol></div>
    <div className="recording-workspace"><div className="recording-main"><div className="recording-toolbar"><span><Record size={17} /> {reviewOnly ? "Review demonstration" : "Guided demonstration"}</span><div><button aria-label={grid ? "Hide framing grid" : "Show framing grid"} aria-pressed={grid} onClick={() => setGrid(!grid)}><GridFour size={20} /></button><button ref={enlargeRef} aria-label="Enlarge garment preview" onClick={() => setExpanded(true)}><CornersOut size={20} /></button></div></div>
      {!expanded && frame(true)}
      <div className="recording-next-row"><div><strong>{timerText}</strong><span> / 00:06</span></div><button ref={nextRef} className="button primary recording-next" aria-describedby="recording-step-instruction" onClick={next}>{nextLabel}<ArrowRight size={20} /></button></div>
      <div className="recording-timeline" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="recording-secondary-controls"><button onClick={previous} disabled={stage === 0 || !props.onPrevious}><ArrowLeft size={18} /> Back</button><button onClick={() => act({ type: running ? "PAUSE" : "RESUME" })} disabled={take.phase === "held" || take.phase === "saved"}>{running ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}{running ? "Pause" : "Resume"}</button><button onClick={replay}><ArrowCounterClockwise size={18} /> Replay</button></div>
      {variant && <p className="recording-explore-help">Drag to turn · pinch or use + to zoom · Reset view returns to this step.</p>}
      <p className="recording-status" role="status">{take.phase === "held" ? "Great! Explore the view, replay it, or tap Next." : take.phase === "paused" ? "Paused. Explore the garment or continue whenever you like." : reviewOnly ? "Review this example. Your saved reference stays ready." : "Watch the example, or tap Next whenever you're ready."}</p>
    </div><aside className="recording-cue-rail"><section className="recording-guide-card"><p className="eyebrow">One simple action</p><h3>{task.cue}</h3><p>{task.tip}</p><div className="recording-tip-photo"><img src={photo?.src} alt={`${task.name}: actual prepared garment photo`} /><span><CheckCircle size={18} /> Actual garment photograph</span></div>{!exactPhoto && <p className="recording-missing-view">No separate {task.kind === "wear" ? "wear photo" : `${task.kind} photo`} is available for this example. That detail stays unconfirmed.</p>}</section><section className="recording-why-card"><CheckCircle size={24} /><div><h3>{mode === "seller" ? "Help someone picture it." : "Start with something you know."}</h3><p>{task.purpose}</p></div></section><button className="recording-exit" onClick={onExit}><FloppyDisk size={18} /> {props.exitLabel ?? "Save progress & finish later"}</button><p className="recording-disclosure">{variant === "reference" ? "An illustrative blue version of the same shirt model; your own garment photos remain the reference." : variant ? "An animated Cloud example with prepared cloth behaviour." : "A prepared walkthrough using garment photos."} Nothing is recorded from your camera. {storageAvailable ? "Next saves walkthrough progress in this browser." : "Progress lasts for this visit."}</p></aside></div>
    {capturedSteps.length > 0 && <section className="recording-catalogue"><div><h3>Your walkthrough</h3><span>{capturedSteps.length} steps complete</span></div><div className="recording-takes">{[...capturedSteps].sort((a, b) => a - b).map(index => { const item = RECORDING_TASKS[index]; const media = collection.find(p => p.kind === item.kind) ?? collection[0]; return <button key={index} onClick={() => props.onViewStep?.(index)} disabled={!props.onViewStep} aria-label={`View ${item.name.toLowerCase()} demonstration`}><img src={media?.src} alt="" /><span><CheckCircle size={17} weight="fill" /> {index + 1}. {item.name}</span><small>Review example</small></button>; })}</div></section>}
    {expanded && <div ref={modalRef} className="recording-modal" role="dialog" aria-modal="true" aria-label="Enlarged garment preview"><button autoFocus className="recording-modal-close" onClick={() => { setExpanded(false); enlargeRef.current?.focus(); }}><X size={22} /> Close preview</button>{frame(true)}</div>}
  </section>;
}
