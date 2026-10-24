import { describe, it, expect } from "vitest";
import { visibleListings } from "../src/buyer";
import { initialState, CATALOG } from "../src/domain";
describe("marketplace filtering", () => {
  it("keeps exactly twelve distinct prepared listings", () => {
    expect(CATALOG).toHaveLength(12);
    expect(new Set(CATALOG.map((x) => x.id)).size).toBe(12);
  });
  it("searches identity, category, color and seller", () => {
    const s = initialState();
    expect(
      visibleListings(s, {
        query: "cloud",
        category: "All",
        size: "All",
        saved: false,
      }),
    ).toHaveLength(1);
  });
  it("understands an explicit size within a descriptive query", () => {
    const result = visibleListings(initialState(), {
      query: "blue shirt size M",
      category: "All",
      size: "All",
      saved: false,
    });
    expect(result.map((x) => x.id)).toEqual(["tide-shirt"]);
  });
  it("shows an honest empty saved state", () => {
    expect(
      visibleListings(initialState(), {
        query: "",
        category: "All",
        size: "All",
        saved: true,
      }),
    ).toEqual([]);
  });
  it("combines filters without changing inventory", () => {
    const s = initialState();
    expect(
      visibleListings(s, {
        query: "",
        category: "Tops",
        size: "S",
        saved: false,
      }).every((x) => x.category === "Tops" && x.size === "S"),
    ).toBe(true);
    expect(s.bag).toEqual([]);
  });
});
