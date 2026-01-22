import type { AsyncAtom, Atom } from "./types";

/**
 * Create a simple atom for reactive state
 */
export function atom<T>(initialValue: T): Atom<T> {
  let value = initialValue;
  const listeners = new Set<(value: T) => void>();

  return {
    get() {
      return value;
    },

    set(newValue: T) {
      value = newValue;
      for (const listener of listeners) {
        listener(value);
      }
    },

    subscribe(callback: (value: T) => void) {
      listeners.add(callback);
      // Call immediately with current value
      callback(value);
      // Return unsubscribe function
      return () => {
        listeners.delete(callback);
      };
    },
  };
}

/**
 * Create an async atom that fetches data
 */
export function asyncAtom<T>(
  fetcher: () => Promise<T>,
  options: { autoFetch?: boolean } = {},
): AsyncAtom<T> {
  const valueAtom = atom<T | null>(null);
  const loadingAtom = atom(false);
  const errorAtom = atom<Error | null>(null);

  const refresh = async () => {
    loadingAtom.set(true);
    errorAtom.set(null);

    try {
      const data = await fetcher();
      valueAtom.set(data);
    } catch (err) {
      errorAtom.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      loadingAtom.set(false);
    }
  };

  // Auto-fetch on creation if enabled
  if (options.autoFetch !== false) {
    refresh();
  }

  return {
    get() {
      return valueAtom.get();
    },

    isLoading() {
      return loadingAtom.get();
    },

    error() {
      return errorAtom.get();
    },

    refresh,

    subscribe(callback: (value: T | null) => void) {
      return valueAtom.subscribe(callback);
    },
  };
}

/**
 * Computed atom that derives from other atoms
 */
export function computed<T, R>(sourceAtom: Atom<T>, transform: (value: T) => R): Atom<R> {
  const computedAtom = atom(transform(sourceAtom.get()));

  sourceAtom.subscribe((value) => {
    computedAtom.set(transform(value));
  });

  return {
    get() {
      return computedAtom.get();
    },
    set() {
      throw new Error("Cannot set a computed atom directly");
    },
    subscribe: computedAtom.subscribe,
  };
}
