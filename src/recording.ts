export type RecordingPhase = "playing" | "paused" | "held" | "saved";
export interface RecordingTake { phase: RecordingPhase; elapsed: number; error: string; }
export type RecordingAction =
  | { type: "TICK"; seconds?: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SAVE" }
  | { type: "REPLAY" }
  | { type: "RETAKE" };
export const TAKE_LENGTH = 6;
/** Demo progress is a choice, not a minimum-duration video recording. */
export const MIN_TAKE_LENGTH = 0;
export function newTake(saved = false): RecordingTake {
  return { phase: saved ? "saved" : "playing", elapsed: saved ? TAKE_LENGTH : 0, error: "" };
}
/** The six-second animation never advances a stage; explicit Next does. */
export function recordingTransition(state: RecordingTake, action: RecordingAction): RecordingTake {
  switch (action.type) {
    case "TICK": {
      if (state.phase !== "playing") return state;
      const delta = action.seconds ?? 1;
      if (!Number.isFinite(delta) || delta <= 0) return state;
      const elapsed = Math.min(TAKE_LENGTH, state.elapsed + delta);
      return { ...state, elapsed, phase: elapsed === TAKE_LENGTH ? "held" : "playing" };
    }
    case "PAUSE": return state.phase === "playing" ? { ...state, phase: "paused" } : state;
    case "RESUME": return state.phase === "paused" ? { ...state, phase: "playing" } : state;
    case "SAVE": return state.phase === "saved" ? state : { ...state, phase: "saved", error: "" };
    case "REPLAY":
    case "RETAKE": return newTake();
    default: return state;
  }
}
export interface SavedTake { duration: number; step: number; }
/** Compatibility parser for stored walkthrough durations, never physical evidence. */
export function sanitizeTakes(input: unknown): SavedTake[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  return input.filter((value): value is SavedTake => {
    if (!value || typeof value !== "object") return false;
    const { duration, step } = value as SavedTake;
    if (!Number.isInteger(step) || step < 0 || step > 5 || seen.has(step) || !Number.isFinite(duration) || duration < 0 || duration > TAKE_LENGTH) return false;
    seen.add(step); return true;
  }).map(({ duration, step }) => ({ duration, step }));
}
