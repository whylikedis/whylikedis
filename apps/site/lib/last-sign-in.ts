// Which way in this browser used last time, so the sign-in page can put it first. A per-browser
// convenience only: it may be missing or blocked, and nothing depends on it.
const KEY = 'wld:last-sign-in';

export function readLastSignIn(): string | undefined {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberSignIn(method: string) {
  try {
    localStorage.setItem(KEY, method);
  } catch {
    // Private mode or blocked storage: the order just stays as it is.
  }
}
