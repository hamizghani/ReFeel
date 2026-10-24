import InventoryControls from "./components/InventoryControls";
import {
  SellerSupportPanel,
  PropertyAftercare,
} from "./components/RetainedFlows";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle,
  Package,
  ShieldCheck,
  WarningCircle,
  X,
  Camera,
  PencilSimple,
  Clock,
  Truck,
} from "@phosphor-icons/react";
import {
  CATALOG,
  checkoutItems,
  getListing,
  money,
  type AppState,
  type Listing,
  type Property,
  type ReviewStatus,
  type ViewMode,
} from "./domain";
import { useStore } from "./store";
import { Link, navigate } from "./router";
import GarmentViewer from "./components/GarmentViewer";

const properties: Property[] = ["Drape", "Movement", "Stretch", "Surface"];
const captureSteps: {
  name: string;
  title: string;
  description: string;
  instruction: string;
  mode: ViewMode;
  property?: Property;
}[] = [
  {
    name: "Introduction",
    title: "A clearer look, before it leaves you.",
    description:
      "Work through five garment checks, then review what the evidence can tell a buyer.",
    instruction:
      "This walkthrough uses prepared garment media. Nothing is recorded, uploaded or measured from your device.",
    mode: "neutral",
  },
  {
    name: "Front",
    title: "Start with the whole garment.",
    description: "Look at the shape, seams and proportions from the front.",
    instruction:
      "Keep the garment fully in view. A front image shows its shape; it cannot establish stretch or exact softness.",
    mode: "front",
    property: "Stretch",
  },
  {
    name: "Label",
    title: "Make the label readable.",
    description: "Check the size and care label before describing the piece.",
    instruction:
      "A label records what is printed on the garment. Fibre composition and authenticity are not independently verified here.",
    mode: "label",
    property: "Stretch",
  },
  {
    name: "Surface",
    title: "Look a little closer.",
    description: "Check the cuff, seams and fabric surface for visible wear.",
    instruction:
      "The prepared surface frame includes a small cuff wear mark. Review it before deciding how to describe the condition.",
    mode: "surface",
    property: "Surface",
  },
  {
    name: "Movement",
    title: "Let the shape move.",
    description: "Follow the sleeve and hem as the illustrative garment moves.",
    instruction:
      "Movement and drape are separate observations. The illustrative model helps you inspect shape; it does not measure fabric mechanics.",
    mode: "movement",
    property: "Movement",
  },
  {
    name: "Visible wear",
    title: "Finish with the details that matter.",
    description: "Check the visible wear, then review all four findings.",
    instruction:
      "Only visible areas are covered. Odor, hygiene, hidden damage and exact softness remain unknown.",
    mode: "wear",
    property: "Surface",
  },
];

function draftListing(state: AppState): Listing {
  const listing = getListing(state, "cloud-poplin") ?? CATALOG[0];
  return { ...listing, ...state.draft };
}

function reviewCount(state: AppState): number {
  return properties.filter(
    (property) =>
      state.decisions[property]?.status &&
      state.decisions[property].status !== "unreviewed",
  ).length;
}

function statusLabel(status: ReviewStatus): string {
  return {
    unreviewed: "Needs review",
    confirmed: "Confirmed",
    corrected: "Seller correction",
    unsure: "Uncertain",
  }[status];
}

function supportLabel(support: string): string {
  return (
    (
      {
        supported: "Source supported",
        limited: "Limited evidence",
        unavailable: "Not established",
      } as Record<string, string>
    )[support] ?? "Not established"
  );
}

function StorageNotice() {
  const { storageAvailable } = useStore();
  return storageAvailable ? null : (
    <p className="notice" role="status">
      Your browser cannot save this session. Keep this page open to continue
      your draft.
    </p>
  );
}

function Recovery({ review = false }: { review?: boolean }) {
  const { state } = useStore();
  const needsCapture = !state.captureComplete;
  return (
    <section className="page recovery-page">
      <p className="eyebrow">Seller workspace</p>
      <h1>
        {needsCapture
          ? "A few checks come first."
          : "Your review is still in progress."}
      </h1>
      <p className="lede">
        {needsCapture
          ? "Finish the garment walkthrough before reviewing or publishing this listing. Your saved draft is ready when you are."
          : "Decide how to describe each of the four findings before publishing. Corrections need a short explanation."}
      </p>
      <div className="panel stack recovery-panel">
        <span className="icon-disc">
          <ShieldCheck size={28} aria-hidden="true" />
        </span>
        <h2>
          {needsCapture
            ? "Capture is not complete"
            : `${reviewCount(state)} of 4 findings reviewed`}
        </h2>
        <p className="muted">
          {needsCapture
            ? `Resume from ${captureSteps[Math.min(state.captureStage, 5)].name.toLowerCase()}.`
            : "Your review decisions are saved as you go."}
        </p>
        <Link
          className="button primary"
          href={needsCapture ? "/sell/capture" : "/sell/review"}
        >
          {needsCapture ? "Continue garment checks" : "Continue review"}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link className="button quiet" href="/sell">
          Back to your draft
        </Link>
      </div>
      {review && (
        <p className="muted">
          A finding can be confirmed, corrected or marked uncertain. Missing
          evidence stays visible to buyers.
        </p>
      )}
    </section>
  );
}

export function SellPage() {
  const { state, dispatch, storageAvailable } = useStore();
  const listing = draftListing(state);
  const [name, setName] = useState(state.draft.name);
  const [price, setPrice] = useState(String(state.draft.price));
  const [size, setSize] = useState(state.draft.size);
  const [description, setDescription] = useState(state.draft.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const reviewed = reviewCount(state);
  const nextPath = state.captureComplete
    ? reviewed === 4
      ? "/sell/publish"
      : "/sell/review"
    : "/sell/capture";
  const nextLabel = state.captureComplete
    ? reviewed === 4
      ? "Preview & publish"
      : "Continue review"
    : state.captureStage > 0
      ? "Resume garment checks"
      : "Start garment checks";

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length > 100)
      nextErrors.name = "Enter a name between 1 and 100 characters.";
    if (
      !price.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 1 ||
      Number(price) > 9999
    )
      nextErrors.price = "Enter a price from $1 to $9,999.";
    if (description.length > 2000)
      nextErrors.description = "Keep your description under 2,000 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    dispatch({
      type: "DRAFT",
      draft: { name: name.trim(), price: Number(price), size, description },
    });
    setSaved(true);
  }

  return (
    <section className="page seller-page">
      <div className="split seller-hero">
        <div>
          <p className="eyebrow">Your seller workspace</p>
          <h1>
            Pass it on.
            <br />
            <em>With a clearer picture.</em>
          </h1>
          <p className="lede">
            A good second life starts with an honest description. Add the
            details, check the garment, and let buyers see what you know.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href={nextPath}>
              {nextLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button secondary" href="/shop">
              Back to browsing
            </Link>
          </div>
          <div className="seller-save-status">
            <span className="status-dot" />
            <span>
              {storageAvailable
                ? "Your draft saves on this device"
                : "Your draft is available for this session"}
            </span>
          </div>
        </div>
        <div
          className="seller-preview"
          style={{ background: listing.background }}
        >
          <img src={listing.poster} alt={listing.name} />
          <div className="seller-preview-caption">
            <span className="tag">
              {state.published ? "Published" : "Your draft"}
            </span>
            <strong>{listing.name}</strong>
            <span>
              {money(listing.price)} · Size {listing.size}
            </span>
          </div>
        </div>
      </div>
      <StorageNotice />
      <div className="seller-workspace split">
        <form
          className="panel stack seller-form"
          onSubmit={saveDraft}
          noValidate
        >
          <div className="split panel-heading">
            <div>
              <p className="eyebrow">01 · The details</p>
              <h2>Make it yours.</h2>
            </div>
            <span className="tag">
              {state.published ? "Editing published details" : "Draft"}
            </span>
          </div>
          <label className="field" htmlFor="draft-name">
            <span>Listing name</span>
            <input
              id="draft-name"
              value={name}
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "draft-name-error" : undefined}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                setSaved(false);
                if (value.trim())
                  dispatch({ type: "DRAFT", draft: { name: value } });
              }}
            />
            {errors.name && (
              <span id="draft-name-error" className="field-error" role="alert">
                {errors.name}
              </span>
            )}
          </label>
          <div className="grid two-fields">
            <label className="field" htmlFor="draft-price">
              <span>Price · USD</span>
              <input
                id="draft-price"
                type="number"
                inputMode="decimal"
                min="1"
                max="9999"
                step="0.01"
                value={price}
                aria-invalid={Boolean(errors.price)}
                aria-describedby={
                  errors.price ? "draft-price-error" : undefined
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setPrice(value);
                  setSaved(false);
                  const numeric = Number(value);
                  if (
                    value.trim() &&
                    Number.isFinite(numeric) &&
                    numeric >= 1 &&
                    numeric <= 9999
                  )
                    dispatch({ type: "DRAFT", draft: { price: numeric } });
                }}
              />
              {errors.price && (
                <span
                  id="draft-price-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.price}
                </span>
              )}
            </label>
            <label className="field" htmlFor="draft-size">
              <span>Label size</span>
              <select
                id="draft-size"
                value={size}
                onChange={(event) => {
                  const value = event.target.value as "S" | "M" | "L";
                  setSize(value);
                  setSaved(false);
                  dispatch({ type: "DRAFT", draft: { size: value } });
                }}
              >
                <option value="S">S · Small</option>
                <option value="M">M · Medium</option>
                <option value="L">L · Large</option>
              </select>
            </label>
          </div>
          <label className="field" htmlFor="draft-description">
            <span>Description</span>
            <textarea
              id="draft-description"
              rows={4}
              maxLength={2000}
              value={description}
              aria-invalid={Boolean(errors.description)}
              aria-describedby="draft-description-help"
              onChange={(event) => {
                setDescription(event.target.value);
                setSaved(false);
                dispatch({
                  type: "DRAFT",
                  draft: { description: event.target.value },
                });
              }}
            />
            <span id="draft-description-help" className="muted">
              Describe visible condition and details you can support.
            </span>
            {errors.description && (
              <span className="field-error" role="alert">
                {errors.description}
              </span>
            )}
          </label>
          <div className="form-actions">
            <button className="button secondary" type="submit">
              <Check size={18} aria-hidden="true" />
              Save details
            </button>
            <span className="muted" role="status">
              {saved
                ? storageAvailable
                  ? "Details saved."
                  : "Details saved for this session."
                : "Valid changes save as you type."}
            </span>
          </div>
        </form>
        <div className="panel stack seller-checklist">
          <p className="eyebrow">02 · The evidence</p>
          <h2>
            Small checks.
            <br />
            More confidence.
          </h2>
          <ol className="seller-flow">
            <li>
              <span
                className={`flow-number ${state.captureComplete ? "complete" : ""}`}
              >
                {state.captureComplete ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  "1"
                )}
              </span>
              <div>
                <strong>Check the garment</strong>
                <p className="muted">
                  Front, label, surface, movement and visible wear.
                </p>
              </div>
            </li>
            <li>
              <span
                className={`flow-number ${reviewed === 4 ? "complete" : ""}`}
              >
                {reviewed === 4 ? <Check size={16} aria-hidden="true" /> : "2"}
              </span>
              <div>
                <strong>Review four findings</strong>
                <p className="muted">
                  Confirm, correct or keep a finding uncertain.
                </p>
                <span className="tag">{reviewed}/4 reviewed</span>
              </div>
            </li>
            <li>
              <span
                className={`flow-number ${state.published ? "complete" : ""}`}
              >
                {state.published ? <Check size={16} aria-hidden="true" /> : "3"}
              </span>
              <div>
                <strong>Preview & publish</strong>
                <p className="muted">
                  Your corrections and uncertainty go with the listing.
                </p>
              </div>
            </li>
          </ol>
          <Link className="button primary" href={nextPath}>
            {nextLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {state.published && (
            <Link className="button quiet" href="/listing/cloud-poplin">
              See your listing
            </Link>
          )}
          <p className="muted small">
            Prepared garment media is used in this walkthrough.{" "}
            <Link href="/about">How Familiar works</Link>
          </p>
        </div>
      </div>
      <InventoryControls />
      <SellerSupportPanel />
    </section>
  );
}

export function CapturePage() {
  const { state, dispatch } = useStore();
  const [captureIssue, setCaptureIssue] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const listing = draftListing(state);
  const stage = Math.min(5, Math.max(0, state.captureStage));
  const step = captureSteps[stage];
  const evidence = listing.evidence.find(
    (item) => item.property === step.property,
  );
  const source =
    stage === 2
      ? "/evidence/cloud-poplin-label.svg"
      : evidence?.source?.startsWith("/")
        ? evidence.source
        : evidence?.frame?.startsWith("/")
          ? evidence.frame
          : undefined;

  useEffect(() => {
    stageHeading.current?.focus({ preventScroll: true });
    stageHeading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [stage]);

  function next() {
    setCaptureIssue(false);
    dispatch({ type: "CAPTURE_NEXT" });
    if (stage === 5) navigate("/sell/review");
  }

  function back() {
    setCaptureIssue(false);
    dispatch({ type: "CAPTURE_BACK" });
  }

  if (state.captureComplete && state.captureStage === 6)
    return (
      <section className="page capture-page">
        <p className="eyebrow">Garment checks complete</p>
        <h1>Ready for your second look.</h1>
        <p className="lede">
          All five garment checks are saved. Review the four findings before
          they become part of the listing.
        </p>
        <div className="split">
          <div className="panel stack">
            <CheckCircle size={40} aria-hidden="true" />
            <h2>Now add your judgment.</h2>
            <p className="muted">
              The source can show visible details. You decide what needs a
              correction or should stay uncertain.
            </p>
            <Link className="button primary" href="/sell/review">
              Review findings
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button quiet" href="/sell">
              Back to workspace
            </Link>
          </div>
          <GarmentViewer listing={listing} mode="neutral" />
        </div>
      </section>
    );

  return (
    <section className="page capture-page">
      <div className="route-topline">
        <Link className="back-link" href="/sell">
          <ArrowLeft size={16} aria-hidden="true" />
          Seller workspace
        </Link>
        <span className="tag">
          {stage === 0 ? "Getting started" : `Check ${stage} of 5`}
        </span>
      </div>
      <p className="eyebrow">Garment walkthrough</p>
      <h1 ref={stageHeading} tabIndex={-1}>
        {step.title}
      </h1>
      <p className="lede">{step.description}</p>
      <ol className="capture-stage-nav" aria-label="Garment check progress">
        {captureSteps.map((item, index) => (
          <li
            key={item.name}
            className={
              index === stage ? "current" : index < stage ? "complete" : ""
            }
            aria-current={index === stage ? "step" : undefined}
          >
            <span>
              {index < stage ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span>{item.name}</span>
          </li>
        ))}
      </ol>
      <div className="capture-layout">
        <div className="capture-visual">
          <GarmentViewer listing={listing} mode={step.mode} />
          {stage > 0 && (
            <p className="muted small viewer-caption">
              Illustrative 3D view · {step.name.toLowerCase()} check
            </p>
          )}
        </div>
        <div className="stack">
          <div className="panel stack capture-card">
            <span className="tag">
              {stage === 0
                ? "Before you begin"
                : `${String(stage).padStart(2, "0")} · ${step.name}`}
            </span>
            <h2>
              {stage === 0
                ? "Five checks. One honest listing."
                : `Check the ${step.name.toLowerCase()}`}
            </h2>
            <p>{step.instruction}</p>
            {stage === 0 ? (
              <ul className="capture-intro-list">
                <li>
                  <Check size={16} aria-hidden="true" />
                  Inspect each prepared view
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Keep uncertain details visible
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Review before you publish
                </li>
              </ul>
            ) : (
              <div className="capture-source">
                {source && (
                  <img
                    src={source}
                    alt={`Prepared ${step.property?.toLowerCase()} source frame for ${listing.name}`}
                  />
                )}
                <p className="eyebrow">Prepared source media</p>
                <p className="muted small">
                  {stage === 2
                    ? "Label view · declared size M · composition unverified"
                    : evidence?.frame && !evidence.frame.startsWith("/")
                      ? evidence.frame
                      : `Prepared ${step.name.toLowerCase()} view for this garment.`}
                </p>
              </div>
            )}
            {captureIssue ? (
              <div className="notice capture-issue" role="alert">
                <WarningCircle size={24} aria-hidden="true" />
                <div>
                  <strong>This view needs another look.</strong>
                  <p>
                    The detail is not clear enough to review. Try the prepared
                    check again before continuing.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setCaptureIssue(false)}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              stage > 0 && (
                <button
                  type="button"
                  className="button quiet capture-issue-link"
                  onClick={() => setCaptureIssue(true)}
                >
                  <WarningCircle size={16} aria-hidden="true" />
                  View a capture issue
                </button>
              )
            )}
            <div className="capture-actions">
              <button
                type="button"
                className="button primary"
                disabled={captureIssue}
                onClick={next}
              >
                {stage === 0
                  ? "Start garment checks"
                  : stage === 5
                    ? "Finish & review"
                    : "Save check & continue"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              {stage > 0 && (
                <button type="button" className="button quiet" onClick={back}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Previous check
                </button>
              )}
            </div>
            <p className="muted small">
              {stage === 0
                ? "No camera access or uploads are needed."
                : "Your progress saves as you continue."}
            </p>
          </div>
        </div>
      </div>
      <StorageNotice />
    </section>
  );
}

export function ReviewPage() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<Property | null>(null);
  const [beforeCorrection, setBeforeCorrection] = useState<{
    status: ReviewStatus;
    note: string;
  } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      properties.map((property) => [
        property,
        state.decisions[property]?.note ?? "",
      ]),
    ),
  );
  const [error, setError] = useState<Property | null>(null);
  const [appeal, setAppeal] = useState(false);
  const listing = draftListing(state);
  const count = reviewCount(state);
  if (!state.captureComplete) return <Recovery review />;

  function choose(property: Property, status: "confirmed" | "unsure") {
    if (editing && editing !== property && beforeCorrection)
      dispatch({ type: "DECIDE", property: editing, ...beforeCorrection });
    dispatch({ type: "DECIDE", property, status });
    setEditing(null);
    setBeforeCorrection(null);
    setError(null);
  }

  function beginCorrection(property: Property) {
    if (editing === property) return;
    if (editing && beforeCorrection)
      dispatch({ type: "DECIDE", property: editing, ...beforeCorrection });
    setBeforeCorrection(
      state.decisions[property] ?? { status: "unreviewed", note: "" },
    );
    dispatch({ type: "DECIDE", property, status: "unreviewed" });
    setEditing(property);
    setError(null);
  }

  function cancelCorrection(property: Property) {
    if (beforeCorrection)
      dispatch({ type: "DECIDE", property, ...beforeCorrection });
    setEditing(null);
    setBeforeCorrection(null);
    setError(null);
  }

  function correct(property: Property) {
    if (!notes[property]?.trim()) {
      setError(property);
      return;
    }
    dispatch({
      type: "DECIDE",
      property,
      status: "corrected",
      note: notes[property].trim(),
    });
    setEditing(null);
    setBeforeCorrection(null);
    setError(null);
  }

  function retake(property: Property) {
    const stage = property === "Surface" ? 3 : property === "Stretch" ? 1 : 4;
    dispatch({ type: "CAPTURE_RETAKE", stage });
    navigate("/sell/capture");
  }

  return (
    <section className="page review-page">
      <div className="route-topline">
        <Link className="back-link" href="/sell">
          <ArrowLeft size={16} aria-hidden="true" />
          Seller workspace
        </Link>
        <span className="tag">{count}/4 reviewed</span>
      </div>
      <p className="eyebrow">Your evidence review</p>
      <h1>
        A second look.
        <br />
        <em>Your final say.</em>
      </h1>
      <p className="lede">
        Check each source observation. Confirm it, add a correction, or say when
        you are unsure. Every choice stays visible with your listing.
      </p>
      <div className="review-grid">
        {properties.map((property) => {
          const evidence = listing.evidence.find(
            (item) => item.property === property,
          );
          const decision = state.decisions[property] ?? {
            status: "unreviewed" as const,
            note: "",
          };
          const source = evidence?.source?.startsWith("/")
            ? evidence.source
            : evidence?.frame?.startsWith("/")
              ? evidence.frame
              : undefined;
          return (
            <article
              className={`panel review-card stack review-${decision.status}`}
              key={property}
            >
              <div className="review-card-heading">
                <h2>{property}</h2>
                <span
                  className={`tag ${decision.status === "unreviewed" ? "" : "reviewed-tag"}`}
                >
                  {statusLabel(decision.status)}
                </span>
              </div>
              {source && (
                <img
                  className="review-source-image"
                  src={source}
                  alt={`${property} prepared source evidence`}
                />
              )}
              <span className="evidence-support">
                {supportLabel(evidence?.support ?? "unavailable")}
              </span>
              <p className="review-observation">
                {evidence?.observation ??
                  "This property is not established by the available source."}
              </p>
              <p className="muted small">
                {evidence?.frame && !evidence.frame.startsWith("/")
                  ? evidence.frame
                  : "Prepared source frame"}{" "}
                ·{" "}
                <Link
                  href={`/listing/cloud-poplin/evidence?property=${property.toLowerCase()}`}
                >
                  See source evidence
                </Link>
              </p>
              {decision.status === "corrected" && editing !== property && (
                <div className="notice correction-note">
                  <strong>Your correction</strong>
                  <p>{decision.note}</p>
                </div>
              )}
              {decision.status === "unsure" && (
                <p className="notice small">
                  This will stay uncertain for buyers. No extra support is
                  added.
                </p>
              )}
              <div
                className="decision-options"
                role="group"
                aria-label={`${property} review decision`}
              >
                <button
                  type="button"
                  className={`button ${decision.status === "confirmed" ? "primary" : "secondary"}`}
                  aria-pressed={decision.status === "confirmed"}
                  onClick={() => choose(property, "confirmed")}
                >
                  <Check size={16} aria-hidden="true" />
                  Confirm
                </button>
                <button
                  type="button"
                  className={`button ${editing === property || decision.status === "corrected" ? "primary" : "secondary"}`}
                  aria-pressed={
                    editing === property || decision.status === "corrected"
                  }
                  onClick={() => beginCorrection(property)}
                >
                  <PencilSimple size={16} aria-hidden="true" />
                  Correct
                </button>
                <button
                  type="button"
                  className={`button ${decision.status === "unsure" ? "primary" : "secondary"}`}
                  aria-pressed={decision.status === "unsure"}
                  onClick={() => choose(property, "unsure")}
                >
                  Unsure
                </button>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => retake(property)}
                >
                  <Camera size={16} aria-hidden="true" />
                  Retake
                </button>
              </div>
              {editing === property && (
                <div className="stack correction-editor">
                  <label className="field" htmlFor={`correction-${property}`}>
                    <span>What should a buyer know?</span>
                    <textarea
                      id={`correction-${property}`}
                      rows={3}
                      value={notes[property]}
                      maxLength={1000}
                      aria-invalid={error === property}
                      aria-describedby={
                        error === property
                          ? `correction-error-${property}`
                          : undefined
                      }
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [property]: event.target.value,
                        }))
                      }
                      placeholder="Describe the detail you would correct."
                    />
                    {error === property && (
                      <span
                        className="field-error"
                        id={`correction-error-${property}`}
                        role="alert"
                      >
                        Add a short correction before saving.
                      </span>
                    )}
                  </label>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => correct(property)}
                    >
                      Save correction
                    </button>
                    <button
                      type="button"
                      className="button quiet"
                      onClick={() => cancelCorrection(property)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="panel review-footer split">
        <div>
          <p className="eyebrow">
            {count === 4 ? "Review complete" : "Publication on hold"}
          </p>
          <h2>
            {count === 4
              ? "Your listing is ready for a preview."
              : `${4 - count} finding${4 - count === 1 ? "" : "s"} still need your decision.`}
          </h2>
          <p className="muted">
            {count === 4
              ? "Review your details and how the evidence will appear to buyers."
              : "All four findings need a decision. Uncertainty is an acceptable answer."}
          </p>
          {count < 4 && (
            <button
              type="button"
              className="button quiet"
              onClick={() => setAppeal(true)}
            >
              Check review readiness
            </button>
          )}
          {appeal && count < 4 && (
            <div className="notice" role="status">
              <strong>Review readiness checked.</strong>
              <p>
                The review is incomplete, so publication stays on hold. Finish
                the remaining decisions above, then return to your listing
                preview. No support request is sent in this walkthrough.
              </p>
            </div>
          )}
        </div>
        <Link
          className={`button ${count === 4 ? "primary" : "secondary"}`}
          href="/sell/publish"
        >
          {count === 4 ? "Preview & publish" : "Check publication readiness"}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <StorageNotice />
    </section>
  );
}

export function PublishPage() {
  const { state, dispatch } = useStore();
  const listing = draftListing(state);
  if (!state.captureComplete || reviewCount(state) !== 4) return <Recovery />;
  return (
    <section className="page publish-page">
      <div className="route-topline">
        <Link className="back-link" href="/sell/review">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to review
        </Link>
        <span className="tag">
          {state.published ? "Published" : "Ready to publish"}
        </span>
      </div>
      <p className="eyebrow">
        {state.published ? "A new second life" : "One last look"}
      </p>
      <h1>
        {state.published ? (
          <>
            Your listing is live.
            <br />
            <em>Let the next chapter begin.</em>
          </>
        ) : (
          <>Ready to pass it on?</>
        )}
      </h1>
      <p className="lede">
        {state.published
          ? "Your details, review decisions and seller corrections are now part of the buyer-facing listing."
          : "This is the picture buyers will get: your details, the source observations, and your review of each finding."}
      </p>
      {state.published && (
        <p className="notice success-notice" role="status">
          <CheckCircle size={22} aria-hidden="true" />
          Listing published. Your review is visible to buyers.
        </p>
      )}
      <div className="split publish-layout">
        <div className="publish-preview">
          <GarmentViewer listing={listing} mode="neutral" />
        </div>
        <div className="panel stack">
          <p className="eyebrow">Listing preview</p>
          <h2>{listing.name}</h2>
          <p className="publish-price">
            {money(listing.price)}
            <span className="tag">Size {listing.size}</span>
          </p>
          <p>{listing.description || "No description added."}</p>
          <div className="summary">
            <div>
              <span>Condition</span>
              <strong>{listing.condition}</strong>
            </div>
            <div>
              <span>Seller</span>
              <strong>{listing.seller}</strong>
            </div>
            <div>
              <span>Evidence review</span>
              <strong>4 of 4 complete</strong>
            </div>
          </div>
          <p className="muted small">
            Visible condition only. Odor, hygiene, hidden damage, authenticity
            and exact softness are not established by this evidence.
          </p>
          {state.published ? (
            <>
              <Link className="button primary" href="/listing/cloud-poplin">
                View your listing
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="button secondary" href="/sell">
                Back to workspace
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button primary"
                onClick={() => dispatch({ type: "PUBLISH" })}
              >
                Publish listing
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <Link className="button quiet" href="/sell">
                Edit listing details
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="panel stack publish-evidence">
        <p className="eyebrow">Your review, carried forward</p>
        <h2>What buyers will see.</h2>
        <div className="review-summary-grid">
          {properties.map((property) => {
            const decision = state.decisions[property];
            const evidence = listing.evidence.find(
              (item) => item.property === property,
            );
            return (
              <article className="review-summary-card" key={property}>
                <div className="review-card-heading">
                  <h3>{property}</h3>
                  <span className="tag">{statusLabel(decision.status)}</span>
                </div>
                <p className="muted">{evidence?.observation}</p>
                {decision.status === "corrected" && (
                  <p className="seller-note">
                    <strong>Seller correction:</strong> {decision.note}
                  </p>
                )}
                {decision.status === "unsure" && (
                  <p className="seller-note">
                    The seller is unsure. This finding remains uncertain.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <StorageNotice />
    </section>
  );
}

export function CheckoutPage() {
  const { state, dispatch } = useStore();
  const [payment, setPayment] = useState<"success" | "declined">("success");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLTextAreaElement>(null);
  const selectedIds = checkoutItems(state);
  const items = selectedIds
    .map((id) => getListing(state, id))
    .filter((listing): listing is Listing => Boolean(listing));
  const buyingNow = state.checkoutMode === "buy-now";
  const unavailable = items.filter(
    (listing) => state.availability[listing.id] !== "active",
  );
  const subtotal = items.reduce((sum, listing) => sum + listing.price, 0);
  const shipping = items.length ? 5 : 0;

  function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2)
      nextErrors.fullName = "Enter your full name.";
    if (address.trim().length < 5)
      nextErrors.address =
        "Enter a delivery address, including city and postal code.";
    setErrors(nextErrors);
    if (nextErrors.fullName) {
      nameInput.current?.focus();
      return;
    }
    if (nextErrors.address) {
      addressInput.current?.focus();
      return;
    }
    if (
      !items.length ||
      items.length !== selectedIds.length ||
      unavailable.length
    ) {
      setLocalError(
        "Your selection changed. Remove unavailable pieces before continuing.",
      );
      return;
    }
    setLocalError("");
    dispatch({ type: "CHECKOUT", payment });
    if (payment === "success") navigate("/orders");
  }

  if (!items.length)
    return (
      <section className="page checkout-page">
        <p className="eyebrow">{buyingNow ? "Your checkout" : "Your bag"}</p>
        <h1>
          {buyingNow ? (
            <>
              Another good find
              <br />
              <em>is waiting for you.</em>
            </>
          ) : (
            <>
              A little room
              <br />
              <em>for something familiar.</em>
            </>
          )}
        </h1>
        <div className="panel stack empty-state">
          <Package size={42} aria-hidden="true" />
          <h2>
            {buyingNow
              ? "This piece is no longer available."
              : "Your bag is empty."}
          </h2>
          <p className="muted">
            {buyingNow
              ? "Your other bag items are still saved. Return to them or explore the collection."
              : "Find a piece that feels right, then bring it here."}
          </p>
          <Link className="button primary" href="/shop">
            Explore the collection
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {buyingNow && state.bag.length > 0 && (
            <Link
              className="button secondary"
              href="/checkout"
              onClick={() => dispatch({ type: "BAG_VIEW" })}
            >
              Return to your bag
            </Link>
          )}
          {state.orders.length > 0 && (
            <Link className="button quiet" href="/orders">
              See your orders
            </Link>
          )}
        </div>
      </section>
    );

  return (
    <section className="page checkout-page">
      <div className="route-topline">
        <Link
          className="back-link"
          href={buyingNow ? `/listing/${items[0].id}` : "/shop"}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {buyingNow ? "Back to this piece" : "Keep browsing"}
        </Link>
        <span className="tag">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </span>
      </div>
      <p className="eyebrow">{buyingNow ? "Your checkout" : "Your bag"}</p>
      <h1>
        A good find.
        <br />
        <em>A new beginning.</em>
      </h1>
      <p className="lede">One of each, ready for another chapter.</p>
      <form className="checkout-grid" onSubmit={checkout} noValidate>
        <div className="stack">
          <div className="panel bag-list">
            {items.map((listing) => (
              <article className="bag-item" key={listing.id}>
                <Link
                  className="bag-image"
                  href={`/listing/${listing.id}`}
                  style={{ background: listing.background }}
                >
                  <img src={listing.poster} alt={listing.name} />
                </Link>
                <div className="bag-item-details">
                  <p className="eyebrow">{listing.category}</p>
                  <h2>
                    <Link href={`/listing/${listing.id}`}>{listing.name}</Link>
                  </h2>
                  <p className="muted">
                    Size {listing.size} · {listing.condition}
                  </p>
                  <strong>{money(listing.price)}</strong>
                  {state.availability[listing.id] !== "active" && (
                    <p className="field-error" role="alert">
                      This piece is{" "}
                      {state.availability[listing.id] ?? "unavailable"}.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="button quiet bag-remove"
                  aria-label={
                    buyingNow
                      ? "Return to your bag"
                      : `Remove ${listing.name} from bag`
                  }
                  onClick={() =>
                    dispatch(
                      buyingNow
                        ? { type: "BAG_VIEW" }
                        : { type: "BAG_REMOVE", id: listing.id },
                    )
                  }
                >
                  {buyingNow ? (
                    <ArrowLeft size={18} aria-hidden="true" />
                  ) : (
                    <X size={18} aria-hidden="true" />
                  )}
                  <span>{buyingNow ? "Back to bag" : "Remove"}</span>
                </button>
              </article>
            ))}
          </div>
          <div className="panel stack checkout-delivery">
            <p className="eyebrow">Where it goes next</p>
            <h2>Delivery details</h2>
            <div className="checkout-field-grid">
              <label className="field" htmlFor="checkout-full-name">
                <span id="checkout-name-label">Full name</span>
                <input
                  ref={nameInput}
                  id="checkout-full-name"
                  name="full-name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={fullName}
                  aria-labelledby="checkout-name-label"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={
                    errors.fullName ? "checkout-name-error" : undefined
                  }
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setErrors((current) => ({ ...current, fullName: "" }));
                  }}
                />
                {errors.fullName && (
                  <span
                    id="checkout-name-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.fullName}
                  </span>
                )}
              </label>
              <label className="field" htmlFor="checkout-address">
                <span id="checkout-address-label">Delivery address</span>
                <textarea
                  ref={addressInput}
                  id="checkout-address"
                  name="delivery-address"
                  autoComplete="street-address"
                  required
                  rows={3}
                  maxLength={300}
                  value={address}
                  aria-labelledby="checkout-address-label"
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={
                    errors.address
                      ? "checkout-address-error"
                      : "checkout-address-help"
                  }
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setErrors((current) => ({ ...current, address: "" }));
                  }}
                />
                <span id="checkout-address-help" className="muted small">
                  Include the street, city and postal code.
                </span>
                {errors.address && (
                  <span
                    id="checkout-address-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.address}
                  </span>
                )}
              </label>
            </div>
            <fieldset className="payment-options">
              <legend>Delivery method</legend>
              <label className="payment-option">
                <input
                  type="radio"
                  name="delivery-method"
                  value="standard"
                  checked
                  onChange={() => {}}
                />
                <span>
                  <strong>Standard delivery · $5</strong>
                  <span>Estimated arrival in 5–7 days</span>
                </span>
              </label>
            </fieldset>
            <fieldset className="payment-options checkout-payment-methods">
              <legend>Payment method</legend>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment-method"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span>
                  <strong>Card</strong>
                  <span>Choose a card payment</span>
                </span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment-method"
                  value="wallet"
                  checked={paymentMethod === "wallet"}
                  onChange={() => setPaymentMethod("wallet")}
                />
                <span>
                  <strong>Wallet</strong>
                  <span>Choose a digital wallet</span>
                </span>
              </label>
            </fieldset>
          </div>
          <div className="notice checkout-honesty">
            <ShieldCheck size={24} aria-hidden="true" />
            <div>
              <strong>A thoughtful secondhand purchase.</strong>
              <p>
                Review source evidence and seller notes before checking out.
              </p>
            </div>
          </div>
        </div>
        <aside className="panel stack checkout-summary">
          <p className="eyebrow">Almost yours</p>
          <h2>Order summary</h2>
          <div className="summary">
            <div>
              <span>Pieces</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Flat shipping</span>
              <strong>{money(shipping)}</strong>
            </div>
            <div className="summary-total">
              <span>Total · USD</span>
              <strong>{money(subtotal + shipping)}</strong>
            </div>
          </div>
          <details className="payment-demo-controls">
            <summary>Explore payment outcomes</summary>
            <fieldset className="payment-options">
              <legend>Payment outcome</legend>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment-outcome"
                  checked={payment === "success"}
                  onChange={() => setPayment("success")}
                />
                <span>
                  <strong>Successful payment</strong>
                  <span>Reserve the pieces and create an order.</span>
                </span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment-outcome"
                  checked={payment === "declined"}
                  onChange={() => setPayment("declined")}
                />
                <span>
                  <strong>Declined payment</strong>
                  <span>Keep your selection and try again.</span>
                </span>
              </label>
            </fieldset>
          </details>
          <p className="muted small">
            No payment is charged and no card details are collected.
          </p>
          {(state.paymentError || localError) && (
            <div className="notice error-notice" role="alert">
              <WarningCircle size={22} aria-hidden="true" />
              <div>
                <strong>
                  {localError
                    ? "Your selection needs a quick check."
                    : "The payment was declined."}
                </strong>
                <p>
                  {localError ||
                    "Your selection is unchanged. Choose successful payment above to try again."}
                </p>
              </div>
            </div>
          )}
          <button
            type="submit"
            className="button primary"
            disabled={unavailable.length > 0}
          >
            {payment === "success" ? "Place order" : "Try declined payment"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="muted small">
            {unavailable.length
              ? "Remove unavailable pieces to continue."
              : "Pieces are reserved after successful checkout."}
          </p>
        </aside>
      </form>
      <StorageNotice />
    </section>
  );
}

const orderSteps = [
  "reserved",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
] as const;
const orderCopy: Record<
  string,
  { label: string; title: string; description: string }
> = {
  reserved: {
    label: "Reserved",
    title: "A good find is on its way to a new story.",
    description:
      "Your pieces are reserved. The seller can now confirm the order.",
  },
  confirmed: {
    label: "Confirmed",
    title: "Your order is confirmed.",
    description:
      "The seller has confirmed the pieces and is getting them ready.",
  },
  packed: {
    label: "Packed",
    title: "All wrapped up.",
    description: "Your pieces are packed and ready for the next leg.",
  },
  shipped: {
    label: "Shipped",
    title: "The next chapter is getting closer.",
    description: "Your order is marked shipped in this demo.",
  },
  delivered: {
    label: "Delivered",
    title: "A new home. A new beginning.",
    description:
      "The pieces are yours. Let us know how they compared with what you expected.",
  },
  cancelled: {
    label: "Cancelled",
    title: "This order was cancelled.",
    description:
      "The pieces were released back to the collection. You can browse again whenever you are ready.",
  },
  expired: {
    label: "Reservation expired",
    title: "The reservation has ended.",
    description:
      "The pieces are available again. Return to the collection to start a new order.",
  },
  disputed: {
    label: "Issue reported",
    title: "Your order issue is recorded.",
    description:
      "Your note is saved with this order. No support message or refund is sent in this demo.",
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Today"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

export function OrdersPage() {
  const { state, dispatch } = useStore();
  const [disputing, setDisputing] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState("");
  const orders = [...state.orders].reverse();
  const latest = orders[0];

  function reportIssue(id: string) {
    const note = disputeNotes[id]?.trim();
    if (!note) {
      setError(id);
      return;
    }
    dispatch({ type: "ORDER_DISPUTE", id, note });
    setDisputing(null);
    setError("");
  }

  if (!latest)
    return (
      <section className="page orders-page">
        <p className="eyebrow">Your orders</p>
        <h1>
          Every piece
          <br />
          <em>has a next chapter.</em>
        </h1>
        <div className="panel stack empty-state">
          <Package size={42} aria-hidden="true" />
          <h2>No orders just yet.</h2>
          <p className="muted">
            Your order updates will appear here after checkout.
          </p>
          <Link className="button primary" href="/shop">
            Explore the collection
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {state.guided && <GuidedSeller />}
      </section>
    );

  return (
    <section className="page orders-page">
      <p className="eyebrow">Your orders</p>
      <h1>{orderCopy[latest.status].title}</h1>
      <p className="lede">{orderCopy[latest.status].description}</p>
      {latest.status === "reserved" && (
        <div className="notice success-notice" role="status">
          <CheckCircle size={22} aria-hidden="true" />
          <span>Order placed. Your pieces are reserved.</span>
        </div>
      )}
      <div className="stack order-list">
        {orders.map((order) => {
          const currentStep = orderSteps.indexOf(
            order.status as (typeof orderSteps)[number],
          );
          const orderItems = order.items.map((id) => {
            const snapshot = order.itemSnapshots?.find(
              (item) => item.id === id,
            );
            const listing = getListing(state, id);
            return {
              id,
              name:
                snapshot?.name ?? listing?.name ?? "Previously purchased piece",
              size: snapshot?.size ?? listing?.size,
              poster: snapshot?.poster ?? listing?.poster,
              condition: snapshot?.condition ?? listing?.condition,
              price: snapshot?.price,
              currentListing: Boolean(listing),
            };
          });
          const canAdvance = currentStep >= 0 && currentStep < 4;
          const canRelease =
            order.status === "reserved" || order.status === "confirmed";
          return (
            <article className="panel stack order-card" key={order.id}>
              <div className="order-card-heading">
                <div>
                  <p className="eyebrow">Order {order.id}</p>
                  <h2>{orderCopy[order.status].label}</h2>
                  <p className="muted small">
                    {formatDate(order.createdAt)} · {orderItems.length}{" "}
                    {orderItems.length === 1 ? "piece" : "pieces"}
                  </p>
                </div>
                <strong className="order-total">{money(order.total)}</strong>
              </div>
              {!order.itemSnapshots && (
                <p className="muted small">
                  This older receipt records the order total. Item details below
                  identify the current listings; their original unit prices were
                  not recorded.
                </p>
              )}
              <div className="order-items">
                {orderItems.map((item) => (
                  <article className="order-item" key={item.id}>
                    <span className="order-item-image">
                      {item.poster && <img src={item.poster} alt="" />}
                    </span>
                    <span className="order-item-copy">
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {item.size ? `Size ${item.size} · ` : ""}
                        {item.price !== undefined
                          ? money(item.price)
                          : "Unit price not recorded"}
                      </span>
                      {item.condition && (
                        <span className="muted small">{item.condition}</span>
                      )}
                    </span>
                    {item.currentListing && (
                      <Link
                        className="order-current-listing"
                        href={`/listing/${item.id}`}
                        aria-label={`View current listing for ${item.name}`}
                      >
                        Current listing
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
              {currentStep >= 0 ? (
                <ol
                  className="timeline order-progress"
                  aria-label="Order progress"
                >
                  {orderSteps.map((step, index) => (
                    <li
                      key={step}
                      className={
                        index < currentStep
                          ? "complete"
                          : index === currentStep
                            ? "current"
                            : ""
                      }
                      aria-current={index === currentStep ? "step" : undefined}
                    >
                      <span className="timeline-dot">
                        {index <= currentStep ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <strong>{orderCopy[step].label}</strong>
                      <span className="muted small">
                        {index < currentStep
                          ? "Complete"
                          : index === currentStep
                            ? "Current"
                            : "Next"}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="notice">
                  <Clock size={22} aria-hidden="true" />
                  <div>
                    <strong>{orderCopy[order.status].label}</strong>
                    <p>{orderCopy[order.status].description}</p>
                    {order.disputeNote && (
                      <p>
                        <strong>Your note:</strong> {order.disputeNote}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {(canAdvance || canRelease) && (
                <details className="order-demo-controls">
                  <summary>Explore order updates</summary>
                  <div className="stack">
                    <p className="muted small">
                      These controls simulate the next order update. No parcel,
                      notification or payment is sent.
                    </p>
                    <div className="order-action-grid">
                      {canAdvance && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            dispatch({ type: "ORDER_ADVANCE", id: order.id })
                          }
                        >
                          {order.status === "packed" ? (
                            <Truck size={18} aria-hidden="true" />
                          ) : (
                            <Package size={18} aria-hidden="true" />
                          )}
                          Mark{" "}
                          {orderCopy[
                            orderSteps[currentStep + 1]
                          ].label.toLowerCase()}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      )}
                      {canRelease && (
                        <>
                          <button
                            type="button"
                            className="button quiet"
                            onClick={() =>
                              dispatch({ type: "ORDER_CANCEL", id: order.id })
                            }
                          >
                            Cancel order
                          </button>
                          <button
                            type="button"
                            className="button quiet"
                            onClick={() =>
                              dispatch({ type: "ORDER_EXPIRE", id: order.id })
                            }
                          >
                            Expire reservation
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              )}
              {order.status === "delivered" && (
                <div className="order-feedback stack">
                  <p className="eyebrow">Now that it has arrived</p>
                  <h3>Did it feel as expected?</h3>
                  <p className="muted">
                    Compare your expectations with the garment you received.
                  </p>
                  {order.feedback ? (
                    <div className="notice success-notice" role="status">
                      <CheckCircle size={20} aria-hidden="true" />
                      <div>
                        <strong>
                          Feedback saved:{" "}
                          {order.feedback.fit === "as-expected"
                            ? "as expected"
                            : "different than expected"}
                          .
                        </strong>
                        {order.feedback.note && <p>{order.feedback.note}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="field" htmlFor={`feedback-${order.id}`}>
                        <span>A detail you noticed · optional</span>
                        <textarea
                          id={`feedback-${order.id}`}
                          rows={2}
                          maxLength={1000}
                          value={feedbackNotes[order.id] ?? ""}
                          onChange={(event) =>
                            setFeedbackNotes((current) => ({
                              ...current,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            dispatch({
                              type: "ORDER_FEEDBACK",
                              id: order.id,
                              fit: "as-expected",
                              note: feedbackNotes[order.id],
                            })
                          }
                        >
                          As expected
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            dispatch({
                              type: "ORDER_FEEDBACK",
                              id: order.id,
                              fit: "different",
                              note: feedbackNotes[order.id],
                            })
                          }
                        >
                          Different than expected
                        </button>
                      </div>
                    </>
                  )}
                  {disputing === order.id ? (
                    <div className="stack">
                      <label className="field" htmlFor={`dispute-${order.id}`}>
                        <span>Describe the order issue</span>
                        <textarea
                          id={`dispute-${order.id}`}
                          rows={3}
                          maxLength={1000}
                          value={disputeNotes[order.id] ?? ""}
                          aria-invalid={error === order.id}
                          aria-describedby={
                            error === order.id
                              ? `dispute-error-${order.id}`
                              : undefined
                          }
                          onChange={(event) =>
                            setDisputeNotes((current) => ({
                              ...current,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                        {error === order.id && (
                          <span
                            className="field-error"
                            role="alert"
                            id={`dispute-error-${order.id}`}
                          >
                            Add a short description of the issue.
                          </span>
                        )}
                      </label>
                      <p className="muted small">
                        Your note stays in this browser. It does not contact
                        support or request a refund.
                      </p>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => reportIssue(order.id)}
                        >
                          Save issue report
                        </button>
                        <button
                          type="button"
                          className="button quiet"
                          onClick={() => {
                            setDisputing(null);
                            setError("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button quiet"
                      onClick={() => setDisputing(order.id)}
                    >
                      <WarningCircle size={18} aria-hidden="true" />
                      Report an order issue
                    </button>
                  )}
                </div>
              )}
              {(order.status === "cancelled" || order.status === "expired") && (
                <Link className="button secondary" href="/shop">
                  Back to the collection
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
              <PropertyAftercare orderId={order.id} />
            </article>
          );
        })}
      </div>
      {state.guided ? (
        <GuidedSeller />
      ) : (
        <div className="orders-next split">
          <div>
            <p className="eyebrow">A different kind of second life</p>
            <h2>Have a piece to pass on?</h2>
            <p className="muted">
              Explore the seller side and see how a listing comes together.
            </p>
          </div>
          <Link className="button secondary" href="/sell/capture">
            Explore garment checks
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
      <StorageNotice />
    </section>
  );
}

function GuidedSeller() {
  return (
    <div className="panel guided-next split">
      <div>
        <p className="eyebrow">Explore both · The seller side</p>
        <h2>Now see the other side of the story.</h2>
        <p className="muted">
          Walk through the garment checks and review the details a buyer will
          see.
        </p>
      </div>
      <Link className="button primary" href="/sell/capture">
        Continue to seller capture
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
