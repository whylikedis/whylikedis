// A crash log that costs nothing: the last reports are kept on the device, so a problem from an
// earlier session (including the one that closed the app) can be read on the About screen and
// shared by the player if they choose. Nothing is sent anywhere on its own.
import type { KeyValue } from '../store/persisted.ts';
import { createPersisted } from '../store/persisted.ts';
import {
  devLog,
  recentErrors,
  restoreRecent,
  setReporter,
  type ErrorReport,
} from './report.ts';

export const ERRORS_KEY = 'wld.errors';
const KEEP = 25;

type ErrorDoc = { version: 1; errors: ErrorReport[] };

const isReport = (v: unknown): v is ErrorReport =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ErrorReport).at === 'number' &&
  typeof (v as ErrorReport).where === 'string' &&
  typeof (v as ErrorReport).message === 'string';

export function errorStore(storage: KeyValue) {
  // No onError: a failure to store an error must not report an error.
  return createPersisted<ErrorDoc>({
    storage,
    key: ERRORS_KEY,
    version: 1,
    empty: () => ({ version: 1, errors: [] }),
    migrations: {},
    validate: (v: any) =>
      v?.version === 1 && Array.isArray(v.errors)
        ? { version: 1, errors: v.errors.filter(isReport).slice(-KEEP) }
        : null,
  });
}

// Loads the earlier sessions' reports, then keeps every new one on disk as well as in memory.
export async function installErrorLog(storage: KeyValue): Promise<void> {
  const store = errorStore(storage);
  const { value } = await store.load();
  restoreRecent(value.errors);
  setReporter((r) => {
    devLog(r);
    store.save({ version: 1, errors: recentErrors().slice(-KEEP) });
  });
}
