// Startup timing, measured on every launch and shown on the About screen, so performance is a
// number we can watch rather than a feeling. Imported first by the root layout, so `start` is as
// close to the app's code starting as JavaScript can see.
const now = () => globalThis.performance?.now?.() ?? Date.now();
const start = now();

export type Mark = 'storage loaded' | 'first screen';
const marks = new Map<Mark, number>();

// Records the first time only: a remount never overwrites a launch measurement.
export function mark(name: Mark): void {
  if (!marks.has(name)) marks.set(name, Math.round(now() - start));
}

export const startupMarks = (): [Mark, number][] => [...marks.entries()];
