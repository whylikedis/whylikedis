// Where the app's errors go. One function, `reportError`, for every caught failure (a storage
// write, a game screen that crashed, an unhandled exception), so nothing fails silently. The
// reporter is pluggable: today it logs in development and keeps the last few reports in memory for
// a diagnostics screen; a crash service can be plugged in later with `setReporter`, without
// touching a single call site.
export type ErrorReport = {
  at: number;
  where: string;
  message: string;
  stack?: string;
  fatal: boolean;
};

export type Reporter = (report: ErrorReport) => void;

const RECENT_MAX = 25;
const recent: ErrorReport[] = [];

const devLog: Reporter = (r) => {
  // `__DEV__` is defined by React Native; absent in Node tests.
  if ((globalThis as { __DEV__?: boolean }).__DEV__)
    console.warn(`[${r.where}] ${r.message}`);
};

let reporter: Reporter = devLog;

export function setReporter(next: Reporter | null): void {
  reporter = next ?? devLog;
}

export function toReport(error: unknown, where: string, fatal = false): ErrorReport {
  const e = error instanceof Error ? error : null;
  return {
    at: Date.now(),
    where,
    message: e ? e.message : String(error),
    stack: e?.stack,
    fatal,
  };
}

export function reportError(error: unknown, where: string, fatal = false): void {
  const r = toReport(error, where, fatal);
  recent.push(r);
  if (recent.length > RECENT_MAX) recent.shift();
  try {
    reporter(r);
  } catch {
    // A broken reporter must never become the next crash.
  }
}

export const recentErrors = (): readonly ErrorReport[] => recent.slice();

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(h: GlobalHandler): void;
};

// Routes uncaught JS errors through `reportError`, then to React Native's own handler (the red
// screen in development, the crash in production). Safe to call more than once.
let installed = false;
export function installGlobalHandler(
  utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils,
): void {
  if (installed || !utils) return;
  installed = true;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    reportError(error, 'uncaught', !!isFatal);
    previous(error, isFatal);
  });
}
