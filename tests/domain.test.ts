import { describe, expect, it } from "vitest";
import { coverFor, mediaFor } from "../src/media";
import { CATALOG, REFERENCE, PROPERTIES, initialState, transition, getListing, allListings, rankMatches, money, sanitizeStoredState, checkoutItems, type AppState, type Property, } from "../src/domain";
function readyToPublish(): AppState {
    let state = initialState();
    for (let i = 0; i < 6; i++)
        state = transition(state, { type: "CAPTURE_NEXT" });
    for (const property of PROPERTIES)
        state = transition(state, {
            type: "DECIDE",
            property,
            status: "confirmed",
        });
    return state;
}
describe("authored listing fixtures", () => {
    it("contains twelve distinct active products and a separate private reference", () => {
        expect(CATALOG.map((x) => x.id)).toEqual([
            "cloud-poplin",
            "moss-knit",
            "airloom-linen",
            "petal-tee",
            "sunday-denim",
            "ink-trousers",
            "apricot-slip",
            "tide-shirt",
            "oat-vest",
            "lilac-wrap",
            "rose-jacket",
            "sage-skirt",
        ]);
        expect(allListings(initialState())).toHaveLength(12);
        expect(CATALOG.every((x) => initialState().availability[x.id] === "active")).toBe(true);
        expect(REFERENCE.id).toBe("my-blue-blouse");
        expect(CATALOG.some((x) => x.id === REFERENCE.id)).toBe(false);
    });
    it("retains grounded evidence and unknown measurement values", () => {
        for (const listing of [...CATALOG, REFERENCE]) {
            expect(listing.price).toBeGreaterThan(0);
            expect(listing.model).toBeUndefined();
            expect(listing.poster).toBe(coverFor(listing.id));
            expect(listing.evidence.map((x) => x.property).sort()).toEqual([...PROPERTIES].sort());
            for (const evidence of listing.evidence) {
                expect(evidence.source).toBeTruthy();
                expect(evidence.frame).toBeTruthy();
                expect(evidence.observation).toBeTruthy();
                expect(evidence.sellerStatus).toBe("unreviewed");
            }
        }
        expect(CATALOG.some((x) => x.measurements.sleeve === undefined)).toBe(true);
        expect(CATALOG.some((x) => x.evidence.some((e) => e.support === "unavailable"))).toBe(true);
    });
    it("names the hero garments exactly and describes their actual construction", () => {
        const [cloud, moss, airloom] = CATALOG;
        expect([cloud.name, moss.name, airloom.name]).toEqual([
            "Cloud Poplin Blouse",
            "Moss Knit Cardigan",
            "Airloom Linen Overshirt",
        ]);
        expect([cloud.category, moss.category, airloom.category]).toEqual([
            "Tops",
            "Knitwear",
            "Shirts",
        ]);
        expect(cloud.color).toBe("Warm ivory");
        expect(cloud.description).toMatch(/cotton.*collar.*button placket.*crisp hem/i);
        expect(moss.description).toMatch(/button.front cardigan/i);
        expect(airloom.description).toMatch(/patch pockets/i);
        expect(cloud.evidence.find((e) => e.property === "Surface")!.observation).toMatch(/right cuff/i);
    });
    it("keeps marketplace descriptions concise and matches known garment shapes", () => {
        for (const listing of [...CATALOG, REFERENCE]) {
            expect(listing.description).not.toMatch(/prepared|simulated|authored|fixture/i);
            expect(listing.description.length).toBeLessThan(300);
            for (const evidence of listing.evidence)
                expect(mediaFor(listing.id).photos.some(photo => photo.src === evidence.source)).toBe(true);
        }
        const wrap = CATALOG.find((x) => x.id === "lilac-wrap")!;
        expect(wrap.category).toBe("Tops");
        expect(wrap.description).toMatch(/wrap top/i);
        const rose = CATALOG.find((x) => x.id === "rose-jacket")!;
        expect(rose.description).toMatch(/button/i);
        expect(rose.description).not.toMatch(/zip/i);
    });
    it("formats USD consistently", () => expect(money(32.5)).toBe("$32.50"));
});
describe("immutable validated transitions", () => {
    it("rejects unknown, private, coming soon and unavailable bag items", () => {
        const state = initialState();
        for (const id of ["missing", "coming-soon-1", REFERENCE.id])
            expect(transition(state, { type: "BAG_ADD", id })).toBe(state);
        const reserved = {
            ...state,
            availability: {
                ...state.availability,
                "cloud-poplin": "reserved" as const,
            },
        };
        expect(transition(reserved, { type: "BAG_ADD", id: "cloud-poplin" })).toBe(reserved);
        const next = transition(state, { type: "BAG_ADD", id: "cloud-poplin" });
        expect(state.bag).toEqual([]);
        expect(next.bag).toEqual(["cloud-poplin"]);
        expect(transition(next, { type: "BAG_ADD", id: "cloud-poplin" })).toBe(next);
    });
    it("toggles saved products and rejects unknown references", () => {
        const state = initialState();
        const saved = transition(state, { type: "SAVE", id: "moss-knit" });
        expect(saved.saved).toEqual(["moss-knit"]);
        expect(transition(saved, { type: "SAVE", id: "moss-knit" }).saved).toEqual([]);
        expect(transition(state, { type: "SAVE", id: "soon" })).toBe(state);
        expect(transition(state, { type: "REFERENCE", id: "soon" })).toBe(state);
        expect(transition(state, { type: "REFERENCE", id: "moss-knit" })
            .selectedReference).toBe("moss-knit");
    });
    it("requires completed capture and decisions for every property before publishing", () => {
        const state = initialState();
        expect(transition(state, { type: "PUBLISH" })).toBe(state);
        let capture = state;
        for (let i = 0; i < 6; i++)
            capture = transition(capture, { type: "CAPTURE_NEXT" });
        expect(capture.captureStage).toBe(6);
        expect(capture.captureComplete).toBe(true);
        expect(transition(capture, { type: "PUBLISH" })).toBe(capture);
        expect(transition(readyToPublish(), { type: "PUBLISH" }).published).toBe(true);
    });
    it("requires correction notes and permits confirmed or unsure with empty notes", () => {
        const state = readyToPublish();
        expect(transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
        })).toBe(state);
        expect(transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
            note: "  ",
        })).toBe(state);
        const corrected = transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
            note: " Small scuff on the cuff. ",
        });
        expect(corrected.decisions.Surface).toEqual({
            status: "corrected",
            note: "Small scuff on the cuff.",
        });
        expect(transition(state, { type: "DECIDE", property: "Drape", status: "unsure" })
            .decisions.Drape.status).toBe("unsure");
    });
    it("bounds capture and clears affected decisions on retake", () => {
        const state = initialState();
        expect(transition(state, { type: "CAPTURE_BACK" })).toBe(state);
        expect(transition(state, { type: "CAPTURE_RETAKE", stage: 9 })).toBe(state);
        const published = transition(readyToPublish(), { type: "PUBLISH" });
        expect(transition(published, { type: "CAPTURE_NEXT" })).toBe(published);
        const retake = transition(published, { type: "CAPTURE_RETAKE", stage: 4 });
        expect(retake.captureStage).toBe(4);
        expect(retake.captureComplete).toBe(false);
        expect(retake.published).toBe(false);
        expect(retake.decisions.Drape).toBeUndefined();
        expect(retake.decisions.Movement).toBeUndefined();
        expect(retake.decisions.Surface.status).toBe("confirmed");
    });
    it("publishes draft details and review decisions onto existing Cloud Poplin", () => {
        let state = readyToPublish();
        state = transition(state, {
            type: "DRAFT",
            draft: {
                name: "Blue everyday blouse",
                price: 41,
                size: "M",
                description: "Carefully stored demo blouse.",
            },
        });
        state = transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
            note: "Visible cuff scuff.",
        });
        state = transition(state, {
            type: "DECIDE",
            property: "Drape",
            status: "unsure",
        });
        state = transition(state, { type: "PUBLISH" });
        const listing = getListing(state, "cloud-poplin")!;
        expect(listing.name).toBe("Blue everyday blouse");
        expect(listing.price).toBe(41);
        expect(listing.evidence.find((e) => e.property === "Surface")?.observation).toBe(CATALOG[0].evidence.find((e) => e.property === "Surface")?.observation);
        expect(listing.evidence.find((e) => e.property === "Surface")?.correctionNote).toBe("Visible cuff scuff.");
        expect(listing.evidence.find((e) => e.property === "Surface")?.sellerStatus).toBe("corrected");
        expect(listing.evidence.find((e) => e.property === "Drape")?.support).toBe("limited");
        expect(allListings(state)).toHaveLength(12);
        expect(CATALOG[0].name).toBe("Cloud Poplin Blouse");
    });
    it("rejects invalid draft values while retaining valid partial changes", () => {
        const state = initialState();
        const next = transition(state, {
            type: "DRAFT",
            draft: { price: -2, name: "New name" },
        });
        expect(next.draft.price).toBe(state.draft.price);
        expect(next.draft.name).toBe("New name");
        expect(transition(state, { type: "DRAFT", draft: { price: NaN } })).toBe(state);
    });
    it("preserves inventory and bag after a declined payment", () => {
        const state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        const next = transition(state, { type: "CHECKOUT", payment: "declined" });
        expect(next.bag).toEqual(state.bag);
        expect(next.availability).toEqual(state.availability);
        expect(next.orders).toEqual([]);
        expect(next.paymentError).toBe(true);
    });
    it("reserves checked out products once, creates a coherent order and advances to sold", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        state = transition(state, { type: "BAG_ADD", id: "cloud-poplin" });
        const next = transition(state, { type: "CHECKOUT", payment: "success" });
        expect(next.bag).toEqual([]);
        expect(next.orders).toHaveLength(1);
        expect(next.orders[0].items).toEqual(["moss-knit", "cloud-poplin"]);
        expect(next.orders[0].total).toBe(CATALOG[0].price + CATALOG[1].price + 5);
        expect(next.orders[0].status).toBe("reserved");
        expect(next.availability["moss-knit"]).toBe("reserved");
        expect(transition(next, { type: "CHECKOUT", payment: "success" })).toBe(next);
        const advanced = transition(next, {
            type: "ORDER_ADVANCE",
            id: next.orders[0].id,
        });
        expect(advanced.orders[0].status).toBe("confirmed");
        expect(advanced.availability["moss-knit"]).toBe("sold");
        expect(transition(advanced, { type: "BAG_ADD", id: "moss-knit" })).toBe(advanced);
    });
    it("prevents stale unavailable inventory from checkout", () => {
        const state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        const stale = {
            ...state,
            availability: { ...state.availability, "moss-knit": "sold" as const },
        };
        expect(transition(stale, { type: "CHECKOUT", payment: "success" })).toBe(stale);
    });
});
describe("property level matching", () => {
    it("returns three distinct active alternatives and excludes the reference", () => {
        const state = initialState();
        const reference = CATALOG[0];
        const matches = rankMatches(state, reference);
        expect(matches).toHaveLength(3);
        expect(new Set(matches.map((x) => x.listing.id)).size).toBe(3);
        expect(matches.some((x) => x.listing.id === reference.id)).toBe(false);
        for (const match of matches) {
            expect(match.properties).toHaveLength(4);
            expect(match).not.toHaveProperty("score");
            for (const p of match.properties) {
                expect(PROPERTIES).toContain(p.property);
                expect(p.explanation).toMatch(/source|frame|evidence|observ/i);
                expect(p.evidenceCount).toBeGreaterThanOrEqual(0);
                if (p.support === "unavailable")
                    expect(p.evidenceCount).toBe(0);
            }
        }
        const reserved = {
            ...state,
            availability: {
                ...state.availability,
                [matches[0].listing.id]: "reserved" as const,
            },
        };
        expect(rankMatches(reserved, reference).some((x) => x.listing.id === matches[0].listing.id)).toBe(false);
    });
    it("prioritizes a selected property without inventing absent mechanics", () => {
        const matches = rankMatches(initialState(), REFERENCE, "Stretch");
        expect(matches).toHaveLength(3);
        for (const match of matches)
            expect(match.properties.map((p) => p.property)).toEqual(PROPERTIES);
        expect(matches.some((x) => x.properties.some((p) => p.property === "Stretch" && p.support === "unavailable"))).toBe(true);
    });
});
describe("stored state sanitation", () => {
    it("recovers from unknown versions and invalid inputs", () => {
        expect(sanitizeStoredState(null)).toEqual(initialState());
        expect(sanitizeStoredState({ version: 2, saved: ["moss-knit"] })).toEqual(initialState());
    });
    it("filters unknown ids, invalid numbers and malformed review states", () => {
        const loaded = sanitizeStoredState({
            version: 1,
            saved: ["moss-knit", "soon", "moss-knit"],
            bag: ["cloud-poplin", "soon"],
            availability: { "cloud-poplin": "sold" },
            selectedReference: "soon",
            captureStage: 100,
            captureComplete: true,
            published: true,
            decisions: { Surface: { status: "corrected", note: "" } },
            draft: { name: "", price: -5, size: "XL", description: 12 },
            orders: [],
        });
        expect(loaded.saved).toEqual(["moss-knit"]);
        expect(loaded.bag).toEqual([]);
        expect(loaded.selectedReference).toBe(REFERENCE.id);
        expect(loaded.captureStage).toBe(0);
        expect(loaded.captureComplete).toBe(false);
        expect(loaded.published).toBe(false);
        expect(loaded.decisions).toEqual({});
        expect(loaded.draft.price).toBe(initialState().draft.price);
    });
    it("preserves valid seller and checkout state across a serialization roundtrip", () => {
        let state = transition(readyToPublish(), { type: "PUBLISH" });
        state = transition(state, { type: "BAG_ADD", id: "moss-knit" });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        expect(sanitizeStoredState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    });
});
describe("reference privacy and order aftercare", () => {
    it("renames, deletes and restores only the private reference", () => {
        let state = transition(initialState(), {
            type: "REFERENCE_RENAME",
            name: "My summer blouse",
        });
        expect(getListing(state, REFERENCE.id)?.name).toBe("My summer blouse");
        expect(allListings(state)).toHaveLength(12);
        state = transition(state, { type: "REFERENCE_DELETE" });
        expect(state.referenceAvailable).toBe(false);
        expect(state.selectedReference).toBe("");
        expect(getListing(state, REFERENCE.id)).toBeUndefined();
        expect(transition(state, { type: "REFERENCE", id: REFERENCE.id })).toBe(state);
        state = transition(state, { type: "REFERENCE_RESTORE" });
        expect(state.selectedReference).toBe(REFERENCE.id);
        expect(getListing(state, REFERENCE.id)?.name).toBe("My blue blouse");
    });
    it("cancels or expires a reservation and releases its inventory", () => {
        for (const type of ["ORDER_CANCEL", "ORDER_EXPIRE"] as const) {
            let state = transition(initialState(), {
                type: "BAG_ADD",
                id: "cloud-poplin",
            });
            state = transition(state, { type: "CHECKOUT", payment: "success" });
            const next = transition(state, { type, id: state.orders[0].id });
            expect(next.orders[0].status).toBe(type === "ORDER_CANCEL" ? "cancelled" : "expired");
            expect(next.availability["cloud-poplin"]).toBe("active");
            expect(transition(next, { type: "ORDER_ADVANCE", id: next.orders[0].id })).toBe(next);
        }
    });
    it("accepts delivery feedback and an explanatory dispute, but blocks cancellation after packing", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        const id = state.orders[0].id;
        expect(transition(state, {
            type: "ORDER_DISPUTE",
            id,
            note: "Not yet delivered",
        })).toBe(state);
        state = transition(state, { type: "ORDER_ADVANCE", id });
        state = transition(state, { type: "ORDER_ADVANCE", id });
        expect(state.orders[0].status).toBe("packed");
        expect(transition(state, { type: "ORDER_CANCEL", id })).toBe(state);
        state = transition(state, { type: "ORDER_ADVANCE", id });
        state = transition(state, { type: "ORDER_ADVANCE", id });
        expect(state.orders[0].status).toBe("delivered");
        const feedback = transition(state, {
            type: "ORDER_FEEDBACK",
            id,
            fit: "different",
            note: "Longer than expected.",
        });
        expect(feedback.orders[0].feedback).toEqual({
            fit: "different",
            note: "Longer than expected.",
        });
        expect(transition(state, { type: "ORDER_DISPUTE", id, note: "  " })).toBe(state);
        expect(transition(state, {
            type: "ORDER_DISPUTE",
            id,
            note: "Visible seam damage.",
        }).orders[0].status).toBe("disputed");
    });
    it("rejects malformed stored orders and coherent inventory cannot be double booked", () => {
        const loaded = sanitizeStoredState({
            version: 1,
            orders: [
                null,
                [],
                {
                    id: "x",
                    items: ["soon"],
                    total: 1,
                    status: "reserved",
                    createdAt: "bad",
                },
            ],
            availability: { "moss-knit": "reserved" },
            saved: { bad: true },
            bag: 12,
        });
        expect(loaded.orders).toEqual([]);
        expect(loaded.bag).toEqual([]);
        expect(loaded.saved).toEqual([]);
        expect(loaded.availability["moss-knit"]).toBe("active");
    });
});
describe("recovered-state edge cases", () => {
    it("never duplicates a recovered order id", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        state = { ...state, orders: [{ ...state.orders[0], id: "FAM-0002" }] };
        state = transition(state, { type: "BAG_ADD", id: "cloud-poplin" });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        expect(new Set(state.orders.map((x) => x.id)).size).toBe(2);
    });
    it("clears the comparison selection whenever the private reference is deleted", () => {
        const selected = transition(initialState(), {
            type: "REFERENCE",
            id: "moss-knit",
        });
        expect(transition(selected, { type: "REFERENCE_DELETE" }).selectedReference).toBe("");
    });
    it("keeps original source support when a seller marks an observation unsure", () => {
        let state = readyToPublish();
        state = transition(state, {
            type: "DECIDE",
            property: "Drape",
            status: "unsure",
        });
        state = transition(state, { type: "PUBLISH" });
        const evidence = getListing(state, "cloud-poplin")!.evidence.find((e) => e.property === "Drape")!;
        expect(evidence.support).toBe("limited");
        expect(evidence.originalSupport).toBe("supported");
    });
});
describe("candidate-only Buy now checkout", () => {
    it("derives checkout items from the selected mode", () => {
        const state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        expect(checkoutItems(state)).toEqual(["moss-knit"]);
        expect(checkoutItems({
            ...state,
            checkoutMode: "buy-now",
            buyNowId: "cloud-poplin",
        })).toEqual(["cloud-poplin"]);
    });
    it("purchases the selected candidate while preserving unrelated bag items", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        state = transition(state, { type: "BUY_NOW", id: "cloud-poplin" });
        expect(state.checkoutMode).toBe("buy-now");
        expect(state.buyNowId).toBe("cloud-poplin");
        expect(state.bag).toEqual(["moss-knit"]);
        const purchased = transition(state, {
            type: "CHECKOUT",
            payment: "success",
        });
        expect(purchased.orders[0].items).toEqual(["cloud-poplin"]);
        expect(purchased.orders[0].total).toBe(CATALOG[0].price + 5);
        expect(purchased.bag).toEqual(["moss-knit"]);
        expect(purchased.availability["moss-knit"]).toBe("active");
        expect(purchased.checkoutMode).toBe("bag");
        expect(purchased.buyNowId).toBeUndefined();
    });
    it("retains the candidate, mode and existing bag when payment declines", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        state = transition(state, { type: "BUY_NOW", id: "cloud-poplin" });
        const declined = transition(state, {
            type: "CHECKOUT",
            payment: "declined",
        });
        expect(declined.checkoutMode).toBe("buy-now");
        expect(declined.buyNowId).toBe("cloud-poplin");
        expect(declined.bag).toEqual(["moss-knit"]);
        expect(declined.orders).toEqual([]);
        expect(declined.availability).toEqual(state.availability);
        expect(declined.paymentError).toBe(true);
    });
    it("rejects unavailable and unknown candidates and returns to normal bag checkout", () => {
        const state = initialState();
        for (const id of ["coming-soon-1", REFERENCE.id, "missing"])
            expect(transition(state, { type: "BUY_NOW", id })).toBe(state);
        const sold = {
            ...state,
            availability: { ...state.availability, "cloud-poplin": "sold" as const },
        };
        expect(transition(sold, { type: "BUY_NOW", id: "cloud-poplin" })).toBe(sold);
        let selected = transition(state, { type: "BUY_NOW", id: "cloud-poplin" });
        selected = transition(selected, { type: "BAG_VIEW" });
        expect(selected.checkoutMode).toBe("bag");
        expect(selected.buyNowId).toBeUndefined();
        expect(transition(selected, { type: "CHECKOUT", payment: "success" })).toBe(selected);
    });
    it("removes the purchased candidate from an existing bag but retains all other items", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "BAG_ADD", id: "moss-knit" });
        state = transition(state, { type: "BUY_NOW", id: "cloud-poplin" });
        const purchased = transition(state, {
            type: "CHECKOUT",
            payment: "success",
        });
        expect(purchased.bag).toEqual(["moss-knit"]);
        expect(purchased.orders[0].items).toEqual(["cloud-poplin"]);
    });
    it("restores valid Buy now selection and recovers malformed or unavailable selections to the bag", () => {
        const selected = transition(initialState(), {
            type: "BUY_NOW",
            id: "cloud-poplin",
        });
        expect(sanitizeStoredState(JSON.parse(JSON.stringify(selected)))).toEqual(selected);
        for (const buyNowId of ["soon", REFERENCE.id, undefined]) {
            const recovered = sanitizeStoredState({
                ...initialState(),
                checkoutMode: "buy-now",
                buyNowId,
            });
            expect(recovered.checkoutMode).toBe("bag");
            expect(recovered.buyNowId).toBeUndefined();
        }
        const reserved = transition(selected, {
            type: "CHECKOUT",
            payment: "success",
        });
        const recovered = sanitizeStoredState({
            ...reserved,
            checkoutMode: "buy-now",
            buyNowId: "cloud-poplin",
        });
        expect(recovered.checkoutMode).toBe("bag");
    });
});
describe("transparent focused match discovery", () => {
    it("keeps the property display order fixed under every ranking focus", () => {
        for (const property of PROPERTIES)
            for (const match of rankMatches(initialState(), REFERENCE, property)) {
                expect(match.properties.map((p) => p.property)).toEqual([
                    "Drape",
                    "Movement",
                    "Stretch",
                    "Surface",
                ]);
            }
    });
    it("uses the recorded candidate sequence for each property without a total score", () => {
        const state = initialState();
        const ids = (property: Property) => rankMatches(state, REFERENCE, property).map((x) => x.listing.id);
        expect(ids("Drape")).toEqual([
            "cloud-poplin",
            "airloom-linen",
            "moss-knit",
        ]);
        expect(ids("Surface")).toEqual([
            "cloud-poplin",
            "airloom-linen",
            "petal-tee",
        ]);
        expect(ids("Movement")).toEqual([
            "airloom-linen",
            "cloud-poplin",
            "moss-knit",
        ]);
        expect(ids("Stretch").slice(0, 2)).toEqual(["moss-knit", "oat-vest"]);
        for (const match of rankMatches(state, REFERENCE, "Surface")) {
            expect(match.discoveryKind).toBe("authored-fixture-order");
            expect(match.discoveryReason).toMatch(/source|frame|weave|silhouette/i);
            expect(match).not.toHaveProperty("score");
        }
    });
    it("does not infer stretch support from a candidate when the reference has no test", () => {
        const matches = rankMatches(initialState(), REFERENCE, "Stretch");
        expect(matches).toHaveLength(3);
        expect(matches[0].listing.id).toBe("moss-knit");
        for (const match of matches) {
            const stretch = match.properties.find((p) => p.property === "Stretch")!;
            expect(stretch.support).toBe("unavailable");
            expect(stretch.evidenceCount).toBe(0);
        }
    });
    it("applies size and category before ranking and never pads with excluded products", () => {
        const state = initialState();
        const smallTops = rankMatches(state, REFERENCE, "Surface", {
            size: "S",
            category: "Tops",
        });
        expect(smallTops.map((x) => x.listing.id)).toEqual(["petal-tee"]);
        const knitwear = rankMatches(state, REFERENCE, "Drape", {
            size: "All",
            category: "Knitwear",
        });
        expect(knitwear.map((x) => x.listing.id)).toEqual([
            "moss-knit",
            "oat-vest",
        ]);
        expect(rankMatches(state, REFERENCE, "Drape", {
            size: "L",
            category: "Tops",
        }).map((x) => x.listing.id)).toEqual(["lilac-wrap"]);
        expect(rankMatches(state, REFERENCE, "Drape", {
            size: "S",
            category: "Outerwear",
        })).toEqual([]);
        const reserved = {
            ...state,
            availability: { ...state.availability, "moss-knit": "reserved" as const },
        };
        expect(rankMatches(reserved, REFERENCE, "Stretch", { category: "Knitwear" }).map((x) => x.listing.id)).toEqual(["oat-vest"]);
    });
});
describe("immutable last published listing", () => {
    it("keeps the public listing and review metadata stable while editing an unpublished draft", () => {
        let state = transition(readyToPublish(), {
            type: "DRAFT",
            draft: { name: "Published ivory blouse", price: 39 },
        });
        state = transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
            note: "Small right cuff mark.",
        });
        state = transition(state, { type: "PUBLISH" });
        const published = getListing(state, "cloud-poplin")!;
        const snapshot = JSON.stringify(state.publishedSnapshot);
        state = transition(state, {
            type: "DRAFT",
            draft: { name: "Revised blouse draft", price: 49 },
        });
        expect(state.published).toBe(false);
        expect(getListing(state, "cloud-poplin")).toEqual(published);
        state = transition(state, {
            type: "DECIDE",
            property: "Surface",
            status: "corrected",
            note: "A new seller note awaiting publication.",
        });
        expect(getListing(state, "cloud-poplin")).toEqual(published);
        expect(JSON.stringify(state.publishedSnapshot)).toBe(snapshot);
        state = transition(state, { type: "PUBLISH" });
        expect(getListing(state, "cloud-poplin")!.name).toBe("Revised blouse draft");
        expect(getListing(state, "cloud-poplin")!.price).toBe(49);
        expect(getListing(state, "cloud-poplin")!.evidence.find((e) => e.property === "Surface")!.correctionNote).toBe("A new seller note awaiting publication.");
        expect(published.name).toBe("Published ivory blouse");
    });
    it("preserves the public snapshot through capture retakes and clears it on reset", () => {
        let state = transition(readyToPublish(), { type: "PUBLISH" });
        const published = getListing(state, "cloud-poplin");
        state = transition(state, { type: "CAPTURE_RETAKE", stage: 3 });
        expect(state.published).toBe(false);
        expect(state.decisions.Surface).toBeUndefined();
        expect(getListing(state, "cloud-poplin")).toEqual(published);
        const reset = transition(state, { type: "RESET" });
        expect(reset.publishedSnapshot).toBeUndefined();
        expect(getListing(reset, "cloud-poplin")!.evidence.every((e) => e.sellerStatus === "unreviewed")).toBe(true);
    });
    it("persists an older public snapshot independently of an incomplete new draft", () => {
        let state = transition(readyToPublish(), { type: "PUBLISH" });
        const publicListing = getListing(state, "cloud-poplin");
        state = transition(state, {
            type: "DRAFT",
            draft: { name: "Work in progress" },
        });
        state = transition(state, { type: "CAPTURE_RETAKE", stage: 4 });
        const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
        expect(restored).toEqual(state);
        expect(getListing(restored, "cloud-poplin")).toEqual(publicListing);
    });
    it("migrates valid older published state and rejects malformed publication snapshots", () => {
        const older = transition(readyToPublish(), {
            type: "DRAFT",
            draft: { name: "Migrated blouse" },
        });
        const migrated = sanitizeStoredState({ ...older, published: true });
        expect(migrated.publishedSnapshot?.draft.name).toBe("Migrated blouse");
        expect(getListing(migrated, "cloud-poplin")!.evidence.every((e) => e.sellerStatus === "confirmed")).toBe(true);
        for (const snapshot of [
            null,
            [],
            {
                draft: { name: "Bad", price: -1, size: "M", description: "Bad" },
                decisions: older.decisions,
            },
            {
                draft: older.draft,
                decisions: { Surface: { status: "corrected", note: "" } },
            },
        ]) {
            const restored = sanitizeStoredState({
                ...initialState(),
                publishedSnapshot: snapshot,
            });
            expect(restored.publishedSnapshot).toBeUndefined();
        }
    });
});
describe("persisted comparison context", () => {
    it("retains the candidate, property focus and eligibility filters across serialization", () => {
        const state = transition(initialState(), {
            type: "COMPARISON",
            comparison: {
                listingId: "cloud-poplin",
                property: "Surface",
                size: "S",
                category: "Tops",
            },
        });
        expect(state.comparison).toEqual({
            listingId: "cloud-poplin",
            property: "Surface",
            size: "S",
            category: "Tops",
        });
        const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
        expect(restored.comparison).toEqual(state.comparison);
        expect(rankMatches(restored, REFERENCE, restored.comparison.property, restored.comparison).map((x) => x.listing.id)).toEqual(["petal-tee"]);
        expect(initialState().comparison).toEqual({
            property: "Drape",
            size: "All",
            category: "All",
        });
    });
    it("rejects invalid action values without dropping prior context", () => {
        const state = transition(initialState(), {
            type: "COMPARISON",
            comparison: { listingId: "moss-knit", property: "Movement" },
        });
        const invalid = {
            listingId: "coming-soon-1",
            property: "Odor",
            size: "XL",
            category: "Shoes",
        } as unknown as Partial<AppState["comparison"]>;
        expect(transition(state, { type: "COMPARISON", comparison: invalid })).toBe(state);
        expect(state.comparison).toEqual({
            listingId: "moss-knit",
            property: "Movement",
            size: "All",
            category: "All",
        });
    });
    it("sanitizes malformed stored filters and unknown candidate ids to defaults", () => {
        for (const comparison of [
            null,
            [],
            { listingId: "soon", property: "Odor", size: "XL", category: "Shoes" },
        ]) {
            const restored = sanitizeStoredState({ ...initialState(), comparison });
            expect(restored.comparison).toEqual({
                property: "Drape",
                size: "All",
                category: "All",
            });
        }
    });
});
describe("immutable order item receipts", () => {
    it("retains the purchased name, unit price, size and condition after seller republishing", () => {
        let state = transition(initialState(), {
            type: "BUY_NOW",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        const receipt = state.orders[0];
        expect(receipt.total).toBe(37);
        expect(receipt.itemSnapshots).toEqual([
            {
                id: "cloud-poplin",
                name: "Cloud Poplin Blouse",
                price: 32,
                size: "M",
                poster: coverFor("cloud-poplin"),
                condition: CATALOG[0].condition,
            },
        ]);
        for (let i = 0; i < 6; i++)
            state = transition(state, { type: "CAPTURE_NEXT" });
        for (const property of PROPERTIES)
            state = transition(state, {
                type: "DECIDE",
                property,
                status: "confirmed",
            });
        state = transition(state, {
            type: "DRAFT",
            draft: { name: "Changed public blouse", price: 99, size: "L" },
        });
        state = transition(state, { type: "PUBLISH" });
        expect(getListing(state, "cloud-poplin")!.name).toBe("Changed public blouse");
        expect(getListing(state, "cloud-poplin")!.price).toBe(99);
        expect(state.orders[0].itemSnapshots).toEqual(receipt.itemSnapshots);
        expect(state.orders[0].total).toBe(37);
        expect(Object.isFrozen(state.orders[0].itemSnapshots)).toBe(true);
        expect(Object.isFrozen(state.orders[0].itemSnapshots![0])).toBe(true);
        expect(sanitizeStoredState(JSON.parse(JSON.stringify(state))).orders[0]
            .itemSnapshots).toEqual(receipt.itemSnapshots);
    });
    it("preserves legacy recorded totals without inventing historical unit prices", () => {
        let state = transition(initialState(), {
            type: "BAG_ADD",
            id: "moss-knit",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        const legacy = JSON.parse(JSON.stringify(state));
        delete legacy.orders[0].itemSnapshots;
        const restored = sanitizeStoredState(legacy);
        expect(restored.orders[0].itemSnapshots).toBeUndefined();
        expect(restored.orders[0].total).toBe(51);
    });
    it("rejects invalid receipt snapshots while retaining the historical order and total", () => {
        let state = transition(initialState(), {
            type: "BUY_NOW",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        const valid = {
            id: "cloud-poplin",
            name: "Cloud Poplin Blouse",
            price: 32,
            size: "M",
            poster: "/posters/cloud-poplin.svg",
            condition: "Very good · small cuff mark",
        };
        for (const itemSnapshots of [
            null,
            [],
            [null],
            [{ ...valid, id: "moss-knit" }],
            [{ ...valid, price: -3 }],
            [{ ...valid, price: 99 }],
            [{ ...valid, poster: "/external.jpg" }],
            [{ ...valid, name: "" }],
            [{ ...valid, size: "XL" }],
        ]) {
            const restored = sanitizeStoredState({
                ...state,
                orders: [{ ...state.orders[0], itemSnapshots }],
            });
            expect(restored.orders).toHaveLength(1);
            expect(restored.orders[0].itemSnapshots).toBeUndefined();
            expect(restored.orders[0].total).toBe(37);
            expect(restored.orders[0].items).toEqual(["cloud-poplin"]);
        }
    });
});
describe("prepared seller listing availability", () => {
    it("pauses, removes and resumes the owned listing without losing its saved identity", () => {
        let state = transition(initialState(), {
            type: "SAVE",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "LISTING_PAUSE", id: "cloud-poplin" });
        expect(state.availability["cloud-poplin"]).toBe("paused");
        expect(state.saved).toEqual(["cloud-poplin"]);
        expect(getListing(state, "cloud-poplin")?.name).toBe("Cloud Poplin Blouse");
        expect(allListings(state)).toHaveLength(12);
        expect(transition(state, { type: "BAG_ADD", id: "cloud-poplin" })).toBe(state);
        expect(transition(state, { type: "BUY_NOW", id: "cloud-poplin" })).toBe(state);
        expect(rankMatches(state, REFERENCE).some((x) => x.listing.id === "cloud-poplin")).toBe(false);
        state = transition(state, { type: "LISTING_REMOVE", id: "cloud-poplin" });
        expect(state.availability["cloud-poplin"]).toBe("removed");
        expect(getListing(state, "cloud-poplin")).toBeUndefined();
        expect(allListings(state)).toHaveLength(11);
        expect(rankMatches(state, REFERENCE).some((x) => x.listing.id === "cloud-poplin")).toBe(false);
        state = transition(state, { type: "LISTING_RESUME", id: "cloud-poplin" });
        expect(state.availability["cloud-poplin"]).toBe("active");
        expect(allListings(state)).toHaveLength(12);
        expect(state.saved).toEqual(["cloud-poplin"]);
    });
    it("rejects changes to other sellers and to reserved or sold inventory", () => {
        const state = initialState();
        for (const type of [
            "LISTING_PAUSE",
            "LISTING_REMOVE",
            "LISTING_RESUME",
        ] as const) {
            expect(transition(state, { type, id: "moss-knit" })).toBe(state);
            expect(transition(state, { type, id: "coming-soon-1" })).toBe(state);
            for (const availability of ["reserved", "sold"] as const) {
                const occupied = {
                    ...state,
                    availability: { ...state.availability, "cloud-poplin": availability },
                };
                expect(transition(occupied, { type, id: "cloud-poplin" })).toBe(occupied);
            }
        }
    });
    it("blocks checkout of a paused or removed item already in the bag", () => {
        const bagged = transition(initialState(), {
            type: "BAG_ADD",
            id: "cloud-poplin",
        });
        for (const type of ["LISTING_PAUSE", "LISTING_REMOVE"] as const) {
            const state = transition(bagged, { type, id: "cloud-poplin" });
            expect(transition(state, { type: "CHECKOUT", payment: "success" })).toBe(state);
            expect(state.orders).toEqual([]);
        }
    });
    it("persists valid seller labels but lets historical orders determine occupied inventory", () => {
        for (const type of ["LISTING_PAUSE", "LISTING_REMOVE"] as const) {
            const state = transition(initialState(), { type, id: "cloud-poplin" });
            expect(sanitizeStoredState(JSON.parse(JSON.stringify(state))).availability["cloud-poplin"]).toBe(state.availability["cloud-poplin"]);
        }
        let state = transition(initialState(), {
            type: "BUY_NOW",
            id: "cloud-poplin",
        });
        state = transition(state, { type: "CHECKOUT", payment: "success" });
        for (const status of ["paused", "removed"] as const) {
            const recovered = sanitizeStoredState({
                ...state,
                availability: { ...state.availability, "cloud-poplin": status },
            });
            expect(recovered.availability["cloud-poplin"]).toBe("reserved");
            expect(recovered.orders[0].itemSnapshots).toEqual(state.orders[0].itemSnapshots);
            expect(getListing(recovered, "cloud-poplin")).toBeDefined();
        }
    });
});
