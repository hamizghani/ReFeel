import { describe, expect, it } from "vitest";
import { CATALOG, REFERENCE, getReference, initialState, transition } from "../src/domain";
import { FEEL_DEFAULTS, compatibleGarments, findFeelMatches, passesFeelSearchFilters, measurementDifference } from "../src/feel";

describe("feel-led discovery", () => {
  it("returns distinct compatible available garments", () => {
    const state = initialState();
    const result = findFeelMatches(state, REFERENCE, FEEL_DEFAULTS, { category: "All", size: "All" });
    expect(result).toHaveLength(3);
    expect(new Set(result.map(r => r.listing.id)).size).toBe(3);
    expect(result.every(r => compatibleGarments(REFERENCE, r.listing))).toBe(true);
    expect(result.some(r => r.listing.category === "Bottoms")).toBe(false);
  });
  it("changes the top suggestion when the desired fabric changes", () => {
    const state = initialState();
    const filters = { category: "All", size: "All" };
    const crisp = findFeelMatches(state, REFERENCE, { ...FEEL_DEFAULTS, likes: ["Crisp structure"] }, filters);
    const texture = findFeelMatches(state, REFERENCE, { ...FEEL_DEFAULTS, likes: ["Textured finish"], priority: "Surface" }, filters);
    expect(crisp[0].listing.id).toBe("cloud-poplin");
    expect(texture[0].listing.id).toBe("oat-vest");
    expect(crisp[0].listing.id).not.toBe(texture[0].listing.id);
  });
  it("honors availability, size, category and query constraints before ranking", () => {
    const state = initialState();
    state.availability["cloud-poplin"] = "reserved";
    const result = findFeelMatches(state, REFERENCE, { ...FEEL_DEFAULTS, query: "smooth blouse under $40 size M" }, { category: "Tops", size: "All" });
    expect(result).toEqual([]);
  });
  it("identifies a directly chosen M listing outside a size-S search without changing its size", () => {
    const cloud = CATALOG.find(l => l.id === "cloud-poplin")!;
    expect(passesFeelSearchFilters(cloud, "", { category: "All", size: "S" })).toBe(false);
    expect(passesFeelSearchFilters(cloud, "", { category: "All", size: "M" })).toBe(true);
    expect(cloud.size).toBe("M");
    expect(findFeelMatches(initialState(), REFERENCE, FEEL_DEFAULTS, { category: "All", size: "S" }).every(r => r.listing.size === "S")).toBe(true);
  });
  it("retains meaningful ordinary search constraints", () => {
    const result = findFeelMatches(initialState(), REFERENCE, { ...FEEL_DEFAULTS, query: "blue shirt size M" }, { category: "All", size: "All" });
    expect(result.map(r => r.listing.id)).toEqual(["tide-shirt"]);
  });
  it("understands punctuation in a natural-language feel query", () => {
    const result = findFeelMatches(initialState(), REFERENCE, { ...FEEL_DEFAULTS, query: "smooth blouse under $40, size M" }, { category: "All", size: "All" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(r => r.listing.price < 40 && r.listing.size === "M")).toBe(true);
  });
  it("does not invent a stretch comparison for an unknown garment profile", () => {
    const unknown = { ...REFERENCE, id: "unknown-reference", templateId: "unknown-reference", feelDescription: undefined, feelDescriptionSource: undefined };
    expect(findFeelMatches(initialState(), unknown, { ...FEEL_DEFAULTS, priority: "Stretch" }, { category: "All", size: "All" })).toEqual([]);
  });
  it("abstains when a new reference has no authored fabric profile", () => {
    const unknown = { ...REFERENCE, id: "unknown-reference", templateId: "unknown-reference", feelDescription: undefined, feelDescriptionSource: undefined };
    expect(findFeelMatches(initialState(), unknown, FEEL_DEFAULTS, { category: "All", size: "All" })).toEqual([]);
  });
  it("can compare prepared give declarations without turning them into percentages", () => {
    const result = findFeelMatches(initialState(), REFERENCE, { ...FEEL_DEFAULTS, priority: "Stretch", likes: ["Some give"] }, { category: "All", size: "All" });
    expect(result[0].listing.feelDescription?.give).toBe("some");
    const littleGive = findFeelMatches(initialState(), REFERENCE, { ...FEEL_DEFAULTS, priority: "Stretch", likes: [], dislikes: ["Some give"] }, { category: "All", size: "All" });
    expect(result[0].listing.id).not.toBe(littleGive[0].listing.id);
    expect(result[0].profile.observations.Stretch).toContain("prepared seller description");
    expect(result[0].profile.observations.Stretch).not.toMatch(/\d+%/);
  });
  it("does not compare an upper garment with trousers", () => {
    expect(compatibleGarments(REFERENCE, CATALOG.find(l => l.id === "ink-trousers")!)).toBe(false);
  });
  it("uses attributed give independently of demo progress and does not infer an unknown give", () => {
    let state = transition(initialState(), { type: "REFERENCE_CREATE" });
    const described = getReference(state)!;
    expect(findFeelMatches(state, described, { ...FEEL_DEFAULTS, priority: "Stretch" }, { category: "All", size: "All" }).length).toBeGreaterThan(0);
    state = transition(state, { type: "DESCRIBE_FEEL", qualities: { ...described.feelDescription!, give: "unknown" } });
    for (let step = 0; step <= 4; step++) {
      state = transition(state, { type: "REFERENCE_RECORDING_COMPLETE", step });
      state = transition(state, { type: "REFERENCE_RECORDING_NEXT" });
    }
    expect(findFeelMatches(state, getReference(state)!, { ...FEEL_DEFAULTS, priority: "Stretch" }, { category: "All", size: "All" })).toEqual([]);
  });
});

describe("flat garment differences", () => {
  it("uses the candidate minus reference measurement, not a fit promise", () => {
    const cloud = CATALOG.find(l => l.id === "cloud-poplin")!;
    const result = measurementDifference(REFERENCE, cloud, "chest");
    expect(result.delta).toBe(cloud.measurements.chest! - REFERENCE.measurements.chest!);
    expect(result.text).toBe(`${Math.abs(result.delta!)} cm ${result.delta! > 0 ? "wider" : "narrower"}`);
  });
  it("preserves unknown measurements", () => {
    expect(measurementDifference(REFERENCE, CATALOG.find(l => l.id === "petal-tee")!, "shoulder").text).toBe("Not recorded");
  });
  it("rounds decimal subtraction and handles equality", () => {
    const same = { ...REFERENCE, measurements: { chest: REFERENCE.measurements.chest } };
    expect(measurementDifference(REFERENCE, same, "chest").text).toBe("Same measurement");
    const decimalReference = { ...REFERENCE, measurements: { chest: 53.1 } };
    const decimalCandidate = { ...REFERENCE, measurements: { chest: 52.6 } };
    expect(measurementDifference(decimalReference, decimalCandidate, "chest").text).toBe("0.5 cm narrower");
  });
});
