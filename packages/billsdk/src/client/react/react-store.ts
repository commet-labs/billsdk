import { useCallback, useRef, useSyncExternalStore } from "react";
import type { AsyncAtom, Atom } from "../types";

/**
 * Hook to subscribe to an atom in React
 * Similar to nanostores' useStore
 */
export function useStore<T>(atom: Atom<T>): T {
  const snapshotRef = useRef<T>(atom.get());

  const subscribe = useCallback(
    (onChange: () => void) => {
      const emitChange = (value: T) => {
        if (snapshotRef.current === value) return;
        snapshotRef.current = value;
        onChange();
      };

      // Subscribe to atom changes
      return atom.subscribe(emitChange);
    },
    [atom],
  );

  const get = () => snapshotRef.current;

  return useSyncExternalStore(subscribe, get, get);
}

/**
 * Hook to subscribe to an async atom in React
 * Returns { data, isLoading, error, refresh }
 */
export function useAsyncStore<T>(atom: AsyncAtom<T>): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const snapshotRef = useRef<T | null>(atom.get());

  const subscribe = useCallback(
    (onChange: () => void) => {
      const emitChange = (value: T | null) => {
        if (snapshotRef.current === value) return;
        snapshotRef.current = value;
        onChange();
      };

      return atom.subscribe(emitChange);
    },
    [atom],
  );

  const get = () => snapshotRef.current;

  const data = useSyncExternalStore(subscribe, get, get);

  return {
    data,
    isLoading: atom.isLoading(),
    error: atom.error(),
    refresh: atom.refresh,
  };
}
