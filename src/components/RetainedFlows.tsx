import {
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  FlagIcon,
  LockSimpleIcon,
  SignOutIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  CATALOG,
  PROPERTIES,
  REFERENCE,
  type Listing,
  type Property,
} from "../domain";
import { useStore, type BrowserStorage } from "../store";
import { Link, navigate } from "../router";

export const RETAINED_STORAGE_KEY = "refeel-retained-v1";
export type PreparedReferenceStatus = "ready" | "processing" | "incomplete";
export type ObservationChoice =
  | ""
  | "as-expected"
  | "different"
  | "not-observed";
export interface ConversationMessage {
  id: string;
  question: string;
  reply: string;
  property: Property | null;
  createdAt: string;
  report?: { reason: string; note: string; createdAt: string };
}
export interface ListingConversationState {
  draft: string;
  messages: ConversationMessage[];
}
export interface AftercareProperty {
  expected: string;
  observed: ObservationChoice;
  note: string;
}
export interface AftercareRecord {
  status: "draft" | "submitted" | "skipped";
  properties: Record<Property, AftercareProperty>;
  updatedAt?: string;
}
export interface ModerationEvent {
  kind: "held" | "appeal-submitted" | "cleared";
  text: string;
  createdAt: string;
}
export interface RetainedState {
  version: 1;
  conversations: Record<string, ListingConversationState>;
  aftercare: Record<string, AftercareRecord>;
  referencePreparation: {
    status: PreparedReferenceStatus;
    scenario: "complete" | "missing-movement";
    step: number;
  };
  moderation: {
    status: "clear" | "held" | "reviewing";
    reason: string;
    originalFinding: string;
    appealDraft: string;
    history: ModerationEvent[];
  };
  sessionEpoch: number;
}
export type RetainedAction =
  | { type: "QUESTION_DRAFT"; listingId: string; draft: string }
  | { type: "QUESTION_SEND"; listing: Listing; now: string }
  | {
      type: "QUESTION_REPORT";
      listingId: string;
      messageId: string;
      reason: string;
      note: string;
      now: string;
    }
  | {
      type: "AFTERCARE_EDIT";
      orderId: string;
      property: Property;
      value: AftercareProperty;
    }
  | { type: "AFTERCARE_SAVE"; orderId: string; now: string }
  | { type: "AFTERCARE_SKIP"; orderId: string; now: string }
  | { type: "AFTERCARE_REOPEN"; orderId: string }
  | { type: "REFERENCE_START"; scenario: "complete" | "missing-movement" }
  | { type: "REFERENCE_NEXT" }
  | { type: "REFERENCE_BACK" }
  | { type: "REFERENCE_FINISH" }
  | { type: "REFERENCE_READY" }
  | { type: "MODERATION_HOLD"; now: string }
  | { type: "MODERATION_DRAFT"; text: string }
  | { type: "MODERATION_APPEAL"; now: string }
  | { type: "MODERATION_RESOLVE"; now: string }
  | { type: "SIGN_OUT" };

const listingIds = new Set(CATALOG.map((item) => item.id));
const MAX_LOCAL_CONVERSATIONS = 100;
const isLocalListingId = (id: unknown): id is string =>
  typeof id === "string" && /^local-\d{3,6}$/.test(id);
const validConversationId = (id: unknown): id is string =>
  typeof id === "string" && (listingIds.has(id) || isLocalListingId(id));
const observationChoices: ObservationChoice[] = [
  "",
  "as-expected",
  "different",
  "not-observed",
];
const reportReasons = [
  "Unsupported claim",
  "Inappropriate reply",
  "Other concern",
];
const holdReason =
  "The prepared listing uses a tactile claim that the supplied surface frame cannot establish.";
const originalFinding =
  "Original moderation finding: “silky soft against skin” was not supported by the source. This finding is separate from visible wear and evidence coverage.";
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const textValue = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";
const validTime = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));
const validOrderId = (value: string) => /^FAM-[A-Za-z0-9-]{1,90}$/.test(value);
const timestamp = () => new Date().toISOString();

export function emptyAftercareProperties(): Record<
  Property,
  AftercareProperty
> {
  return Object.fromEntries(
    PROPERTIES.map((property) => [
      property,
      { expected: "", observed: "", note: "" },
    ]),
  ) as Record<Property, AftercareProperty>;
}
export function initialRetainedState(): RetainedState {
  return {
    version: 1,
    conversations: {},
    aftercare: {},
    referencePreparation: { status: "ready", scenario: "complete", step: 3 },
    moderation: {
      status: "clear",
      reason: "",
      originalFinding: "",
      appealDraft: "",
      history: [],
    },
    sessionEpoch: 0,
  };
}
export function isAftercareComplete(record: AftercareRecord): boolean {
  return PROPERTIES.every((property) => {
    const entry = record.properties[property];
    return (
      !!entry.expected.trim() &&
      entry.observed !== "" &&
      (entry.observed !== "different" || !!entry.note.trim())
    );
  });
}

/** Recover known bounded values only; malformed completed states return to a reviewable draft. */
export function sanitizeRetainedState(value: unknown): RetainedState {
  const raw = object(value),
    base = initialRetainedState();
  if (!raw || raw.version !== 1) return base;
  const conversations = object(raw.conversations);
  // Keep catalogue threads and a bounded history of locally published pieces.
  // Private wardrobe IDs are intentionally excluded from seller conversations.
  const conversationIds = [
    ...listingIds,
    ...Object.keys(conversations ?? {})
      .filter(isLocalListingId)
      .slice(0, MAX_LOCAL_CONVERSATIONS),
  ];
  for (const id of conversationIds) {
    const conversation = object(conversations?.[id]);
    if (!conversation) continue;
    const messages: ConversationMessage[] = [];
    if (Array.isArray(conversation.messages))
      for (const item of conversation.messages.slice(-30)) {
        const message = object(item);
        if (!message) continue;
        const messageId = textValue(message.id, 100),
          question = textValue(message.question, 500).trim(),
          reply = textValue(message.reply, 3000).trim();
        if (
          !messageId ||
          !question ||
          !reply ||
          !validTime(message.createdAt) ||
          messages.some((m) => m.id === messageId)
        )
          continue;
        const entry: ConversationMessage = {
          id: messageId,
          question,
          reply,
          property: PROPERTIES.includes(message.property as Property)
            ? (message.property as Property)
            : null,
          createdAt: message.createdAt,
        };
        const report = object(message.report);
        if (
          report &&
          reportReasons.includes(report.reason as string) &&
          validTime(report.createdAt) &&
          typeof report.note === "string" &&
          report.note.length <= 1000 &&
          (report.reason !== "Other concern" || report.note.trim())
        )
          entry.report = {
            reason: report.reason as string,
            note: report.note.trim(),
            createdAt: report.createdAt,
          };
        messages.push(entry);
      }
    base.conversations[id] = {
      draft: textValue(conversation.draft, 500),
      messages,
    };
  }
  const aftercare = object(raw.aftercare);
  if (aftercare)
    for (const [id, item] of Object.entries(aftercare).slice(0, 500)) {
      const record = object(item);
      if (!validOrderId(id) || !record) continue;
      const properties = emptyAftercareProperties(),
        storedProperties = object(record.properties);
      for (const property of PROPERTIES) {
        const stored = object(storedProperties?.[property]);
        if (!stored) continue;
        properties[property] = {
          expected: textValue(stored.expected, 3000),
          observed: observationChoices.includes(
            stored.observed as ObservationChoice,
          )
            ? (stored.observed as ObservationChoice)
            : "",
          note: textValue(stored.note, 1000),
        };
      }
      const recovered: AftercareRecord = {
        status: record.status === "skipped" ? "skipped" : "draft",
        properties,
      };
      if (validTime(record.updatedAt)) recovered.updatedAt = record.updatedAt;
      if (record.status === "submitted" && isAftercareComplete(recovered))
        recovered.status = "submitted";
      base.aftercare[id] = recovered;
    }
  const preparation = object(raw.referencePreparation);
  if (preparation) {
    const scenario =
      preparation.scenario === "missing-movement"
        ? "missing-movement"
        : "complete";
    const step =
      typeof preparation.step === "number" &&
      Number.isInteger(preparation.step) &&
      preparation.step >= 0 &&
      preparation.step <= 3
        ? preparation.step
        : 0;
    const status: PreparedReferenceStatus =
      preparation.status === "ready" && scenario === "complete" && step === 3
        ? "ready"
        : preparation.status === "incomplete" ||
            (preparation.status === "ready" && scenario === "missing-movement")
          ? "incomplete"
          : "processing";
    base.referencePreparation = { status, scenario, step };
  }
  const moderation = object(raw.moderation);
  if (moderation) {
    const history: ModerationEvent[] = [];
    if (Array.isArray(moderation.history))
      for (const item of moderation.history.slice(-30)) {
        const event = object(item);
        if (
          event &&
          ["held", "appeal-submitted", "cleared"].includes(
            event.kind as string,
          ) &&
          validTime(event.createdAt)
        ) {
          const text = textValue(event.text, 2000).trim();
          if (!text || (event.kind === "appeal-submitted" && text.length < 10))
            continue;
          history.push({
            kind: event.kind as ModerationEvent["kind"],
            text,
            createdAt: event.createdAt,
          });
        }
      }
    const last = history.at(-1);
    const status =
      moderation.status === "held" || moderation.status === "reviewing"
        ? moderation.status
        : last && last.kind !== "cleared"
          ? last.kind === "appeal-submitted"
            ? "reviewing"
            : "held"
          : "clear";
    base.moderation = {
      status,
      reason:
        status === "clear"
          ? textValue(moderation.reason, 2000)
          : textValue(moderation.reason, 2000) || holdReason,
      originalFinding:
        textValue(moderation.originalFinding, 2000) ||
        (history.length || status !== "clear" ? originalFinding : ""),
      appealDraft: textValue(moderation.appealDraft, 1000),
      history,
    };
    // A reviewing record without an accepted appeal must remain held.
    if (status === "reviewing" && last?.kind !== "appeal-submitted")
      base.moderation.status = "held";
  }
  if (
    typeof raw.sessionEpoch === "number" &&
    Number.isSafeInteger(raw.sessionEpoch) &&
    raw.sessionEpoch >= 0
  )
    base.sessionEpoch = raw.sessionEpoch;
  return base;
}

export function preparedReply(
  listing: Listing,
  question: string,
): { reply: string; property: Property | null } {
  const normalized = question.toLowerCase();
  if (/\b(size|measurement|chest|length|sleeve|fit)\b/.test(normalized)) {
    const measurements = Object.entries(listing.measurements)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value} cm`)
      .join(", ");
    return {
      reply: `Seller lists size ${listing.size}. ${measurements ? `Recorded flat measurements: ${measurements}.` : "No garment measurements are recorded."} Use these measurements alongside a piece you know; they do not promise fit.`,
      property: null,
    };
  }
  const property: Property = /\b(stretch|elastic|recover|recovery)\b/.test(
    normalized,
  )
    ? "Stretch"
    : /\b(move|movement|swing|flow|fluid)\b/.test(normalized)
      ? "Movement"
      : /\b(drape|fold|hang|shape|hem)\b/.test(normalized)
        ? "Drape"
        : "Surface";
  const evidence = listing.evidence.find((item) => item.property === property);
  return {
    reply: evidence
      ? `${evidence.observation}${evidence.correctionNote ? ` Seller correction: ${evidence.correctionNote}` : ""} ${evidence.sellerStatus === "unsure" ? "The seller is unsure of this observation. " : ""}${evidence.support === "unavailable" ? "This property remains unavailable for comparison. " : ""}Exact softness, odor, hygiene, authenticity and hidden damage remain unknown.`
      : "No source observation is recorded for this question. Exact softness and hidden condition remain unknown.",
    property,
  };
}

export function transitionRetained(
  state: RetainedState,
  action: RetainedAction,
): RetainedState {
  switch (action.type) {
    case "QUESTION_DRAFT": {
      if (
        !validConversationId(action.listingId) ||
        typeof action.draft !== "string" ||
        action.draft.length > 500 ||
        (isLocalListingId(action.listingId) &&
          !state.conversations[action.listingId] &&
          Object.keys(state.conversations).filter(isLocalListingId).length >= MAX_LOCAL_CONVERSATIONS)
      )
        return state;
      const conversation = state.conversations[action.listingId] ?? {
        draft: "",
        messages: [],
      };
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.listingId]: { ...conversation, draft: action.draft },
        },
      };
    }
    case "QUESTION_SEND": {
      if (!validConversationId(action.listing.id) || !validTime(action.now))
        return state;
      const conversation = state.conversations[action.listing.id];
      const question = conversation?.draft.trim();
      if (!question) return state;
      const reply = preparedReply(action.listing, question);
      let sequence = conversation.messages.length;
      while (
        conversation.messages.some(
          (message) => message.id === `question-${action.now}-${sequence}`,
        )
      )
        sequence++;
      const id = `question-${action.now}-${sequence}`;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.listing.id]: {
            draft: "",
            messages: [
              ...conversation.messages,
              { id, question, ...reply, createdAt: action.now },
            ].slice(-30),
          },
        },
      };
    }
    case "QUESTION_REPORT": {
      const conversation = state.conversations[action.listingId],
        note = action.note.trim();
      if (
        !validConversationId(action.listingId) ||
        !conversation ||
        !reportReasons.includes(action.reason) ||
        note.length > 1000 ||
        (action.reason === "Other concern" && !note) ||
        !validTime(action.now)
      )
        return state;
      const message = conversation.messages.find(
        (item) => item.id === action.messageId,
      );
      if (!message || message.report) return state;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.listingId]: {
            ...conversation,
            messages: conversation.messages.map((item) =>
              item.id === action.messageId
                ? {
                    ...item,
                    report: {
                      reason: action.reason,
                      note,
                      createdAt: action.now,
                    },
                  }
                : item,
            ),
          },
        },
      };
    }
    case "AFTERCARE_EDIT": {
      if (
        !validOrderId(action.orderId) ||
        !PROPERTIES.includes(action.property) ||
        !observationChoices.includes(action.value.observed) ||
        action.value.expected.length > 3000 ||
        action.value.note.length > 1000
      )
        return state;
      const record = state.aftercare[action.orderId] ?? {
        status: "draft" as const,
        properties: emptyAftercareProperties(),
      };
      if (record.status !== "draft") return state;
      return {
        ...state,
        aftercare: {
          ...state.aftercare,
          [action.orderId]: {
            ...record,
            properties: {
              ...record.properties,
              [action.property]: action.value,
            },
          },
        },
      };
    }
    case "AFTERCARE_SAVE": {
      const record = state.aftercare[action.orderId];
      if (
        !record ||
        record.status !== "draft" ||
        !isAftercareComplete(record) ||
        !validTime(action.now)
      )
        return state;
      return {
        ...state,
        aftercare: {
          ...state.aftercare,
          [action.orderId]: {
            ...record,
            status: "submitted",
            updatedAt: action.now,
          },
        },
      };
    }
    case "AFTERCARE_SKIP": {
      if (!validOrderId(action.orderId) || !validTime(action.now)) return state;
      const record = state.aftercare[action.orderId] ?? {
        status: "draft" as const,
        properties: emptyAftercareProperties(),
      };
      if (record.status === "submitted") return state;
      return {
        ...state,
        aftercare: {
          ...state.aftercare,
          [action.orderId]: {
            ...record,
            status: "skipped",
            updatedAt: action.now,
          },
        },
      };
    }
    case "AFTERCARE_REOPEN": {
      const record = state.aftercare[action.orderId];
      if (!record || record.status !== "skipped") return state;
      return {
        ...state,
        aftercare: {
          ...state.aftercare,
          [action.orderId]: { ...record, status: "draft" },
        },
      };
    }
    case "REFERENCE_START":
      return ["complete", "missing-movement"].includes(action.scenario)
        ? {
            ...state,
            referencePreparation: {
              status: "processing",
              scenario: action.scenario,
              step: 0,
            },
          }
        : state;
    case "REFERENCE_NEXT":
      return state.referencePreparation.status === "processing" &&
        state.referencePreparation.step < 3
        ? {
            ...state,
            referencePreparation: {
              ...state.referencePreparation,
              step: state.referencePreparation.step + 1,
            },
          }
        : state;
    case "REFERENCE_BACK":
      return state.referencePreparation.status === "processing" &&
        state.referencePreparation.step > 0
        ? {
            ...state,
            referencePreparation: {
              ...state.referencePreparation,
              step: state.referencePreparation.step - 1,
            },
          }
        : state;
    case "REFERENCE_FINISH":
      return state.referencePreparation.status === "processing" &&
        state.referencePreparation.step === 3
        ? {
            ...state,
            referencePreparation: {
              ...state.referencePreparation,
              status:
                state.referencePreparation.scenario === "complete"
                  ? "ready"
                  : "incomplete",
            },
          }
        : state;
    case "REFERENCE_READY":
      return {
        ...state,
        referencePreparation: {
          status: "ready",
          scenario: "complete",
          step: 3,
        },
      };
    case "MODERATION_HOLD":
      return state.moderation.status === "clear" && validTime(action.now)
        ? {
            ...state,
            moderation: {
              status: "held",
              reason: holdReason,
              originalFinding,
              appealDraft: "",
              history: [
                ...state.moderation.history,
                {
                  kind: "held" as const,
                  text: holdReason,
                  createdAt: action.now,
                },
              ].slice(-30),
            },
          }
        : state;
    case "MODERATION_DRAFT":
      return state.moderation.status === "held" && action.text.length <= 1000
        ? {
            ...state,
            moderation: { ...state.moderation, appealDraft: action.text },
          }
        : state;
    case "MODERATION_APPEAL": {
      const text = state.moderation.appealDraft.trim();
      return state.moderation.status === "held" &&
        text.length >= 10 &&
        validTime(action.now)
        ? {
            ...state,
            moderation: {
              ...state.moderation,
              status: "reviewing",
              history: [
                ...state.moderation.history,
                {
                  kind: "appeal-submitted" as const,
                  text,
                  createdAt: action.now,
                },
              ].slice(-30),
            },
          }
        : state;
    }
    case "MODERATION_RESOLVE":
      return state.moderation.status === "reviewing" &&
        state.moderation.history.at(-1)?.kind === "appeal-submitted" &&
        validTime(action.now)
        ? {
            ...state,
            moderation: {
              ...state.moderation,
              status: "clear",
              history: [
                ...state.moderation.history,
                {
                  kind: "cleared" as const,
                  text: "Prepared review completed. The unsupported tactile claim has been removed from this held-listing scenario. Evidence and seller review are still required before publication.",
                  createdAt: action.now,
                },
              ].slice(-30),
            },
          }
        : state;
    case "SIGN_OUT":
      return { ...state, sessionEpoch: state.sessionEpoch + 1 };
    default:
      return state;
  }
}

export function loadRetainedState(storage: BrowserStorage | null): {
  state: RetainedState;
  storageAvailable: boolean;
} {
  if (!storage)
    return { state: initialRetainedState(), storageAvailable: false };
  let serialized: string | null;
  try {
    serialized = storage.getItem(RETAINED_STORAGE_KEY);
  } catch {
    return { state: initialRetainedState(), storageAvailable: false };
  }
  let storageAvailable = true;
  try {
    storage.setItem(`${RETAINED_STORAGE_KEY}-probe`, "1");
    storage.removeItem(`${RETAINED_STORAGE_KEY}-probe`);
  } catch {
    storageAvailable = false;
  }
  let value: unknown = null;
  try {
    value = serialized ? JSON.parse(serialized) : null;
  } catch {
    /* Recover corrupt JSON. */
  }
  return { state: sanitizeRetainedState(value), storageAvailable };
}
function browserStorage(): BrowserStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
type RetainedSnapshot = { state: RetainedState; storageAvailable: boolean };
let currentSnapshot: RetainedSnapshot | undefined;
const serverSnapshot: RetainedSnapshot = {
  state: initialRetainedState(),
  storageAvailable: false,
};
const listeners = new Set<() => void>();
let listeningForStorage = false;
function readSnapshot(): RetainedSnapshot {
  if (!currentSnapshot) currentSnapshot = loadRetainedState(browserStorage());
  return currentSnapshot;
}
function publishSnapshot(snapshot: RetainedSnapshot) {
  currentSnapshot = snapshot;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined" && !listeningForStorage) {
    listeningForStorage = true;
    window.addEventListener("storage", (event) => {
      if (event.key === RETAINED_STORAGE_KEY || event.key === null)
        publishSnapshot(loadRetainedState(browserStorage()));
    });
  }
  return () => {
    listeners.delete(listener);
  };
}
const updateRetainedState: Dispatch<SetStateAction<RetainedState>> = (
  update,
) => {
  const previous = readSnapshot(),
    value = typeof update === "function" ? update(previous.state) : update;
  if (value === previous.state) return;
  const state = sanitizeRetainedState(value),
    storage = browserStorage();
  let storageAvailable = false;
  try {
    storage?.setItem(RETAINED_STORAGE_KEY, JSON.stringify(state));
    storageAvailable = !!storage;
  } catch {
    /* Keep this session usable without persistence. */
  }
  publishSnapshot({ state, storageAvailable });
};
/** Shared browser-local state; no provider is needed. Every update is validated before persisting. */
export function useRetainedState() {
  const snapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => serverSnapshot,
  );
  return { ...snapshot, setState: updateRetainedState };
}
export function getPreparedReferenceStatus(
  state?: RetainedState,
): PreparedReferenceStatus {
  return (state ?? readSnapshot().state).referencePreparation.status;
}
export function resetRetainedState() {
  const previous = readSnapshot().state,
    storage = browserStorage();
  let storageAvailable = false;
  try {
    storage?.removeItem(RETAINED_STORAGE_KEY);
    storageAvailable = loadRetainedState(storage).storageAvailable;
  } catch {
    /* The state still resets for this visit. */
  }
  publishSnapshot({
    state: {
      ...initialRetainedState(),
      sessionEpoch: previous.sessionEpoch + 1,
    },
    storageAvailable,
  });
}
function PersistenceNotice({ available }: { available: boolean }) {
  return available ? null : (
    <p className="notice" role="status">
      Browser storage is unavailable. These changes last for this visit.
    </p>
  );
}

export function ListingConversation({ listing }: { listing: Listing }) {
  const { state, setState, storageAvailable } = useRetainedState();
  const conversation = state.conversations[listing.id] ?? {
    draft: "",
    messages: [],
  };
  const [error, setError] = useState(""),
    [reporting, setReporting] = useState<string | null>(null),
    [reason, setReason] = useState(reportReasons[0]),
    [note, setNote] = useState("");
  useEffect(() => {
    setReporting(null);
    setError("");
    setNote("");
  }, [listing.id, state.sessionEpoch]);
  const act = (action: RetainedAction) =>
    setState((current) => transitionRetained(current, action));
  return (
    <section
      className="panel stack question-box retained-conversation"
      aria-label={`Conversation about ${listing.name}`}
    >
      <div>
        <h3>Something else on your mind?</h3>
        <p className="muted">
          Keep questions and replies with this piece’s source context.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!conversation.draft.trim()) {
            setError("Write a question first.");
            return;
          }
          act({ type: "QUESTION_SEND", listing, now: timestamp() });
          setError("");
        }}
      >
        <label className="field">
          Question about {listing.name}
          <textarea
            maxLength={500}
            rows={3}
            value={conversation.draft}
            onChange={(event) =>
              act({
                type: "QUESTION_DRAFT",
                listingId: listing.id,
                draft: event.target.value,
              })
            }
            placeholder="Ask about a visible detail or measurement…"
            aria-invalid={!!error && !reporting}
          />
        </label>
        {!reporting && error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="button secondary" type="submit">
          Ask about this piece <ArrowRightIcon size={17} aria-hidden="true" />
        </button>
      </form>
      {conversation.messages.length > 0 && (
        <div
          className="stack conversation"
          role="log"
          aria-label="Conversation history"
        >
          {conversation.messages.map((message) => (
            <article className="stack" key={message.id}>
              <p>
                <strong>You:</strong> {message.question}
              </p>
              <div>
                <p>
                  <strong>Prepared reply · {listing.seller}’s wardrobe:</strong>{" "}
                  {message.reply}
                </p>
                {message.property && (
                  <Link
                    href={`/listing/${listing.id}/evidence?property=${message.property.toLowerCase()}`}
                    className="text-link"
                  >
                    Inspect {message.property.toLowerCase()} source{" "}
                    <ArrowRightIcon size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
              {message.report ? (
                <p className="notice" role="status">
                  <FlagIcon size={18} aria-hidden="true" />
                  Report recorded on this device: {message.report.reason}
                  {message.report.note ? ` — ${message.report.note}` : ""}
                </p>
              ) : reporting === message.id ? (
                <form
                  className="stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (reason === "Other concern" && !note.trim()) {
                      setError(
                        "Describe the concern before saving your report.",
                      );
                      return;
                    }
                    act({
                      type: "QUESTION_REPORT",
                      listingId: listing.id,
                      messageId: message.id,
                      reason,
                      note,
                      now: timestamp(),
                    });
                    setReporting(null);
                    setError("");
                    setNote("");
                  }}
                >
                  <label className="field">
                    Report reason
                    <select
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    >
                      {reportReasons.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    What concerns you?
                    {reason !== "Other concern" && " · optional"}
                    <textarea
                      maxLength={1000}
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      aria-invalid={!!error}
                    />
                  </label>
                  {error && (
                    <p className="field-error" role="alert">
                      {error}
                    </p>
                  )}
                  <p className="muted">
                    Your report stays with this conversation on this device. No
                    seller or moderation service is contacted.
                  </p>
                  <div className="actions">
                    <button className="button secondary" type="submit">
                      Save conversation report
                    </button>
                    <button
                      className="button quiet"
                      type="button"
                      onClick={() => {
                        setReporting(null);
                        setError("");
                      }}
                    >
                      Cancel report
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="button quiet"
                  type="button"
                  onClick={() => {
                    setReporting(message.id);
                    setReason(reportReasons[0]);
                    setNote("");
                    setError("");
                  }}
                >
                  <FlagIcon size={17} aria-hidden="true" />
                  Report this reply
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <PersistenceNotice available={storageAvailable} />
    </section>
  );
}

export function PropertyAftercare({ orderId }: { orderId: string }) {
  const { state: core, dispatch } = useStore(),
    { state, setState, storageAvailable } = useRetainedState();
  const [error, setError] = useState("");
  const order = core.orders.find((item) => item.id === orderId);
  const record = state.aftercare[orderId] ?? {
    status: "draft" as const,
    properties: emptyAftercareProperties(),
  };
  const receiptNames =
    order?.itemSnapshots?.map((item) => item.name) ??
    order?.items.map(
      (id) => CATALOG.find((item) => item.id === id)?.name ?? id,
    ) ??
    [];
  const act = (action: RetainedAction) =>
    setState((current) => transitionRetained(current, action));
  if (!order || !["delivered", "disputed"].includes(order.status)) return null;
  return (
    <details
      className="order-demo-controls retained-aftercare"
      key={state.sessionEpoch}
    >
      <summary>Compare four properties after arrival</summary>
      <section
        className="stack"
        aria-label={`Property feedback for ${orderId}`}
      >
        <div>
          <h3>Expected. Observed. Kept in mind.</h3>
          <p className="muted">{receiptNames.join(" · ")}</p>
          <p className="muted">
            Reflect on what you expected before arrival and what you noticed
            afterward. Your general order feedback stays in the order above.
          </p>
        </div>
        {record.status === "draft" ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isAftercareComplete(record)) {
                setError(
                  "Describe your expectation and choose an observation for all four properties. Describe each difference you noticed.",
                );
                return;
              }
              act({ type: "AFTERCARE_SAVE", orderId, now: timestamp() });
              setError("");
            }}
          >
            {PROPERTIES.map((property) => {
              const value = record.properties[property];
              return (
                <fieldset
                  className="panel stack retained-fieldset"
                  key={property}
                >
                  <legend>{property}</legend>
                  <label className="field">
                    Expected before arrival
                    <textarea
                      rows={3}
                      maxLength={3000}
                      value={value.expected}
                      placeholder="What did you expect from the description?"
                      onChange={(event) =>
                        act({
                          type: "AFTERCARE_EDIT",
                          orderId,
                          property,
                          value: { ...value, expected: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Observed after arrival
                    <select
                      value={value.observed}
                      onChange={(event) =>
                        act({
                          type: "AFTERCARE_EDIT",
                          orderId,
                          property,
                          value: {
                            ...value,
                            observed: event.target.value as ObservationChoice,
                          },
                        })
                      }
                    >
                      <option value="">Choose what you noticed</option>
                      <option value="as-expected">As expected</option>
                      <option value="different">Different from expected</option>
                      <option value="not-observed">
                        I could not assess this property
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    Your observation
                    {value.observed !== "different" && " · optional"}
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={value.note}
                      onChange={(event) =>
                        act({
                          type: "AFTERCARE_EDIT",
                          orderId,
                          property,
                          value: { ...value, note: event.target.value },
                        })
                      }
                    />
                  </label>
                </fieldset>
              );
            })}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button className="button secondary" type="submit">
                Save property feedback{" "}
                <CheckCircleIcon size={18} aria-hidden="true" />
              </button>
              <button
                className="button quiet"
                type="button"
                onClick={() => {
                  act({ type: "AFTERCARE_SKIP", orderId, now: timestamp() });
                  setError("");
                }}
              >
                Skip for now
              </button>
            </div>
          </form>
        ) : record.status === "skipped" ? (
          <div className="stack">
            <p className="notice" role="status">
              Property feedback skipped. You can return whenever you’re ready.
            </p>
            <button
              className="button secondary"
              onClick={() => act({ type: "AFTERCARE_REOPEN", orderId })}
            >
              Return to property feedback
            </button>
          </div>
        ) : (
          <div className="stack">
            <p className="notice" role="status">
              <CheckCircleIcon size={19} aria-hidden="true" />
              Your four-property reflection is saved.
            </p>
            {PROPERTIES.map((property) => (
              <div key={property}>
                <h3>{property}</h3>
                <p>
                  <strong>Expected:</strong>{" "}
                  {record.properties[property].expected}
                </p>
                <p>
                  <strong>Observed:</strong>{" "}
                  {record.properties[property].observed === "as-expected"
                    ? "As expected"
                    : record.properties[property].observed === "different"
                      ? "Different from expected"
                      : "Could not assess"}
                  {record.properties[property].note
                    ? ` — ${record.properties[property].note}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        )}
        {record.status !== "draft" && (
          <div className="notice">
            <LockSimpleIcon size={21} aria-hidden="true" />
            <div>
              <strong>Keep a familiar reference for next time.</strong>
              <p>
                Use the prepared blue blouse as your private starting point for
                future comparisons.
              </p>
              {!core.referenceAvailable ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    dispatch({ type: "REFERENCE_RESTORE" });
                    act({ type: "REFERENCE_READY" });
                  }}
                >
                  Restore private reference
                </button>
              ) : (
                <Link href="/match" className="text-link">
                  Return to your private reference{" "}
                  <ArrowRightIcon size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        )}
        <PersistenceNotice available={storageAvailable} />
      </section>
    </details>
  );
}

export function PrivacyControls() {
  const {
      state: core,
      dispatch,
      storageAvailable: coreStorageAvailable,
    } = useStore(),
    { state, setState, storageAvailable } = useRetainedState();
  const [confirm, setConfirm] = useState<"remove" | "reset" | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setConfirm(null);
  }, [state.sessionEpoch]);
  const exportData = () => {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              format: "refeel-local-export-v1",
              exportedAt: timestamp(),
              experience: core,
              retained: state,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "refeel-local-data.json";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Your local data export is ready.");
    } catch {
      setNotice(
        "This browser could not create the export. Your local choices are still available.",
      );
    }
  };
  return (
    <section
      className="panel stack retained-privacy"
      aria-label="Privacy and local data controls"
    >
      <h2>Your choices, on this device.</h2>
      <p>
        Export your local choices, withdraw reference consent or return the
        experience to its starting state.
      </p>
      <div className="actions">
        <button className="button secondary" onClick={exportData}>
          <DownloadSimpleIcon size={19} aria-hidden="true" />
          Export local data
        </button>
        <button
          className="button quiet"
          disabled={!core.referenceAvailable}
          onClick={() => setConfirm("remove")}
        >
          Remove reference consent
        </button>
        <button className="button quiet" onClick={() => setConfirm("reset")}>
          Reset local experience
        </button>
      </div>
      {confirm === "remove" && (
        <div className="notice">
          <LockSimpleIcon size={21} aria-hidden="true" />
          <div>
            <h3>Remove your private reference?</h3>
            <p>
              Your reference will no longer be available for comparisons. Your
              bag, saved pieces, conversations and orders stay in place.
            </p>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  dispatch({ type: "REFERENCE_DELETE" });
                  setState((current) => ({
                    ...current,
                    referencePreparation:
                      initialRetainedState().referencePreparation,
                  }));
                  setConfirm(null);
                  setNotice(
                    "Reference consent removed. You can keep browsing without a private reference.",
                  );
                }}
              >
                Remove reference consent now
              </button>
              <button className="button quiet" onClick={() => setConfirm(null)}>
                Keep reference
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm === "reset" && (
        <div className="notice">
          <WarningCircleIcon size={21} aria-hidden="true" />
          <div>
            <h3>Reset this local experience?</h3>
            <p>
              This clears your bag, saved pieces, seller decisions, orders,
              conversations, reference preparation and property feedback.
            </p>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  dispatch({ type: "RESET" });
                  resetRetainedState();
                  navigate("/");
                }}
              >
                Reset all local choices
              </button>
              <button className="button quiet" onClick={() => setConfirm(null)}>
                Keep my choices
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <h3>Leave the prepared experience</h3>
        <p className="muted">
          This sign-out step returns to the gateway and closes open supplemental
          panels. Your local choices stay on this device; there is no
          authenticated account.
        </p>
        <button
          className="button secondary"
          onClick={() => {
            setState((current) =>
              transitionRetained(current, { type: "SIGN_OUT" }),
            );
            dispatch({ type: "GUIDE", value: false });
            navigate("/");
          }}
        >
          <SignOutIcon size={19} aria-hidden="true" />
          Sign out of prepared session
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <PersistenceNotice available={storageAvailable && coreStorageAvailable} />
    </section>
  );
}

const referenceSteps = [
  {
    title: "Start with the garment outline",
    copy: "The prepared full-garment frame establishes the blue blouse’s neckline, folds and hem.",
    property: "Drape" as Property,
  },
  {
    title: "Look closer at the surface",
    copy: "The prepared detail gives visible texture and wear context. It cannot establish exact softness.",
    property: "Surface" as Property,
  },
  {
    title: "Check movement coverage",
    copy: "Three prepared frames supply limited visual context; movement during wear remains unknown.",
    property: "Movement" as Property,
  },
  {
    title: "Review reference readiness",
    copy: "Check source coverage before bringing this private reference back into Match.",
    property: "Drape" as Property,
  },
];
export function ReferencePreparation() {
  const { dispatch } = useStore(),
    { state, setState, storageAvailable } = useRetainedState();
  const [scenario, setScenario] = useState<"complete" | "missing-movement">(
    "complete",
  );
  const preparation = state.referencePreparation,
    step = referenceSteps[preparation.step],
    source = REFERENCE.evidence.find(
      (item) => item.property === step.property,
    )!;
  const act = (action: RetainedAction) =>
    setState((current) => transitionRetained(current, action));
  return (
    <details
      key={state.sessionEpoch}
      open={preparation.status !== "ready"}
      className="stack retained-reference reference-replacement"
    >
      <summary>Replace prepared reference</summary>
      <section className="stack" aria-label="Prepared reference replacement">
        {preparation.status === "ready" ? (
          <>
            <p className="muted">
              Walk through prepared source checks for a replacement private blue
              blouse.
            </p>
            <label className="field">
              Prepared source coverage
              <select
                value={scenario}
                onChange={(event) =>
                  setScenario(event.target.value as typeof scenario)
                }
              >
                <option value="complete">Complete prepared sources</option>
                <option value="missing-movement">
                  Missing movement sequence
                </option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() => act({ type: "REFERENCE_START", scenario })}
            >
              Begin reference replacement{" "}
              <ArrowRightIcon size={16} aria-hidden="true" />
            </button>
          </>
        ) : preparation.status === "incomplete" ? (
          <div className="stack">
            <span className="tag">Incomplete reference</span>
            <h3>Movement coverage is missing.</h3>
            <p>
              The replacement has not entered Match. Complete the prepared
              source walkthrough to restore a ready private reference.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                act({ type: "REFERENCE_START", scenario: "complete" })
              }
            >
              Complete missing source walkthrough
            </button>
            <button
              className="button quiet"
              onClick={() => {
                dispatch({ type: "REFERENCE_RESTORE" });
                act({ type: "REFERENCE_READY" });
              }}
            >
              Keep original prepared reference
            </button>
          </div>
        ) : (
          <>
            <span className="tag" role="status">
              Processing reference · {preparation.step + 1} of 4
            </span>
            <progress
              max={4}
              value={preparation.step + 1}
              aria-label="Reference preparation progress"
            />
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
            {preparation.step === 2 &&
            preparation.scenario === "missing-movement" ? (
              <p className="notice">
                <WarningCircleIcon size={21} aria-hidden="true" />
                No movement sequence is included in this replacement. Match
                stays paused until the reference is ready.
              </p>
            ) : (
              <figure style={{ margin: 0 }}>
                <img
                  src={source.source}
                  alt={`${step.property} source for the prepared private blue blouse`}
                  width="600"
                  height="510"
                />
                <figcaption className="muted">{source.frame}</figcaption>
              </figure>
            )}
            {preparation.step === 3 && (
              <p className="notice">
                {preparation.scenario === "complete"
                  ? "Prepared drape, surface and limited movement sources are included. Stretch remains unavailable."
                  : "Drape and surface are included. Movement is missing, so this replacement will remain incomplete."}
              </p>
            )}
            <div className="actions">
              <button
                className="button quiet"
                disabled={preparation.step === 0}
                onClick={() => act({ type: "REFERENCE_BACK" })}
              >
                Previous reference check
              </button>
              {preparation.step < 3 ? (
                <button
                  className="button secondary"
                  onClick={() => act({ type: "REFERENCE_NEXT" })}
                >
                  Next reference check{" "}
                  <ArrowRightIcon size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => {
                    if (preparation.scenario === "complete")
                      dispatch({ type: "REFERENCE_RESTORE" });
                    act({ type: "REFERENCE_FINISH" });
                  }}
                >
                  Finish reference replacement{" "}
                  <CheckCircleIcon size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
        <PersistenceNotice available={storageAvailable} />
      </section>
    </details>
  );
}

export function SellerSupportPanel() {
  const { state, setState, storageAvailable } = useRetainedState();
  const { moderation } = state;
  const [error, setError] = useState("");
  const act = (action: RetainedAction) =>
    setState((current) => transitionRetained(current, action));
  return (
    <details
      className="order-demo-controls retained-moderation"
      key={state.sessionEpoch}
      open={moderation.status !== "clear"}
    >
      <summary>Seller support and moderation history</summary>
      <section className="panel stack" aria-label="Seller moderation support">
        <div className="spread">
          <h3>Listing review support</h3>
          <span className="tag">
            {moderation.status === "held"
              ? "Moderation hold"
              : moderation.status === "reviewing"
                ? "Appeal awaiting review"
                : "No current hold"}
          </span>
        </div>
        {moderation.status === "clear" ? (
          <>
            <p className="muted">
              A moderation hold is separate from source confirmation, visible
              condition and ordinary draft readiness.
            </p>
            <button
              className="button secondary"
              onClick={() => act({ type: "MODERATION_HOLD", now: timestamp() })}
            >
              Explore a held listing
            </button>
          </>
        ) : (
          <div className="notice">
            <WarningCircleIcon size={21} aria-hidden="true" />
            <div>
              <strong>Publication is paused while this hold is open.</strong>
              <p>{moderation.reason}</p>
            </div>
          </div>
        )}
        {moderation.originalFinding && (
          <p className="muted">{moderation.originalFinding}</p>
        )}
        {moderation.status === "held" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (moderation.appealDraft.trim().length < 10) {
                setError(
                  "Describe your correction or source clarification in at least 10 characters.",
                );
                return;
              }
              act({ type: "MODERATION_APPEAL", now: timestamp() });
              setError("");
            }}
          >
            <label className="field">
              Appeal or correction explanation
              <textarea
                rows={3}
                maxLength={1000}
                value={moderation.appealDraft}
                onChange={(event) =>
                  act({ type: "MODERATION_DRAFT", text: event.target.value })
                }
                aria-invalid={!!error}
                placeholder="Explain how the unsupported claim was corrected…"
              />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="button secondary" type="submit">
              Submit prepared appeal{" "}
              <ArrowRightIcon size={17} aria-hidden="true" />
            </button>
          </form>
        )}
        {moderation.status === "reviewing" && (
          <div className="stack">
            <p className="notice" role="status">
              Your prepared appeal is awaiting review. The hold still prevents
              publication.
            </p>
            <p className="muted">
              The next step opens a prepared review decision for this local
              scenario.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                act({ type: "MODERATION_RESOLVE", now: timestamp() })
              }
            >
              Read prepared review decision
            </button>
          </div>
        )}
        {moderation.history.length > 0 && (
          <div className="stack">
            <h3>Decision history</h3>
            <ol className="stack">
              {moderation.history.map((event, index) => (
                <li key={`${event.createdAt}-${index}`}>
                  <strong>
                    {event.kind === "held"
                      ? "Hold recorded"
                      : event.kind === "appeal-submitted"
                        ? "Appeal submitted"
                        : "Hold cleared by prepared review"}
                  </strong>
                  <p>{event.text}</p>
                  <time className="muted" dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="muted">
          Support history stays on this device. The prepared review decision
          does not contact a moderation service.
        </p>
        <PersistenceNotice available={storageAvailable} />
      </section>
    </details>
  );
}
