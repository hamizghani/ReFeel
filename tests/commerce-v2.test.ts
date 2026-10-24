import { describe, expect, it } from "vitest";
import { initialState, transition } from "../src/domain";
import { receiptItems, validateCheckoutDetails } from "../src/CommercePages";

describe("checkout delivery validation", () => {
  it("rejects blank and whitespace-only delivery details", () => {
    expect(validateCheckoutDetails(" ", "    ")).toEqual({ fullName: "Enter your full name.", address: "Enter a delivery address, including city and postal code." });
  });
  it("accepts a full name and address and enforces bounded fields", () => {
    expect(validateCheckoutDetails(" Maya Stone ", " 42 Garden Street, Austin 78701 ")).toEqual({});
    expect(validateCheckoutDetails("x".repeat(101), "y".repeat(301))).toHaveProperty("fullName");
    expect(validateCheckoutDetails("Maya", "y".repeat(301))).toHaveProperty("address");
  });
});

describe("purchase-time receipt presentation", () => {
  it("renders original names, prices and photos after public listing details change", () => {
    let state = transition(initialState(), { type: "BAG_ADD", id: "cloud-poplin" });
    state = transition(state, { type: "CHECKOUT", payment: "success" });
    const order = state.orders[0];
    const original = order.itemSnapshots![0];
    state = { ...state, publishedSnapshot: { draft: { ...state.draft, name: "Changed after purchase", price: 99 }, decisions: state.decisions } };
    const displayed = receiptItems(order, state)[0];
    expect(displayed.name).toBe(original.name);
    expect(displayed.price).toBe(32);
    expect(displayed.poster).toBe(original.poster);
    expect(order.total).toBe(37);
  });
  it("does not invent an original item price for legacy receipts", () => {
    const state = initialState();
    const order = { id: "FAM-OLD", items: ["cloud-poplin"], total: 37, status: "delivered" as const, createdAt: "2026-10-13T12:00:00Z" };
    expect(receiptItems(order, state)[0].price).toBeUndefined();
  });
});
