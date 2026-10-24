import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle, Clock, CreditCard,
  EnvelopeSimple, FlowerLotus, MapPin, Package, Receipt, ShoppingBag,
  Truck, Wallet, WarningCircle, X,
} from "@phosphor-icons/react";
import {
  checkoutItems, getListing, money, PROPERTIES, SHIPPING,
  type AppState, type Listing, type Order, type OrderStatus, type Property,
} from "./domain";
import { coverFor } from "./media";
import { useStore } from "./store";
import { Link, navigate } from "./router";
import {
  emptyAftercareProperties, isAftercareComplete, transitionRetained,
  useRetainedState, type AftercareRecord, type ObservationChoice,
  type RetainedAction,
} from "./components/RetainedFlows";
import "./commerce.css";

export function validateCheckoutDetails(fullName: string, address: string) {
  const errors: Record<string, string> = {};
  if (fullName.trim().length < 2 || fullName.trim().length > 100)
    errors.fullName = "Enter your full name.";
  if (address.trim().length < 5 || address.trim().length > 300)
    errors.address = "Enter a delivery address, including city and postal code.";
  return errors;
}

/** A receipt uses its original details, including its original photograph. */
export function receiptItems(order: Order, state: AppState) {
  return order.items.map((id) => {
    const snapshot = order.itemSnapshots?.find((item) => item.id === id);
    const current = getListing(state, id);
    return {
      id,
      name: snapshot?.name ?? current?.name ?? "Previously purchased piece",
      size: snapshot?.size ?? current?.size,
      poster: snapshot?.poster ?? current?.poster,
      condition: snapshot?.condition ?? current?.condition,
      price: snapshot?.price,
      hasCurrentListing: Boolean(current),
    };
  });
}

function DateLabel({ value }: { value: string }) {
  const parsed = new Date(value);
  return <time dateTime={value}>{Number.isNaN(parsed.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed)}</time>;
}

function PersistenceNote({ available }: { available: boolean }) {
  return available ? null : <p className="commerce-warning" role="status"><WarningCircle size={20} aria-hidden="true" /> This browser cannot save changes. Keep this tab open to retain your order.</p>;
}

function CheckoutItem({ listing, buyingNow }: { listing: Listing; buyingNow: boolean }) {
  const { state, dispatch } = useStore();
  const availability = state.availability[listing.id];
  return <article className="commerce-checkout-item">
    <Link className="commerce-piece-photo" href={`/listing/${listing.id}`}><img src={listing.poster?.startsWith("/posters/") ? coverFor(listing.templateId || listing.id) : listing.poster} alt={listing.name} /></Link>
    <div className="commerce-piece-info">
      <p className="commerce-kicker">{listing.category} · from {listing.seller}</p>
      <h2><Link href={`/listing/${listing.id}`}>{listing.name}</Link></h2>
      <p className="commerce-muted">Size {listing.size} · {listing.color}</p>
      <strong className="commerce-item-price">{money(listing.price)}</strong>
      <p className="commerce-condition">{listing.condition}</p>
      <button className="commerce-text-button" type="button" onClick={() => dispatch(buyingNow ? { type: "BAG_VIEW" } : { type: "BAG_REMOVE", id: listing.id })} aria-label={buyingNow ? "Return to your bag" : `Remove ${listing.name} from bag`}>
        {buyingNow ? <ArrowLeft size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}{buyingNow ? "Back to bag" : "Remove"}
      </button>
      {availability !== "active" && <p className="commerce-field-error" role="alert">This piece is {availability ?? "unavailable"}. Remove it to continue.</p>}
    </div>
    <div className="commerce-measurement-check"><span>Measured flat</span><div>{listing.measurements.chest !== undefined && <span>Chest <strong>{listing.measurements.chest} cm</strong></span>}{listing.measurements.length !== undefined && <span>Length <strong>{listing.measurements.length} cm</strong></span>}<Link href={`/listing/${listing.id}`}>See details <ArrowRight size={14} aria-hidden="true" /></Link></div></div>
  </article>;
}

export function CheckoutPage() {
  const { state, dispatch, storageAvailable } = useStore();
  const [payment, setPayment] = useState<"success" | "declined">("success");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLTextAreaElement>(null);
  const selectedIds = checkoutItems(state);
  const items = selectedIds.map((id) => getListing(state, id)).filter((item): item is Listing => Boolean(item));
  const buyingNow = state.checkoutMode === "buy-now";
  const unavailable = items.some((item) => state.availability[item.id] !== "active") || items.length !== selectedIds.length;
  const subtotal = items.reduce((total, item) => total + item.price, 0);
  const total = subtotal + (items.length ? SHIPPING : 0);

  function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCheckoutDetails(fullName, address);
    setErrors(nextErrors);
    if (nextErrors.fullName) { nameInput.current?.focus(); return; }
    if (nextErrors.address) { addressInput.current?.focus(); return; }
    if (!items.length || unavailable) {
      setLocalError("Your selection changed. Remove unavailable pieces before continuing.");
      return;
    }
    setLocalError("");
    dispatch({ type: "CHECKOUT", payment, delivery: { fullName: fullName.trim(), address: address.trim() }, paymentMethod });
    if (payment === "success") navigate("/orders");
  }

  if (!items.length) return <section className="page commerce commerce-empty-page">
    <Link href="/shop" className="commerce-back"><ArrowLeft size={18} aria-hidden="true" /> Discover</Link>
    <div className="commerce-empty"><span className="commerce-empty-icon"><ShoppingBag size={38} aria-hidden="true" /></span><p className="commerce-kicker">{buyingNow ? "This piece has a new chapter" : "Your bag"}</p><h1>{buyingNow ? "Another good find is waiting." : "Room for something familiar."}</h1><p>{buyingNow ? "This piece is no longer available. Your other bag items are still saved." : "Your bag is empty. Find something you love and bring it here."}</p><Link className="button primary" href="/shop">Explore the collection <ArrowRight size={18} aria-hidden="true" /></Link>{buyingNow && state.bag.length > 0 && <button className="button secondary" onClick={() => dispatch({ type: "BAG_VIEW" })}>Return to your bag</button>}{state.orders.length > 0 && <Link className="commerce-text-button" href="/orders">See your orders</Link>}</div>
  </section>;

  return <section className="page commerce commerce-checkout">
    <div className="commerce-route-heading"><Link href={buyingNow ? `/listing/${items[0].id}` : "/shop"} className="commerce-back"><ArrowLeft size={17} aria-hidden="true" /> {buyingNow ? "Back to this piece" : "Keep browsing"}</Link><span>{items.length} {items.length === 1 ? "piece" : "pieces"}</span></div>
    <header className="commerce-page-heading"><p className="commerce-kicker">{buyingNow ? "Your checkout" : "Your bag"}</p><h1>A good find.<br /><em>A new beginning.</em></h1><p>Check the details, then give it a new home.</p></header>
    <ol className="commerce-checkout-steps" aria-label="Checkout steps"><li><Check size={15} aria-hidden="true" /> Your selection</li><li aria-current="step"><span>2</span> Delivery & payment</li><li><span>3</span> Confirmation</li></ol>
    {buyingNow && state.bag.length > 0 && <p className="commerce-hint"><ShoppingBag size={18} aria-hidden="true" /> You’re checking out this piece only. Your {state.bag.length} other bag {state.bag.length === 1 ? "item stays" : "items stay"} saved.</p>}
    <form className="commerce-checkout-grid" id="familiar-checkout" onSubmit={checkout} noValidate>
      <div className="commerce-checkout-content">
        <section className="commerce-card commerce-selection" aria-label="Your selected pieces"><div className="commerce-section-heading"><h2>Your selection</h2><span>One of each</span></div>{items.map((listing) => <CheckoutItem key={listing.id} listing={listing} buyingNow={buyingNow} />)}</section>
        <section className="commerce-card"><div className="commerce-section-heading"><h2><MapPin size={22} aria-hidden="true" /> Delivery details</h2></div>
          <div className="commerce-field-grid"><label className="commerce-field" htmlFor="checkout-full-name"><span id="checkout-name-label">Full name</span><input aria-labelledby="checkout-name-label" ref={nameInput} id="checkout-full-name" name="full-name" autoComplete="name" required maxLength={100} value={fullName} placeholder="Name of the recipient" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "checkout-name-error" : undefined} onChange={(event) => { setFullName(event.target.value); setErrors((current) => ({ ...current, fullName: "" })); }} />{errors.fullName && <span className="commerce-field-error" role="alert" id="checkout-name-error">{errors.fullName}</span>}</label>
          <label className="commerce-field" htmlFor="checkout-address"><span id="checkout-address-label">Delivery address</span><textarea aria-labelledby="checkout-address-label" ref={addressInput} id="checkout-address" name="delivery-address" autoComplete="street-address" required rows={3} maxLength={300} value={address} placeholder="Street, apartment, city and postal code" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "checkout-address-error" : "checkout-address-help"} onChange={(event) => { setAddress(event.target.value); setErrors((current) => ({ ...current, address: "" })); }} /><span className="commerce-muted commerce-small" id="checkout-address-help">Include your city and postal code.</span>{errors.address && <span className="commerce-field-error" role="alert" id="checkout-address-error">{errors.address}</span>}</label></div>
          <fieldset className="commerce-options"><legend>Delivery method</legend><label className="commerce-option commerce-option-selected"><input type="radio" name="delivery-method" value="standard" defaultChecked /><Truck size={23} aria-hidden="true" /><span><strong>Standard delivery</strong><small>Estimated arrival in 5–7 days</small></span><strong>{money(SHIPPING)}</strong></label></fieldset>
        </section>
        <section className="commerce-card"><div className="commerce-section-heading"><h2><CreditCard size={22} aria-hidden="true" /> Payment method</h2></div><fieldset className="commerce-payment-choice"><legend className="commerce-sr-only">Choose a payment method</legend><label className={paymentMethod === "card" ? "commerce-payment-button selected" : "commerce-payment-button"}><input type="radio" name="payment-method" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} /><CreditCard size={24} aria-hidden="true" /><strong>Card</strong>{paymentMethod === "card" && <CheckCircle size={19} aria-hidden="true" />}</label><label className={paymentMethod === "wallet" ? "commerce-payment-button selected" : "commerce-payment-button"}><input type="radio" name="payment-method" value="wallet" checked={paymentMethod === "wallet"} onChange={() => setPaymentMethod("wallet")} /><Wallet size={24} aria-hidden="true" /><strong>Wallet</strong>{paymentMethod === "wallet" && <CheckCircle size={19} aria-hidden="true" />}</label></fieldset><p className="commerce-prototype-note">Prototype checkout. No payment is charged and no card details are collected.</p></section>
      </div>
      <aside className="commerce-summary"><section className="commerce-card"><p className="commerce-kicker">Almost yours</p><h2>Order summary</h2><dl className="commerce-totals"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Standard delivery</dt><dd>{money(SHIPPING)}</dd></div><div className="commerce-total"><dt>Total <span>USD</span></dt><dd>{money(total)}</dd></div></dl><div className="commerce-checkout-reminder"><FlowerLotus size={24} aria-hidden="true" /><p>Secondhand, with a little more understanding.<br /><Link href={`/listing/${items[0].id}/evidence`}>Take one last look at the details.</Link></p></div>
          {(state.paymentError || localError) && <div className="commerce-warning" role="alert"><WarningCircle size={21} aria-hidden="true" /><div><strong>{localError ? "Your selection needs a check." : "Your payment was declined."}</strong><p>{localError || "Your details and selection are saved. Choose the successful outcome below and try again."}</p></div></div>}
          <div className="commerce-pay-dock"><span className="commerce-pay-total"><small>Total · USD</small><strong>{money(total)}</strong></span><button type="submit" className="button primary commerce-pay-button" disabled={unavailable}>{payment === "success" ? "Place order" : "Try declined payment"}<ArrowRight size={18} aria-hidden="true" /></button></div>
          <p className="commerce-muted commerce-small">{unavailable ? "Remove unavailable pieces to continue." : "Your pieces are reserved after you place the order."}</p>
        </section><details className="commerce-demo-controls"><summary>Explore payment outcomes</summary><fieldset className="commerce-options"><legend>Payment outcome</legend><label className="commerce-option"><input type="radio" name="payment-outcome" checked={payment === "success"} onChange={() => setPayment("success")} /><span><strong>Successful payment</strong><small>Reserve the pieces and create an order.</small></span></label><label className="commerce-option"><input type="radio" name="payment-outcome" checked={payment === "declined"} onChange={() => setPayment("declined")} /><span><strong>Declined payment</strong><small>Keep your details and selection to try again.</small></span></label></fieldset></details><PersistenceNote available={storageAvailable} /></aside>
    </form>
  </section>;
}

const ORDER_STEPS: OrderStatus[] = ["reserved", "confirmed", "packed", "shipped", "delivered"];
const ORDER_COPY: Record<OrderStatus, { label: string; heading: string; description: string }> = {
  reserved: { label: "Reserved", heading: "Your good find is reserved.", description: "Your order is placed. The seller’s confirmation comes next." },
  confirmed: { label: "Confirmed", heading: "It’s yours for the next chapter.", description: "The seller has confirmed your order and is getting the pieces ready." },
  packed: { label: "Packed", heading: "Wrapped up and ready.", description: "Your pieces are packed. Dispatch is the next step." },
  shipped: { label: "Shipped", heading: "A little closer to home.", description: "This order is marked shipped. Delivery is the next step." },
  delivered: { label: "Delivered", heading: "A new home. A familiar feeling.", description: "Take a closer look at what arrived. Your feedback is optional." },
  cancelled: { label: "Cancelled", heading: "This order was cancelled.", description: "The pieces were returned to the collection. You can browse again whenever you like." },
  expired: { label: "Reservation expired", heading: "The reservation has ended.", description: "The pieces were returned to the collection. Start a new order if they are still available." },
  disputed: { label: "Issue reported", heading: "Your concern is recorded.", description: "Your note is saved with this order. This prototype does not contact support or process refunds." },
};
const PROPERTY_LABELS: Record<Property, string> = { Drape: "How it hangs", Movement: "How it moves", Stretch: "Stretch & return", Surface: "Fabric details" };

function ArrivalReflection({ order }: { order: Order }) {
  const { state, dispatch } = useStore();
  const { state: retained, setState, storageAvailable } = useRetainedState();
  const [generalNote, setGeneralNote] = useState("");
  const [error, setError] = useState("");
  const record: AftercareRecord = retained.aftercare[order.id] ?? { status: "draft", properties: emptyAftercareProperties() };
  const act = (action: RetainedAction) => setState((current) => transitionRetained(current, action));
  return <section className="commerce-arrival">
    <div className="commerce-card"><p className="commerce-kicker">Now that it has arrived</p><h2>Does it feel as you expected?</h2><p className="commerce-muted">Let your own experience lead. A different feel is just as useful to record.</p>{order.feedback ? <div className="commerce-success" role="status"><CheckCircle size={21} aria-hidden="true" /><div><strong>{order.feedback.fit === "as-expected" ? "As expected" : "Different from expected"}</strong>{order.feedback.note && <p>{order.feedback.note}</p>}</div></div> : order.status === "disputed" ? <p className="commerce-muted commerce-small">Your issue is recorded. You can still save the optional property reflection below.</p> : <><label className="commerce-field" htmlFor={`feedback-${order.id}`}><span>A detail you noticed · optional</span><textarea id={`feedback-${order.id}`} rows={2} maxLength={1000} value={generalNote} onChange={(event) => setGeneralNote(event.target.value)} placeholder="What stood out when you tried it?" /></label><div className="commerce-feedback-actions"><button className="button secondary" onClick={() => dispatch({ type: "ORDER_FEEDBACK", id: order.id, fit: "as-expected", note: generalNote })}>As expected</button><button className="button secondary" onClick={() => dispatch({ type: "ORDER_FEEDBACK", id: order.id, fit: "different", note: generalNote })}>Different than expected</button></div></>}</div>
    <details className="commerce-card commerce-property-reflection"><summary><span><FlowerLotus size={23} aria-hidden="true" /> Compare four properties after arrival</span><span className="commerce-muted commerce-small">Optional</span></summary><p className="commerce-muted">Record what you expected and what you noticed. You can choose “I couldn’t assess this” or skip the reflection.</p>{record.status === "draft" ? <form onSubmit={(event) => { event.preventDefault(); if (!isAftercareComplete(record)) { setError("Add an expectation and choose an observation for each property. Describe any difference, or skip for now."); return; } act({ type: "AFTERCARE_SAVE", orderId: order.id, now: new Date().toISOString() }); setError(""); }}>
      <div className="commerce-reflection-grid">{PROPERTIES.map((property, index) => { const value = record.properties[property]; return <fieldset className="commerce-reflection-property" key={property}><legend><span>{index + 1}</span>{PROPERTY_LABELS[property]}</legend><label className="commerce-field"><span>What you expected</span><input maxLength={3000} value={value.expected} placeholder="Your expectation, or none" onChange={(event) => act({ type: "AFTERCARE_EDIT", orderId: order.id, property, value: { ...value, expected: event.target.value } })} /></label><label className="commerce-field"><span>What you noticed</span><select value={value.observed} onChange={(event) => act({ type: "AFTERCARE_EDIT", orderId: order.id, property, value: { ...value, observed: event.target.value as ObservationChoice } })}><option value="">Choose an observation</option><option value="as-expected">As expected</option><option value="different">Different from expected</option><option value="not-observed">I couldn’t assess this</option></select></label>{value.observed === "different" && <label className="commerce-field"><span>What was different?</span><textarea rows={2} maxLength={1000} value={value.note} onChange={(event) => act({ type: "AFTERCARE_EDIT", orderId: order.id, property, value: { ...value, note: event.target.value } })} /></label>}</fieldset>; })}</div>{error && <p className="commerce-field-error" role="alert">{error}</p>}<div className="commerce-feedback-actions"><button className="button primary" type="submit">Save property feedback <Check size={17} aria-hidden="true" /></button><button className="button quiet" type="button" onClick={() => { act({ type: "AFTERCARE_SKIP", orderId: order.id, now: new Date().toISOString() }); setError(""); }}>Skip for now</button></div>
    </form> : record.status === "skipped" ? <div className="commerce-reflection-saved"><p role="status">Property feedback skipped. Come back whenever you’re ready.</p><button className="button secondary" onClick={() => act({ type: "AFTERCARE_REOPEN", orderId: order.id })}>Return to property feedback</button></div> : <div className="commerce-reflection-saved"><p className="commerce-success" role="status"><CheckCircle size={21} aria-hidden="true" /> Your four-property reflection is saved.</p><dl>{PROPERTIES.map((property) => <div key={property}><dt>{PROPERTY_LABELS[property]}</dt><dd><span>Expected: {record.properties[property].expected}</span><strong>{record.properties[property].observed === "as-expected" ? "As expected" : record.properties[property].observed === "different" ? "Different from expected" : "Could not assess"}</strong>{record.properties[property].note && <span>{record.properties[property].note}</span>}</dd></div>)}</dl></div>}<PersistenceNote available={storageAvailable} /></details>
    <div className="commerce-reference-invite"><FlowerLotus size={25} aria-hidden="true" /><div><h3>Keep a familiar starting point.</h3><p>Photograph something you own to find pieces with similar fabric details next time.</p><div className="commerce-reference-actions">{order.itemSnapshots?.map((item) => <button className="button secondary" key={item.id} onClick={() => { dispatch({ type: "REFERENCE_FROM_ORDER", orderId: order.id, itemId: item.id }); navigate("/wardrobe"); }}>Save {order.items.length === 1 ? "this piece" : item.name} as a reference <ArrowRight size={16} aria-hidden="true" /></button>)}<Link className="commerce-text-button" href="/wardrobe">Go to your private wardrobe <ArrowRight size={16} aria-hidden="true" /></Link></div></div></div>
    {state.referenceAvailable && <p className="commerce-muted commerce-small">Your existing private references stay separate from your feedback.</p>}
  </section>;
}

function OrderTimeline({ order }: { order: Order }) {
  const currentStep = ORDER_STEPS.indexOf(order.status);
  return <section className="commerce-card"><div className="commerce-section-heading"><h2><Truck size={23} aria-hidden="true" /> Order journey</h2><span className={`commerce-status commerce-status-${order.status}`}>{ORDER_COPY[order.status].label}</span></div>{currentStep >= 0 ? <ol className="commerce-timeline" aria-label="Order progress">{ORDER_STEPS.map((step, index) => <li key={step} className={index < currentStep ? "complete" : index === currentStep ? "current" : ""} aria-current={index === currentStep ? "step" : undefined}><span className="commerce-timeline-dot">{index <= currentStep ? <Check size={15} aria-hidden="true" /> : index + 1}</span><div><strong>{ORDER_COPY[step].label}</strong><p>{index < currentStep ? "Complete" : index === currentStep ? ORDER_COPY[step].description : "Next step"}</p></div>{index === currentStep && <span className="commerce-current-label">Current</span>}</li>)}</ol> : <div className="commerce-terminal-state"><Clock size={28} aria-hidden="true" /><h3>{ORDER_COPY[order.status].label}</h3><p>{ORDER_COPY[order.status].description}</p>{order.disputeNote && <blockquote>{order.disputeNote}</blockquote>}{["cancelled", "expired"].includes(order.status) && <Link className="button secondary" href="/shop">Return to the collection <ArrowRight size={16} aria-hidden="true" /></Link>}</div>}</section>;
}

function OrderActions({ order }: { order: Order }) {
  const { dispatch } = useStore();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const step = ORDER_STEPS.indexOf(order.status);
  const canAdvance = step >= 0 && step < ORDER_STEPS.length - 1;
  const canRelease = ["reserved", "confirmed"].includes(order.status);
  return <>
    {canRelease && <section className="commerce-order-actions">{confirmCancel ? <div className="commerce-card commerce-cancellation"><h3>Cancel this order?</h3><p>Your pieces will return to the collection. This prototype does not process a payment or refund.</p><div className="commerce-feedback-actions"><button className="button secondary" onClick={() => { dispatch({ type: "ORDER_CANCEL", id: order.id }); setConfirmCancel(false); }}>Yes, cancel order</button><button className="button quiet" onClick={() => setConfirmCancel(false)}>Keep order</button></div></div> : <button className="commerce-text-button" onClick={() => setConfirmCancel(true)}>Cancel order</button>}</section>}
    {order.status === "delivered" && <section className="commerce-card commerce-issue-card"><WarningCircle size={25} aria-hidden="true" /><div><h3>Something doesn’t look right?</h3><p>Record a missing detail, unexpected damage or another concern.</p>{showIssue ? <form onSubmit={(event) => { event.preventDefault(); if (!note.trim()) { setError("Describe the issue before submitting."); return; } dispatch({ type: "ORDER_DISPUTE", id: order.id, note }); setShowIssue(false); setError(""); }}><label className="commerce-field" htmlFor={`dispute-${order.id}`}><span>Describe the order issue</span><textarea id={`dispute-${order.id}`} rows={3} maxLength={2000} value={note} aria-invalid={Boolean(error)} aria-describedby={error ? `dispute-error-${order.id}` : undefined} onChange={(event) => { setNote(event.target.value); setError(""); }} /></label>{error && <p className="commerce-field-error" id={`dispute-error-${order.id}`} role="alert">{error}</p>}<div className="commerce-feedback-actions"><button className="button primary" type="submit">Submit issue</button><button className="button quiet" type="button" onClick={() => setShowIssue(false)}>Close</button></div><p className="commerce-muted commerce-small">Your note is saved locally. No support message or refund is sent.</p></form> : <button className="button secondary" onClick={() => setShowIssue(true)}>Report an issue <ArrowRight size={16} aria-hidden="true" /></button>}</div></section>}
    {canAdvance && <details className="commerce-demo-controls"><summary>Explore order updates</summary><p className="commerce-muted commerce-small">These controls simulate the next update. No parcel, notification or payment is sent.</p><div className="commerce-feedback-actions"><button className="button secondary" onClick={() => dispatch({ type: "ORDER_ADVANCE", id: order.id })}>Mark {ORDER_COPY[ORDER_STEPS[step + 1]].label.toLowerCase()} <ArrowRight size={16} aria-hidden="true" /></button>{canRelease && <button className="button quiet" onClick={() => dispatch({ type: "ORDER_EXPIRE", id: order.id })}>Expire reservation</button>}</div></details>}
  </>;
}

function OrderDetail({ order }: { order: Order }) {
  const { state, storageAvailable } = useStore();
  const [tab, setTab] = useState<"tracking" | "receipt" | "arrival">("tracking");
  const items = receiptItems(order, state);
  const hasArrival = ["delivered", "disputed"].includes(order.status);
  const activeTab = tab === "arrival" && !hasArrival ? "tracking" : tab;
  const savedSubtotal = order.itemSnapshots ? order.itemSnapshots.reduce((sum, item) => sum + item.price, 0) : undefined;
  function tabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = hasArrival ? ["tracking", "receipt", "arrival"] as const : ["tracking", "receipt"] as const;
    const current = tabs.findIndex((value) => value === activeTab);
    let index = current;
    if (event.key === "ArrowRight") index = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[index]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[index]?.focus();
  }
  return <article className="commerce-order-detail">
    <header className="commerce-order-heading"><div><p className="commerce-kicker">Order {order.id}</p><h2>{ORDER_COPY[order.status].heading}</h2><p className="commerce-muted"><DateLabel value={order.createdAt} /> · {items.length} {items.length === 1 ? "piece" : "pieces"}</p></div><strong className="commerce-order-total">{money(order.total)}</strong></header>
    {order.status === "reserved" && <p className="commerce-success" role="status"><CheckCircle size={22} aria-hidden="true" /> Order placed. Your pieces are reserved.</p>}
    <div className="commerce-order-tabs" role="tablist" aria-label="Order details" onKeyDown={tabKeyDown}><button role="tab" tabIndex={activeTab === "tracking" ? 0 : -1} id={`tracking-tab-${order.id}`} aria-controls={`order-panel-${order.id}`} aria-selected={activeTab === "tracking"} onClick={() => setTab("tracking")}>Tracking</button><button role="tab" tabIndex={activeTab === "receipt" ? 0 : -1} id={`receipt-tab-${order.id}`} aria-controls={`order-panel-${order.id}`} aria-selected={activeTab === "receipt"} onClick={() => setTab("receipt")}>Receipt</button>{hasArrival && <button role="tab" tabIndex={activeTab === "arrival" ? 0 : -1} id={`arrival-tab-${order.id}`} aria-controls={`order-panel-${order.id}`} aria-selected={activeTab === "arrival"} onClick={() => setTab("arrival")}>After arrival</button>}</div>
    <div className="commerce-order-grid" id={`order-panel-${order.id}`} role="tabpanel" aria-labelledby={`${activeTab}-tab-${order.id}`}>
      <aside className="commerce-purchase-card"><p className="commerce-kicker">Your pieces</p>{items.map((item) => <article className="commerce-purchased-piece" key={item.id}><div className="commerce-purchase-photo">{item.poster ? <img src={item.poster} alt={item.name} /> : <Package size={46} aria-hidden="true" />}<span className={`commerce-status commerce-status-${order.status}`}>{ORDER_COPY[order.status].label}</span></div><div className="commerce-purchase-title"><h3>{item.name}</h3><strong>{item.price !== undefined ? money(item.price) : "Not recorded"}</strong></div><p className="commerce-muted">{item.size && `Size ${item.size} · `}{item.condition}</p>{item.hasCurrentListing && <Link className="commerce-text-button" href={`/listing/${item.id}`} aria-label={`View current listing for ${item.name}`}>Current listing <ArrowRight size={15} aria-hidden="true" /></Link>}</article>)}<div className="commerce-receipt-note"><Receipt size={23} aria-hidden="true" /><div><strong>Details from your purchase</strong><p>{order.itemSnapshots ? "The photos, price and garment details shown here stay as they were when you ordered." : "This older receipt records the total. Original item prices and photos were not recorded; current listing details identify your pieces."}</p></div></div></aside>
      <div className="commerce-order-main">{activeTab === "tracking" && <><OrderTimeline order={order} />{hasArrival && <div className="commerce-card commerce-arrival-callout"><FlowerLotus size={27} aria-hidden="true" /><div><h3>Get to know your good find.</h3><p>Record how it feels or tell us about an issue.</p><button className="button secondary" onClick={() => setTab("arrival")}>Reflect on your garment <ArrowRight size={16} aria-hidden="true" /></button></div></div>}</>}{activeTab === "tracking" && order.delivery && <section className="commerce-card commerce-delivery-snapshot"><MapPin size={22} aria-hidden="true" /><div><p className="commerce-kicker">Delivery to</p><strong>{order.delivery.fullName}</strong><p>{order.delivery.address}</p><span className="commerce-muted commerce-small">Standard delivery · {money(SHIPPING)}</span></div></section>}{activeTab === "receipt" && <section className="commerce-card commerce-receipt"><div className="commerce-section-heading"><h2><Receipt size={23} aria-hidden="true" /> Purchase receipt</h2><span>{order.id}</span></div><p className="commerce-muted"><DateLabel value={order.createdAt} /></p><dl className="commerce-totals">{items.map((item) => <div key={item.id}><dt>{item.name}</dt><dd>{item.price !== undefined ? money(item.price) : "Unit price not recorded"}</dd></div>)}{savedSubtotal !== undefined && <><div><dt>Subtotal</dt><dd>{money(savedSubtotal)}</dd></div><div><dt>Standard delivery</dt><dd>{money(order.total - savedSubtotal)}</dd></div></>}<div className="commerce-total"><dt>Recorded total <span>USD</span></dt><dd>{money(order.total)}</dd></div></dl><div className="commerce-receipt-details">{order.delivery && <div><strong>Delivery to</strong><p>{order.delivery.fullName}<br />{order.delivery.address}</p></div>}{order.paymentMethod && <div><strong>Payment method</strong><p>{order.paymentMethod === "card" ? "Card" : "Wallet"} · simulated payment</p></div>}</div><p className="commerce-prototype-note">A saved prototype receipt. No payment was charged.</p></section>}{activeTab === "arrival" && <ArrivalReflection order={order} />}<OrderActions order={order} /><div className="commerce-question-note"><EnvelopeSimple size={21} aria-hidden="true" /><p>Want another look? Open the current listing to review the seller’s notes and ask a question.</p></div><PersistenceNote available={storageAvailable} /></div>
    </div>
  </article>;
}

export function OrdersPage() {
  const { state } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const orders = [...state.orders].reverse();
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
  if (!selected) return <section className="page commerce commerce-empty-page"><div className="commerce-empty"><span className="commerce-empty-icon"><Package size={38} aria-hidden="true" /></span><p className="commerce-kicker">Your orders</p><h1>Every piece has a next chapter.</h1><p>No orders just yet. Your good finds and their updates will appear here after checkout.</p><Link className="button primary" href="/shop">Explore the collection <ArrowRight size={18} aria-hidden="true" /></Link></div></section>;
  return <section className="page commerce commerce-orders"><header className="commerce-orders-title"><div><p className="commerce-kicker">Your good finds</p><h1>New chapters.</h1></div><Link className="commerce-text-button" href="/shop">Keep discovering <ArrowRight size={17} aria-hidden="true" /></Link></header>{orders.length > 1 && <nav className="commerce-order-picker" aria-label="Choose an order">{orders.map((order) => { const first = receiptItems(order, state)[0]; return <button key={order.id} aria-current={selected.id === order.id ? "true" : undefined} className={selected.id === order.id ? "selected" : ""} onClick={() => setSelectedId(order.id)}>{first?.poster && <img src={first.poster} alt="" />}<span><strong>{order.id}</strong><small>{ORDER_COPY[order.status].label}</small></span></button>; })}</nav>}<OrderDetail key={selected.id} order={selected} /></section>;
}
