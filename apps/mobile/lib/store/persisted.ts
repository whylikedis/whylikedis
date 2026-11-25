// A value kept on the device that survives app updates. Every stored document carries a version;
// `load` walks an old one through each migration in turn, and anything it cannot read (corrupt
// JSON, a version from a newer app, a shape that fails validation) is set aside under a
// `.unreadable` key instead of being thrown away, and the app starts from `empty`. `save` never
// runs two writes at once: while one is in flight, only the newest value waits, so a burst of
// answers costs at most two writes and the last one always wins.
export interface KeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type Versioned = { version: number };

export type PersistedOptions<T extends Versioned> = {
  storage: KeyValue;
  key: string;
  version: T['version'];
  empty: () => T;
  // From version n to n + 1, keyed by n. Each step takes the stored object and returns the next.
  migrations: Record<number, (old: any) => unknown>;
  // The last word on the current version's shape. Returns the value to use, or null to reject.
  validate: (value: unknown) => T | null;
  // Keys older app versions wrote to, read when `key` is empty. The first one found is migrated.
  legacyKeys?: readonly string[];
  onError?: (error: unknown, where: string) => void;
};

export type LoadResult<T> = {
  value: T;
  // Where it came from, for tests and diagnostics.
  source: 'empty' | 'stored' | 'migrated' | 'unreadable';
};

export function createPersisted<T extends Versioned>(opts: PersistedOptions<T>) {
  const report = opts.onError ?? (() => {});

  function upgrade(raw: string): { value: T; migrated: boolean } | null {
    let v: any;
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
    let migrated = false;
    while (
      v &&
      typeof v.version === 'number' &&
      v.version < opts.version &&
      opts.migrations[v.version]
    ) {
      try {
        v = opts.migrations[v.version](v);
      } catch (e) {
        report(e, `migrate ${opts.key}`);
        return null;
      }
      migrated = true;
    }
    const value = opts.validate(v);
    return value ? { value, migrated } : null;
  }

  async function load(): Promise<LoadResult<T>> {
    for (const key of [opts.key, ...(opts.legacyKeys ?? [])]) {
      let raw: string | null;
      try {
        raw = await opts.storage.getItem(key);
      } catch (e) {
        report(e, `read ${key}`);
        continue;
      }
      if (raw == null) continue;
      const up = upgrade(raw);
      if (up)
        return {
          value: up.value,
          source: up.migrated || key !== opts.key ? 'migrated' : 'stored',
        };
      // Kept for a later app version (or a person) to recover; never silently dropped.
      await opts.storage.setItem(`${key}.unreadable`, raw).catch((e) => report(e, 'set aside'));
      return { value: opts.empty(), source: 'unreadable' };
    }
    return { value: opts.empty(), source: 'empty' };
  }

  let inFlight: Promise<void> | null = null;
  let pending: { value: T } | null = null;

  async function drain(): Promise<void> {
    while (pending) {
      const { value } = pending;
      pending = null;
      try {
        await opts.storage.setItem(opts.key, JSON.stringify(value));
      } catch (e) {
        report(e, `write ${opts.key}`);
      }
    }
  }

  // Resolves once the value (or a newer one) is on disk.
  function save(value: T): Promise<void> {
    pending = { value };
    if (!inFlight)
      inFlight = drain().finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  return { load, save };
}

// A KeyValue in memory, for tests and for the web preview when storage is blocked.
export function memoryStorage(seed: Record<string, string> = {}): KeyValue & {
  data: Map<string, string>;
  writes: number;
} {
  const data = new Map(Object.entries(seed));
  const s = {
    data,
    writes: 0,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      s.writes++;
      data.set(k, v);
    },
  };
  return s;
}
