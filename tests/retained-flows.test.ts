import { describe, expect, it } from "vitest";
import { CATALOG, PROPERTIES, initialState, transition, getListing, type Listing } from "../src/domain";
import { type BrowserStorage } from "../src/store";
import {
  RETAINED_STORAGE_KEY,
  emptyAftercareProperties,
  getPreparedReferenceStatus,
  initialRetainedState,
  isAftercareComplete,
  loadRetainedState,
  preparedReply,
  sanitizeRetainedState,
  transitionRetained,
  type AftercareRecord,
  type RetainedState,
} from "../src/components/RetainedFlows";

const listing = CATALOG[0];
const orderId = "FAM-0001";
const now = "2026-10-13T12:00:00.000Z";
const later = "2026-10-13T12:01:00.000Z";
const resolvedAt = "2026-10-13T12:02:00.000Z";

class MemoryStorage implements BrowserStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function ask(
  state = initialRetainedState(),
  question = "How does the hem drape?",
  at = now,
): RetainedState {
  state = transitionRetained(state, {
    type: "QUESTION_DRAFT",
    listingId: listing.id,
    draft: question,
  });
  return transitionRetained(state, { type: "QUESTION_SEND", listing, now: at });
}

function completeAftercare(state = initialRetainedState()): RetainedState {
  for (const property of PROPERTIES)
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property,
      value: {
        expected: `Recorded ${property.toLowerCase()} observation`,
        observed: "as-expected",
        note: "",
      },
    });
  return state;
}

function atStepThree(scenario: "complete" | "missing-movement"): RetainedState {
  let state = transitionRetained(initialRetainedState(), {
    type: "REFERENCE_START",
    scenario,
  });
  for (let step = 0; step < 3; step++)
    state = transitionRetained(state, { type: "REFERENCE_NEXT" });
  return state;
}

describe("listing conversations", () => {
  it("sends and reloads a newly published local listing conversation with its current recorded values", () => {
    let marketplace = transition(initialState(), { type: "LOCAL_DRAFT_CREATE", templateId: "moss-knit" });
    for (let step = 0; step < 6; step++) {
      marketplace = transition(marketplace, { type: "RECORDING_COMPLETE", step });
      marketplace = transition(marketplace, { type: "RECORDING_NEXT" });
    }
    for (const property of PROPERTIES)
      marketplace = transition(marketplace, { type: "DECIDE", property, status: "confirmed" });
    marketplace = transition(marketplace, { type: "DRAFT", draft: { name: "My newly listed cardigan", price: 48, size: "L" } });
    marketplace = transition(marketplace, { type: "PUBLISH" });
    const local = getListing(marketplace, "local-001")!;
    expect(local).toBeDefined();
    let state = transitionRetained(initialRetainedState(), { type: "QUESTION_DRAFT", listingId: local.id, draft: "What size is your cardigan?" });
    state = transitionRetained(state, { type: "QUESTION_SEND", listing: local, now });
    expect(state.conversations[local.id].messages).toHaveLength(1);
    expect(state.conversations[local.id].messages[0].reply).toContain("Seller lists size L");
    const message = state.conversations[local.id].messages[0];
    state = transitionRetained(state, { type: "QUESTION_REPORT", listingId: local.id, messageId: message.id, reason: "Other concern", note: "Please confirm the measurements.", now: later });
    state = transitionRetained(state, { type: "QUESTION_DRAFT", listingId: local.id, draft: "An unsent follow-up" });
    const storage = new MemoryStorage();
    storage.setItem(RETAINED_STORAGE_KEY, JSON.stringify(state));
    const reloaded = loadRetainedState(storage).state;
    expect(reloaded.conversations[local.id]).toEqual(state.conversations[local.id]);
    expect(reloaded.conversations[local.id].messages[0].report?.note).toBe("Please confirm the measurements.");
    expect(reloaded.conversations[listing.id]).toBeUndefined();
  });

  it("separates local listing drafts and rejects private, malformed and oversized IDs", () => {
    let state = transitionRetained(initialRetainedState(), { type: "QUESTION_DRAFT", listingId: "local-001", draft: "First question" });
    state = transitionRetained(state, { type: "QUESTION_DRAFT", listingId: "local-002", draft: "Second question" });
    expect(state.conversations["local-001"].draft).toBe("First question");
    expect(state.conversations["local-002"].draft).toBe("Second question");
    for (const id of ["private-001", "local-1", "local-1234567", "local-001/other", "constructor", "__proto__"])
      expect(transitionRetained(state, { type: "QUESTION_DRAFT", listingId: id, draft: "Rejected" })).toBe(state);
    expect(sanitizeRetainedState(JSON.parse(JSON.stringify(state))).conversations).toEqual(state.conversations);
  });

  it("bounds recovered local threads without dropping a catalogue conversation", () => {
    const conversations: Record<string, unknown> = {};
    for (let index = 1; index <= 105; index++)
      conversations[`local-${String(index).padStart(3, "0")}`] = { draft: `Question ${index}`, messages: [] };
    conversations[listing.id] = { draft: "Catalogue question", messages: [] };
    conversations["private-001"] = { draft: "Private", messages: [] };
    const recovered = sanitizeRetainedState({ ...initialRetainedState(), conversations });
    expect(Object.keys(recovered.conversations)).toHaveLength(101);
    expect(recovered.conversations[listing.id].draft).toBe("Catalogue question");
    expect(recovered.conversations["private-001"]).toBeUndefined();
    expect(transitionRetained(recovered, { type: "QUESTION_DRAFT", listingId: "local-999", draft: "Beyond limit" })).toBe(recovered);
  });

  it("attributes size to the seller without claiming the garment label was verified", () => {
    const reply = preparedReply(listing, "What is the label size?").reply;
    expect(reply).toContain(`Seller lists size ${listing.size}`);
    expect(reply).not.toMatch(/recorded label|verified label|label is size/i);
    expect(reply).toContain("do not promise fit");
  });

  it("keeps drafts separate by listing, trims a sent question and records its source-grounded reply", () => {
    let state = transitionRetained(initialRetainedState(), {
      type: "QUESTION_DRAFT",
      listingId: CATALOG[1].id,
      draft: "Other piece",
    });
    state = ask(state, "  How does the hem drape?  ");
    const conversation = state.conversations[listing.id];
    expect(conversation.draft).toBe("");
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]).toMatchObject({
      question: "How does the hem drape?",
      property: "Drape",
      createdAt: now,
    });
    expect(conversation.messages[0].reply).toContain(
      listing.evidence.find((item) => item.property === "Drape")!.observation,
    );
    expect(conversation.messages[0].reply).toContain(
      "Exact softness, odor, hygiene, authenticity and hidden damage remain unknown.",
    );
    expect(state.conversations[CATALOG[1].id]).toEqual({
      draft: "Other piece",
      messages: [],
    });
  });

  it("rejects blank sends, unknown listings, invalid times and oversized drafts without discarding work", () => {
    const state = transitionRetained(initialRetainedState(), {
      type: "QUESTION_DRAFT",
      listingId: listing.id,
      draft: "   ",
    });
    expect(
      transitionRetained(state, { type: "QUESTION_SEND", listing, now }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "QUESTION_DRAFT",
        listingId: "unknown",
        draft: "Question",
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "QUESTION_DRAFT",
        listingId: listing.id,
        draft: "x".repeat(501),
      }),
    ).toBe(state);
    const draft = transitionRetained(state, {
      type: "QUESTION_DRAFT",
      listingId: listing.id,
      draft: "Saved question",
    });
    expect(
      transitionRetained(draft, {
        type: "QUESTION_SEND",
        listing,
        now: "invalid",
      }),
    ).toBe(draft);
    expect(draft.conversations[listing.id].draft).toBe("Saved question");
  });

  it("answers measurements with recorded values and keeps fit uncertain", () => {
    const result = preparedReply(
      listing,
      "What size, chest and sleeve measurements are recorded?",
    );
    expect(result.property).toBeNull();
    expect(result.reply).toContain(`size ${listing.size}`);
    expect(result.reply).toContain(`chest: ${listing.measurements.chest} cm`);
    expect(result.reply).toContain(`sleeve: ${listing.measurements.sleeve} cm`);
    expect(result.reply).toContain("they do not promise fit");
    const unmeasured: Listing = { ...listing, measurements: {} };
    expect(
      preparedReply(unmeasured, "What length is recorded?").reply,
    ).toContain("No garment measurements are recorded");
  });

  it.each([
    ["What is the stretch recovery?", "Stretch"],
    ["Does it flow during movement?", "Movement"],
    ["How do the folds hang?", "Drape"],
    ["What does the surface look like?", "Surface"],
  ] as const)("routes %s to the recorded %s source", (question, property) => {
    const result = preparedReply(listing, question);
    expect(result.property).toBe(property);
    expect(result.reply).toContain(
      listing.evidence.find((item) => item.property === property)!.observation,
    );
  });

  it("preserves seller corrections, uncertainty and absent evidence instead of inventing material claims", () => {
    const revised: Listing = {
      ...listing,
      evidence: listing.evidence.map((item) =>
        item.property === "Surface"
          ? {
              ...item,
              sellerStatus: "unsure",
              support: "unavailable",
              correctionNote: "Only the cuff mark is visible.",
            }
          : item,
      ),
    };
    const reply = preparedReply(revised, "Is the surface soft?").reply;
    expect(reply).toContain(
      "Seller correction: Only the cuff mark is visible.",
    );
    expect(reply).toContain("The seller is unsure of this observation.");
    expect(reply).toContain(
      "This property remains unavailable for comparison.",
    );
    expect(
      preparedReply({ ...listing, evidence: [] }, "What is the surface?").reply,
    ).toBe(
      "No source observation is recorded for this question. Exact softness and hidden condition remain unknown.",
    );
  });

  it("validates reports, trims the saved note, preserves the reply and prevents replacement reports", () => {
    const state = ask();
    const message = state.conversations[listing.id].messages[0];
    const report = {
      type: "QUESTION_REPORT" as const,
      listingId: listing.id,
      messageId: message.id,
      reason: "Other concern",
      note: "  ",
      now: later,
    };
    expect(transitionRetained(state, report)).toBe(state);
    expect(
      transitionRetained(state, {
        ...report,
        reason: "Unrecognized reason",
        note: "Concern",
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        ...report,
        messageId: "missing",
        note: "Concern",
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, { ...report, note: "x".repeat(1001) }),
    ).toBe(state);
    expect(
      transitionRetained(state, { ...report, note: "Concern", now: "invalid" }),
    ).toBe(state);
    const reported = transitionRetained(state, {
      ...report,
      note: "  This needs a source clarification.  ",
    });
    const stored = reported.conversations[listing.id].messages[0];
    expect(stored).toEqual({
      ...message,
      report: {
        reason: "Other concern",
        note: "This needs a source clarification.",
        createdAt: later,
      },
    });
    expect(
      transitionRetained(reported, {
        ...report,
        reason: "Unsupported claim",
        note: "",
      }),
    ).toBe(reported);
    expect(
      sanitizeRetainedState(reported).conversations[listing.id].messages[0],
    ).toEqual(stored);
  });

  it("allows an optional note for a recognized report and retains the latest thirty questions", () => {
    let state = ask();
    const messageId = state.conversations[listing.id].messages[0].id;
    state = transitionRetained(state, {
      type: "QUESTION_REPORT",
      listingId: listing.id,
      messageId,
      reason: "Unsupported claim",
      note: "",
      now: later,
    });
    expect(state.conversations[listing.id].messages[0].report?.note).toBe("");
    for (let i = 1; i <= 30; i++)
      state = ask(
        state,
        `Question ${i}`,
        new Date(Date.parse(now) + i * 1000).toISOString(),
      );
    const messages = state.conversations[listing.id].messages;
    expect(messages).toHaveLength(30);
    expect(messages[0].question).toBe("Question 1");
    expect(messages.at(-1)?.question).toBe("Question 30");
    expect(new Set(messages.map((message) => message.id)).size).toBe(30);
  });

  it("keeps rapid questions distinct after the history reaches its thirty-message limit", () => {
    let state = initialRetainedState();
    for (let i = 0; i < 35; i++)
      state = sanitizeRetainedState(ask(state, `Rapid question ${i}`, now));
    const messages = state.conversations[listing.id].messages;
    expect(messages).toHaveLength(30);
    expect(messages[0].question).toBe("Rapid question 5");
    expect(messages.at(-1)?.question).toBe("Rapid question 34");
    expect(new Set(messages.map((message) => message.id)).size).toBe(30);
  });
});

describe("four-property aftercare", () => {
  it("requires an expectation and observation for every property before submitting", () => {
    let state = initialRetainedState();
    for (const property of PROPERTIES.slice(0, 3))
      state = transitionRetained(state, {
        type: "AFTERCARE_EDIT",
        orderId,
        property,
        value: {
          expected: "Expected detail",
          observed: "as-expected",
          note: "",
        },
      });
    expect(isAftercareComplete(state.aftercare[orderId])).toBe(false);
    expect(
      transitionRetained(state, { type: "AFTERCARE_SAVE", orderId, now }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Surface",
      value: { expected: "   ", observed: "as-expected", note: "" },
    });
    expect(
      transitionRetained(state, { type: "AFTERCARE_SAVE", orderId, now }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Surface",
      value: { expected: "Visible weave", observed: "", note: "" },
    });
    expect(isAftercareComplete(state.aftercare[orderId])).toBe(false);
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Surface",
      value: { expected: "Visible weave", observed: "not-observed", note: "" },
    });
    expect(isAftercareComplete(state.aftercare[orderId])).toBe(true);
    const submitted = transitionRetained(state, {
      type: "AFTERCARE_SAVE",
      orderId,
      now,
    });
    expect(submitted.aftercare[orderId]).toMatchObject({
      status: "submitted",
      updatedAt: now,
    });
    expect(submitted.aftercare[orderId].properties).toEqual(
      state.aftercare[orderId].properties,
    );
  });

  it("requires a nonblank note when observed behavior differs and retains all expectations", () => {
    let state = completeAftercare();
    const surface = state.aftercare[orderId].properties.Surface;
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Surface",
      value: { ...surface, observed: "different", note: "  " },
    });
    expect(isAftercareComplete(state.aftercare[orderId])).toBe(false);
    expect(
      transitionRetained(state, { type: "AFTERCARE_SAVE", orderId, now }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Surface",
      value: {
        ...surface,
        observed: "different",
        note: "The cuff mark was larger than expected.",
      },
    });
    const submitted = transitionRetained(state, {
      type: "AFTERCARE_SAVE",
      orderId,
      now,
    });
    expect(submitted.aftercare[orderId].status).toBe("submitted");
    expect(submitted.aftercare[orderId].properties.Surface.note).toBe(
      "The cuff mark was larger than expected.",
    );
    expect(
      PROPERTIES.every(
        (property) =>
          submitted.aftercare[orderId].properties[property].expected.length > 0,
      ),
    ).toBe(true);
    expect(
      transitionRetained(submitted, {
        type: "AFTERCARE_EDIT",
        orderId,
        property: "Drape",
        value: { expected: "Changed", observed: "different", note: "Changed" },
      }),
    ).toBe(submitted);
    expect(
      transitionRetained(submitted, {
        type: "AFTERCARE_SKIP",
        orderId,
        now: later,
      }),
    ).toBe(submitted);
  });

  it("skips and reopens without losing a partial reflection", () => {
    let state = transitionRetained(initialRetainedState(), {
      type: "AFTERCARE_EDIT",
      orderId,
      property: "Drape",
      value: {
        expected: "Structured hem",
        observed: "different",
        note: "One side sat lower.",
      },
    });
    const properties = state.aftercare[orderId].properties;
    state = transitionRetained(state, { type: "AFTERCARE_SKIP", orderId, now });
    expect(state.aftercare[orderId]).toEqual({
      status: "skipped",
      properties,
      updatedAt: now,
    });
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_SAVE",
        orderId,
        now: later,
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_EDIT",
        orderId,
        property: "Drape",
        value: { expected: "Replace", observed: "as-expected", note: "" },
      }),
    ).toBe(state);
    state = transitionRetained(state, { type: "AFTERCARE_REOPEN", orderId });
    expect(state.aftercare[orderId]).toEqual({
      status: "draft",
      properties,
      updatedAt: now,
    });
    expect(
      transitionRetained(state, { type: "AFTERCARE_REOPEN", orderId }),
    ).toBe(state);
  });

  it("rejects invalid order ids, oversized entries and invalid submission times", () => {
    const state = completeAftercare();
    const value = {
      expected: "Expected",
      observed: "as-expected" as const,
      note: "",
    };
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_EDIT",
        orderId: "unknown",
        property: "Drape",
        value,
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_EDIT",
        orderId,
        property: "Drape",
        value: { ...value, expected: "x".repeat(3001) },
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_EDIT",
        orderId,
        property: "Drape",
        value: { ...value, note: "x".repeat(1001) },
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_SAVE",
        orderId,
        now: "invalid",
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_SKIP",
        orderId: "unknown",
        now,
      }),
    ).toBe(state);
    expect(
      transitionRetained(state, {
        type: "AFTERCARE_SKIP",
        orderId,
        now: "invalid",
      }),
    ).toBe(state);
  });
});

describe("reference readiness", () => {
  it("cannot finish before all four checks and cannot advance beyond the final check", () => {
    let state = transitionRetained(initialRetainedState(), {
      type: "REFERENCE_START",
      scenario: "complete",
    });
    expect(getPreparedReferenceStatus(state)).toBe("processing");
    expect(transitionRetained(state, { type: "REFERENCE_BACK" })).toBe(state);
    for (let step = 0; step < 3; step++) {
      expect(state.referencePreparation.step).toBe(step);
      expect(transitionRetained(state, { type: "REFERENCE_FINISH" })).toBe(
        state,
      );
      state = transitionRetained(state, { type: "REFERENCE_NEXT" });
    }
    expect(transitionRetained(state, { type: "REFERENCE_NEXT" })).toBe(state);
    state = transitionRetained(state, { type: "REFERENCE_BACK" });
    expect(state.referencePreparation.step).toBe(2);
    expect(transitionRetained(state, { type: "REFERENCE_FINISH" })).toBe(state);
    state = transitionRetained(state, { type: "REFERENCE_NEXT" });
    state = transitionRetained(state, { type: "REFERENCE_FINISH" });
    expect(state.referencePreparation).toEqual({
      status: "ready",
      scenario: "complete",
      step: 3,
    });
    expect(transitionRetained(state, { type: "REFERENCE_BACK" })).toBe(state);
  });

  it("keeps missing movement incomplete until a complete walkthrough or original-reference restore", () => {
    const incomplete = transitionRetained(atStepThree("missing-movement"), {
      type: "REFERENCE_FINISH",
    });
    expect(getPreparedReferenceStatus(incomplete)).toBe("incomplete");
    expect(incomplete.referencePreparation).toEqual({
      status: "incomplete",
      scenario: "missing-movement",
      step: 3,
    });
    expect(transitionRetained(incomplete, { type: "REFERENCE_NEXT" })).toBe(
      incomplete,
    );
    const restarted = transitionRetained(incomplete, {
      type: "REFERENCE_START",
      scenario: "complete",
    });
    expect(restarted.referencePreparation).toEqual({
      status: "processing",
      scenario: "complete",
      step: 0,
    });
    expect(transitionRetained(restarted, { type: "REFERENCE_FINISH" })).toBe(
      restarted,
    );
    const restored = transitionRetained(incomplete, {
      type: "REFERENCE_READY",
    });
    expect(restored.referencePreparation).toEqual(
      initialRetainedState().referencePreparation,
    );
  });

  it("preserves the last missing-movement processing check on reload so Finish can record the incomplete result", () => {
    const processing = atStepThree("missing-movement");
    const recovered = sanitizeRetainedState(processing);
    expect(recovered.referencePreparation).toEqual({
      status: "processing",
      scenario: "missing-movement",
      step: 3,
    });
    expect(
      transitionRetained(recovered, { type: "REFERENCE_FINISH" })
        .referencePreparation.status,
    ).toBe("incomplete");
    const action = {
      type: "REFERENCE_START",
      scenario: "invalid",
    } as unknown as Parameters<typeof transitionRetained>[1];
    expect(transitionRetained(processing, action)).toBe(processing);
  });

  it.each([
    [
      { status: "ready", scenario: "complete", step: 1 },
      { status: "processing", scenario: "complete", step: 1 },
    ],
    [
      { status: "ready", scenario: "missing-movement", step: 3 },
      { status: "incomplete", scenario: "missing-movement", step: 3 },
    ],
    [
      { status: "ready", scenario: "complete", step: 99 },
      { status: "processing", scenario: "complete", step: 0 },
    ],
    [
      { status: "ready", scenario: "complete", step: 1.5 },
      { status: "processing", scenario: "complete", step: 0 },
    ],
  ])(
    "recovers an invalid ready reference to a reviewable state",
    (referencePreparation, expected) => {
      expect(
        sanitizeRetainedState({
          ...initialRetainedState(),
          referencePreparation,
        }).referencePreparation,
      ).toEqual(expected);
    },
  );
});

describe("moderation hold and appeal", () => {
  it("requires a ten-character appeal before review and preserves the original finding through resolution", () => {
    let state = transitionRetained(initialRetainedState(), {
      type: "MODERATION_HOLD",
      now,
    });
    const finding = state.moderation.originalFinding;
    const reason = state.moderation.reason;
    expect(state.moderation.status).toBe("held");
    expect(finding).toContain("“silky soft against skin”");
    expect(
      transitionRetained(state, { type: "MODERATION_HOLD", now: later }),
    ).toBe(state);
    expect(
      transitionRetained(state, { type: "MODERATION_RESOLVE", now: later }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "MODERATION_DRAFT",
      text: "  too short  ",
    });
    expect(
      transitionRetained(state, { type: "MODERATION_APPEAL", now: later }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "MODERATION_DRAFT",
      text: "  Removed the unsupported tactile claim.  ",
    });
    expect(
      transitionRetained(state, { type: "MODERATION_APPEAL", now: "invalid" }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "MODERATION_APPEAL",
      now: later,
    });
    expect(state.moderation.status).toBe("reviewing");
    expect(state.moderation.history).toEqual([
      { kind: "held", text: reason, createdAt: now },
      {
        kind: "appeal-submitted",
        text: "Removed the unsupported tactile claim.",
        createdAt: later,
      },
    ]);
    expect(
      transitionRetained(state, {
        type: "MODERATION_DRAFT",
        text: "Changed explanation",
      }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "MODERATION_RESOLVE",
      now: resolvedAt,
    });
    expect(state.moderation.status).toBe("clear");
    expect(state.moderation.originalFinding).toBe(finding);
    expect(state.moderation.reason).toBe(reason);
    expect(state.moderation.history.map((event) => event.kind)).toEqual([
      "held",
      "appeal-submitted",
      "cleared",
    ]);
    expect(state.moderation.history[2].text).toContain(
      "unsupported tactile claim has been removed",
    );
    expect(sanitizeRetainedState(state).moderation).toEqual(state.moderation);
  });

  it("accepts exactly ten trimmed characters and rejects appeals outside a hold", () => {
    const clear = initialRetainedState();
    expect(
      transitionRetained(clear, {
        type: "MODERATION_DRAFT",
        text: "Correction explanation",
      }),
    ).toBe(clear);
    expect(transitionRetained(clear, { type: "MODERATION_APPEAL", now })).toBe(
      clear,
    );
    expect(
      transitionRetained(clear, { type: "MODERATION_HOLD", now: "invalid" }),
    ).toBe(clear);
    let state = transitionRetained(clear, { type: "MODERATION_HOLD", now });
    expect(
      transitionRetained(state, {
        type: "MODERATION_DRAFT",
        text: "x".repeat(1001),
      }),
    ).toBe(state);
    state = transitionRetained(state, {
      type: "MODERATION_DRAFT",
      text: "  1234567890  ",
    });
    expect(
      transitionRetained(state, { type: "MODERATION_APPEAL", now: later })
        .moderation.status,
    ).toBe("reviewing");
  });

  it("recovers an open hold from history and refuses reviewing data without an accepted appeal", () => {
    const held = transitionRetained(initialRetainedState(), {
      type: "MODERATION_HOLD",
      now,
    });
    const staleClear = sanitizeRetainedState({
      ...held,
      moderation: {
        ...held.moderation,
        status: "clear",
        reason: "",
        originalFinding: "",
      },
    });
    expect(staleClear.moderation.status).toBe("held");
    expect(staleClear.moderation.reason.length).toBeGreaterThan(0);
    expect(staleClear.moderation.originalFinding.length).toBeGreaterThan(0);
    const noAppeal = sanitizeRetainedState({
      ...held,
      moderation: { ...held.moderation, status: "reviewing" },
    });
    expect(noAppeal.moderation.status).toBe("held");
    expect(
      transitionRetained(noAppeal, { type: "MODERATION_RESOLVE", now: later }),
    ).toBe(noAppeal);
  });

  it.each(["", "short", "  123456789  "])(
    "does not restore reviewing from an invalid persisted appeal %j",
    (appeal) => {
      const held = transitionRetained(initialRetainedState(), {
        type: "MODERATION_HOLD",
        now,
      });
      const recovered = sanitizeRetainedState({
        ...held,
        moderation: {
          ...held.moderation,
          status: "reviewing",
          history: [
            ...held.moderation.history,
            { kind: "appeal-submitted", text: appeal, createdAt: later },
          ],
        },
      });
      expect(recovered.moderation.status).toBe("held");
      expect(
        transitionRetained(recovered, {
          type: "MODERATION_RESOLVE",
          now: resolvedAt,
        }),
      ).toBe(recovered);
    },
  );

  it("retains the latest thirty moderation decisions and carries the original finding into a later hold", () => {
    let state = initialRetainedState();
    for (let cycle = 0; cycle < 12; cycle++) {
      state = transitionRetained(state, { type: "MODERATION_HOLD", now });
      state = transitionRetained(state, {
        type: "MODERATION_DRAFT",
        text: `Removed unsupported claim ${cycle}.`,
      });
      state = transitionRetained(state, {
        type: "MODERATION_APPEAL",
        now: later,
      });
      state = transitionRetained(state, {
        type: "MODERATION_RESOLVE",
        now: resolvedAt,
      });
    }
    expect(state.moderation.history).toHaveLength(30);
    expect(state.moderation.history[1].text).toBe(
      "Removed unsupported claim 2.",
    );
    const finding = state.moderation.originalFinding;
    state = transitionRetained(state, { type: "MODERATION_HOLD", now });
    expect(state.moderation.status).toBe("held");
    expect(state.moderation.history).toHaveLength(30);
    expect(state.moderation.originalFinding).toBe(finding);
    expect(state.moderation.history.at(-1)?.kind).toBe("held");
    expect(sanitizeRetainedState(state).moderation).toEqual(state.moderation);
  });
});

describe("retained state recovery and persistence", () => {
  it("creates separate empty property entries and returns defaults for unsupported state versions", () => {
    const properties = emptyAftercareProperties();
    properties.Drape.expected = "Drape only";
    expect(properties.Surface.expected).toBe("");
    for (const value of [null, [], {}, { version: 2 }, { version: "1" }])
      expect(sanitizeRetainedState(value)).toEqual(initialRetainedState());
  });

  it("keeps only known conversations and valid unique messages, and validates nested reports", () => {
    const message = ask().conversations[listing.id].messages[0];
    const recovered = sanitizeRetainedState({
      version: 1,
      conversations: {
        unknown: { draft: "Unknown", messages: [message] },
        [listing.id]: {
          draft: "x".repeat(600),
          messages: [
            null,
            { ...message, id: "empty", question: "  " },
            { ...message, id: "bad-time", createdAt: "invalid" },
            {
              ...message,
              question: "  Trim me  ",
              property: "Unknown",
              report: { reason: "Other concern", note: "  ", createdAt: later },
            },
            { ...message, question: "Duplicate id" },
            {
              ...message,
              id: "reported",
              report: {
                reason: "Unsupported claim",
                note: "  Source missing  ",
                createdAt: later,
              },
            },
            {
              ...message,
              id: "bad-report",
              report: { reason: "Unknown", note: "Concern", createdAt: later },
            },
          ],
        },
      },
    });
    expect(Object.keys(recovered.conversations)).toEqual([listing.id]);
    expect(recovered.conversations[listing.id].draft).toHaveLength(500);
    expect(
      recovered.conversations[listing.id].messages.map((item) => item.id),
    ).toEqual([message.id, "reported", "bad-report"]);
    expect(recovered.conversations[listing.id].messages[0]).toMatchObject({
      question: "Trim me",
      property: null,
    });
    expect(
      recovered.conversations[listing.id].messages[0].report,
    ).toBeUndefined();
    expect(recovered.conversations[listing.id].messages[1].report).toEqual({
      reason: "Unsupported claim",
      note: "Source missing",
      createdAt: later,
    });
    expect(
      recovered.conversations[listing.id].messages[2].report,
    ).toBeUndefined();
  });

  it("returns malformed submitted feedback to draft while preserving valid submitted and skipped reflections", () => {
    const complete: AftercareRecord = {
      ...completeAftercare().aftercare[orderId],
      status: "submitted",
      updatedAt: now,
    };
    const malformed = {
      ...complete,
      properties: {
        ...complete.properties,
        Surface: {
          expected: "Visible weave",
          observed: "different",
          note: "   ",
        },
      },
    };
    const recovered = sanitizeRetainedState({
      version: 1,
      aftercare: {
        [orderId]: malformed,
        "FAM-0002": complete,
        "FAM-0003": {
          status: "skipped",
          properties: {
            Drape: {
              expected: "x".repeat(4000),
              observed: "invalid",
              note: "x".repeat(1100),
            },
          },
          updatedAt: "invalid",
        },
        invalid: complete,
      },
    });
    expect(recovered.aftercare[orderId].status).toBe("draft");
    expect(recovered.aftercare["FAM-0002"]).toEqual(complete);
    expect(recovered.aftercare["FAM-0003"].status).toBe("skipped");
    expect(recovered.aftercare["FAM-0003"].properties.Drape).toMatchObject({
      observed: "",
    });
    expect(
      recovered.aftercare["FAM-0003"].properties.Drape.expected,
    ).toHaveLength(3000);
    expect(recovered.aftercare["FAM-0003"].properties.Drape.note).toHaveLength(
      1000,
    );
    expect(recovered.aftercare["FAM-0003"].properties.Surface).toEqual({
      expected: "",
      observed: "",
      note: "",
    });
    expect(recovered.aftercare["FAM-0003"].updatedAt).toBeUndefined();
    expect(recovered.aftercare.invalid).toBeUndefined();
  });

  it("retains histories and drafts when sign-out advances only the session epoch", () => {
    let state = ask();
    state = transitionRetained(state, {
      type: "QUESTION_REPORT",
      listingId: listing.id,
      messageId: state.conversations[listing.id].messages[0].id,
      reason: "Other concern",
      note: "Please clarify the source.",
      now: later,
    });
    state = transitionRetained(state, {
      type: "QUESTION_DRAFT",
      listingId: listing.id,
      draft: "Unsent follow-up",
    });
    state = completeAftercare(state);
    state = transitionRetained(state, { type: "AFTERCARE_SAVE", orderId, now });
    state = transitionRetained(state, {
      type: "REFERENCE_START",
      scenario: "missing-movement",
    });
    state = transitionRetained(state, { type: "REFERENCE_NEXT" });
    state = transitionRetained(state, { type: "MODERATION_HOLD", now });
    state = transitionRetained(state, {
      type: "MODERATION_DRAFT",
      text: "Correction in progress",
    });
    const signedOut = transitionRetained(state, { type: "SIGN_OUT" });
    expect(signedOut).toEqual({
      ...state,
      sessionEpoch: state.sessionEpoch + 1,
    });
    expect(signedOut.conversations).toBe(state.conversations);
    expect(signedOut.aftercare).toBe(state.aftercare);
    expect(signedOut.referencePreparation).toBe(state.referencePreparation);
    expect(signedOut.moderation).toBe(state.moderation);
    expect(sanitizeRetainedState(signedOut)).toEqual(signedOut);
    expect(
      sanitizeRetainedState({ ...signedOut, sessionEpoch: -1 }).sessionEpoch,
    ).toBe(0);
    expect(
      sanitizeRetainedState({ ...signedOut, sessionEpoch: 1.5 }).sessionEpoch,
    ).toBe(0);
  });

  it("reloads saved reports and feedback while leaving persisted data intact after the storage probe", () => {
    let state = ask();
    state = transitionRetained(state, {
      type: "QUESTION_REPORT",
      listingId: listing.id,
      messageId: state.conversations[listing.id].messages[0].id,
      reason: "Unsupported claim",
      note: "",
      now: later,
    });
    state = completeAftercare(state);
    state = transitionRetained(state, { type: "AFTERCARE_SAVE", orderId, now });
    const storage = new MemoryStorage();
    const serialized = JSON.stringify(state);
    storage.setItem(RETAINED_STORAGE_KEY, serialized);
    expect(loadRetainedState(storage)).toEqual({
      state,
      storageAvailable: true,
    });
    expect(storage.getItem(RETAINED_STORAGE_KEY)).toBe(serialized);
    expect([...storage.values.keys()]).toEqual([RETAINED_STORAGE_KEY]);
  });

  it("recovers corrupt JSON and unavailable storage without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(RETAINED_STORAGE_KEY, "{broken");
    expect(loadRetainedState(storage)).toEqual({
      state: initialRetainedState(),
      storageAvailable: true,
    });
    expect(loadRetainedState(null)).toEqual({
      state: initialRetainedState(),
      storageAvailable: false,
    });
    const denied: BrowserStorage = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(loadRetainedState(denied)).toEqual({
      state: initialRetainedState(),
      storageAvailable: false,
    });
  });

  it("restores readable work when writes or probe removal fail", () => {
    const state = ask();
    const readOnly: BrowserStorage = {
      getItem() {
        return JSON.stringify(state);
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };
    expect(loadRetainedState(readOnly)).toEqual({
      state,
      storageAvailable: false,
    });
    const noRemoval: BrowserStorage = {
      getItem() {
        return JSON.stringify(state);
      },
      setItem() {},
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(loadRetainedState(noRemoval)).toEqual({
      state,
      storageAvailable: false,
    });
  });
});
