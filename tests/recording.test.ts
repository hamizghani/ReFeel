import { describe, expect, it } from "vitest";
import { TAKE_LENGTH, newTake, recordingTransition, sanitizeTakes } from "../src/recording";
import { initialState, transition, sanitizeStoredState, getActiveReferenceCapture, getActiveDraft } from "../src/domain";

describe("prepared guided walkthrough", () => {
  it("autoplays the example immediately when a new step opens", () => {
    expect(newTake()).toEqual({ phase: "playing", elapsed: 0, error: "" });
  });
  it("allows Next immediately, without recording duration or a Stop/Keep gate", () => {
    const progressed = recordingTransition(newTake(), { type: "SAVE" });
    expect(progressed.phase).toBe("saved");
    expect(progressed.elapsed).toBe(0);
    expect(progressed.error).toBe("");
    expect(recordingTransition(progressed, { type: "SAVE" })).toBe(progressed);
  });
  it("holds the final pose at six seconds until explicit Next", () => {
    let state = newTake();
    for (let i = 0; i < 20; i++) state = recordingTransition(state, { type: "TICK" });
    expect(state.phase).toBe("held");
    expect(state.elapsed).toBe(TAKE_LENGTH);
    expect(recordingTransition(state, { type: "TICK" })).toBe(state);
    expect(recordingTransition(state, { type: "SAVE" }).phase).toBe("saved");
  });
  it("pauses without advancing and resumes the existing fractional timer", () => {
    let state = recordingTransition(newTake(), { type: "TICK", seconds: 1.25 });
    state = recordingTransition(state, { type: "PAUSE" });
    expect(recordingTransition(state, { type: "TICK", seconds: 2 })).toBe(state);
    state = recordingTransition(state, { type: "RESUME" });
    expect(recordingTransition(state, { type: "TICK", seconds: .5 }).elapsed).toBe(1.75);
  });
  it("replay resets both elapsed time and play state", () => {
    const state = recordingTransition(newTake(true), { type: "REPLAY" });
    expect(state).toEqual(newTake());
    expect(recordingTransition(recordingTransition(state, { type: "PAUSE" }), { type: "REPLAY" })).toEqual(newTake());
  });
  it("a fractional tick caps at six seconds and ignores nonfinite or negative deltas", () => {
    expect(recordingTransition(newTake(), { type: "TICK", seconds: 100 }).elapsed).toBe(6);
    expect(recordingTransition(newTake(), { type: "TICK", seconds: -1 }).elapsed).toBe(0);
    expect(recordingTransition(newTake(), { type: "TICK", seconds: NaN }).elapsed).toBe(0);
  });
  it("restores completed walkthrough progress even when Next was pressed at zero seconds", () => {
    const stored = [{ step: 0, duration: 0 }, { step: 1, duration: 6 }];
    expect(sanitizeTakes(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    expect(sanitizeTakes([{ step: 0, duration: -1 }, { step: 1, duration: 6 }, { step: 1, duration: 4 }, { step: 6, duration: 6 }, { step: 3, duration: Infinity }])).toEqual([{ step: 1, duration: 6 }]);
  });
  it("resumes a seller on the saved task and invalidates a dependent review on retake", () => {
    let state = initialState();
    state = transition(state, { type: "RECORDING_NEXT" });
    expect(state.captureStage).toBe(0);
    for (let step = 0; step < 6; step++) {
      state = transition(state, { type: "RECORDING_COMPLETE", step });
      state = transition(state, { type: "RECORDING_NEXT" });
    }
    state = transition(state, { type: "DECIDE", property: "Movement", status: "confirmed" });
    state = transition(state, { type: "DECIDE", property: "Surface", status: "confirmed" });
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getActiveDraft(state).captureComplete).toBe(true);
    state = transition(state, { type: "RECORDING_RETRY", step: 3 });
    const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(restored.captureStage).toBe(3);
    expect(restored.capturedSteps).not.toContain(3);
    expect(restored.decisions.Movement).toBeUndefined();
    expect(restored.decisions.Surface.status).toBe("confirmed");
  });
  it("a buyer finishes only after all six walkthrough steps, then resumes a retake privately", () => {
    let state = transition(initialState(), { type: "REFERENCE_CAPTURE_START" });
    state = transition(state, { type: "REFERENCE_CAPTURE_SAVE", name: "My familiar blouse" });
    expect(getActiveReferenceCapture(state)?.ready).toBe(false);
    for (let step = 0; step < 6; step++) {
      state = transition(state, { type: "REFERENCE_RECORDING_COMPLETE", step });
      state = transition(state, { type: "REFERENCE_RECORDING_NEXT" });
    }
    state = transition(state, { type: "REFERENCE_CAPTURE_SAVE", name: "My familiar blouse" });
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getActiveReferenceCapture(state)?.ready).toBe(true);
    expect(state.privateReferences.find((r) => r.id === state.selectedReference)?.listing.name).toBe("My familiar blouse");
    state = transition(state, { type: "REFERENCE_RECORDING_RETRY", step: 4 });
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getActiveReferenceCapture(state)?.stage).toBe(4);
    expect(getActiveReferenceCapture(state)?.ready).toBe(false);
    expect(getActiveReferenceCapture(state)?.capturedSteps).not.toContain(4);
  });
});
