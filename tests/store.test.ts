import { describe, expect, it } from "vitest";
import { initialState, transition } from "../src/domain";
import {
  loadPersistedState,
  persistState,
  STORAGE_KEY,
  type BrowserStorage,
} from "../src/store";
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
describe("local browser persistence", () => {
  it("loads a versioned saved state and writes a later transition", () => {
    const storage = new MemoryStorage();
    let state = transition(initialState(), { type: "SAVE", id: "moss-knit" });
    expect(persistState(storage, state)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state));
    expect(loadPersistedState(storage)).toEqual({
      state,
      storageAvailable: true,
    });
    state = transition(state, { type: "BAG_ADD", id: "cloud-poplin" });
    expect(persistState(storage, state)).toBe(true);
    expect(loadPersistedState(storage).state.bag).toEqual(["cloud-poplin"]);
  });
  it("recovers invalid JSON while still reporting functional storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken");
    expect(loadPersistedState(storage)).toEqual({
      state: initialState(),
      storageAvailable: true,
    });
    expect(persistState(storage, initialState())).toBe(true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(initialState());
  });
  it("reports unavailable storage when browser access is denied or writes fail", () => {
    expect(loadPersistedState(null)).toEqual({
      state: initialState(),
      storageAvailable: false,
    });
    const storage: BrowserStorage = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };
    expect(loadPersistedState(storage)).toEqual({
      state: initialState(),
      storageAvailable: false,
    });
    expect(persistState(storage, initialState())).toBe(false);
    const readable: BrowserStorage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };
    expect(loadPersistedState(readable).storageAvailable).toBe(false);
  });
});

it("restores readable saved work even when new writes fail", () => {
  const state = transition(initialState(), { type: "SAVE", id: "moss-knit" });
  const storage: BrowserStorage = {
    getItem() {
      return JSON.stringify(state);
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {},
  };
  expect(loadPersistedState(storage)).toEqual({
    state,
    storageAvailable: false,
  });
});

it("writes a comparison change before the action returns for immediate reload", async () => {
  const { applyPersistedAction } = await import("../src/store");
  const storage = new MemoryStorage();
  const result = applyPersistedAction(storage, initialState(), {
    type: "COMPARISON",
    comparison: { property: "Surface" },
  });
  expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  expect(JSON.parse(storage.getItem(STORAGE_KEY)!).comparison.property).toBe(
    "Surface",
  );
  expect(result.state.comparison.property).toBe("Surface");
  expect(result.storageAvailable).toBe(true);
});
