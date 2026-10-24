import { createContext, useContext, useEffect, useCallback, useRef, useState, type Dispatch, type ReactNode, } from "react";
import { initialState, sanitizeStoredState, transition, type Action, type AppState, } from "./domain";
export const STORAGE_KEY = "refeel-v1";
export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function loadPersistedState(storage: BrowserStorage | null): {
    state: AppState;
    storageAvailable: boolean;
} {
    if (!storage)
        return { state: initialState(), storageAvailable: false };
    let serialized: string | null;
    try {
        serialized = storage.getItem(STORAGE_KEY);
    }
    catch {
        return { state: initialState(), storageAvailable: false };
    }
    let storageAvailable = true;
    try {
        const probe = `${STORAGE_KEY}-probe`;
        storage.setItem(probe, "1");
        storage.removeItem(probe);
    }
    catch {
        storageAvailable = false;
    }
    let value: unknown = null;
    try {
        value = serialized ? JSON.parse(serialized) : null;
    }
    catch {
        /* Recover malformed JSON without preventing future persistence. */
    }
    return { state: sanitizeStoredState(value), storageAvailable };
}
export function persistState(storage: BrowserStorage | null, state: AppState): boolean {
    if (!storage)
        return false;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    }
    catch {
        return false;
    }
}
export function applyPersistedAction(storage: BrowserStorage | null, state: AppState, action: Action) {
    const next = transition(state, action);
    return { state: next, storageAvailable: persistState(storage, next) };
}
function browserStorage(): BrowserStorage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage;
    }
    catch {
        return null;
    }
}
interface StoreValue {
    state: AppState;
    dispatch: Dispatch<Action>;
    storageAvailable: boolean;
}
const StoreContext = createContext<StoreValue | null>(null);
export function StoreProvider({ children }: {
    children: ReactNode;
}) {
    const storage = useRef<BrowserStorage | null>(browserStorage());
    const [loaded] = useState(() => loadPersistedState(storage.current));
    const [state, setState] = useState(loaded.state);
    const current = useRef(loaded.state);
    const [storageAvailable, setStorageAvailable] = useState(loaded.storageAvailable);
    const dispatch = useCallback((action: Action) => {
        const result = applyPersistedAction(storage.current, current.current, action);
        current.current = result.state;
        setState(result.state);
        setStorageAvailable(result.storageAvailable);
    }, []);
    useEffect(() => {
        setStorageAvailable(persistState(storage.current, current.current));
    }, []);
    return (<StoreContext.Provider value={{ state, dispatch, storageAvailable }}>
      {children}
    </StoreContext.Provider>);
}
export function useStore(): StoreValue {
    const value = useContext(StoreContext);
    if (!value)
        throw new Error("useStore requires StoreProvider");
    return value;
}
