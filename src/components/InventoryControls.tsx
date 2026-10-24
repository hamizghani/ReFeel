import { useStore } from "../store";
export default function InventoryControls() {
  const { state, dispatch } = useStore();
  const status = state.availability["cloud-poplin"];
  const mutable =
    status === "active" || status === "paused" || status === "removed";
  return (
    <details className="order-demo-controls inventory-controls">
      <summary>Listing availability</summary>
      <section className="panel stack">
        <div className="spread">
          <h3>When buyers can choose this piece</h3>
          <span className="tag">
            {status === "active"
              ? "Available"
              : status === "removed"
                ? "Removed"
                : status === "paused"
                  ? "Paused"
                  : status === "reserved"
                    ? "Reserved"
                    : "Sold"}
          </span>
        </div>
        <p className="muted">
          Pausing keeps the piece visible with buying disabled. Removing it
          hides the public listing. Your draft and previous receipts stay
          intact.
        </p>
        {mutable ? (
          <div className="actions">
            {status === "active" ? (
              <button
                className="button secondary"
                onClick={() =>
                  dispatch({ type: "LISTING_PAUSE", id: "cloud-poplin" })
                }
              >
                Pause listing
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={() =>
                  dispatch({ type: "LISTING_RESUME", id: "cloud-poplin" })
                }
              >
                {status === "removed" ? "Restore listing" : "Resume listing"}
              </button>
            )}
            {status !== "removed" && (
              <button
                className="button quiet"
                onClick={() =>
                  dispatch({ type: "LISTING_REMOVE", id: "cloud-poplin" })
                }
              >
                Remove listing from marketplace
              </button>
            )}
          </div>
        ) : (
          <p className="notice">
            A {status} piece is already tied to an order. Availability changes
            follow its order timeline.
          </p>
        )}
      </section>
    </details>
  );
}
