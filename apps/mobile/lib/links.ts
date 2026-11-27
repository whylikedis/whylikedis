// Opening a source from an answer. The pack is bundled and checked at build time, but a link is
// still a call into the system: it can be refused (no browser, a malformed address), and a refusal
// must not become an unhandled rejection. Only web addresses are opened, so a bad card can never
// launch another app through a custom scheme.
export const isWebUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

// True when the system took the address. Every failure is passed to `onError` and contained.
export async function openSource(
  url: unknown,
  open: (url: string) => Promise<unknown>,
  onError: (error: unknown, where: string) => void,
): Promise<boolean> {
  if (!isWebUrl(url)) {
    onError(
      new Error(`not a web address: ${String(url).slice(0, 80)}`),
      'link',
    );
    return false;
  }
  try {
    await open(url);
    return true;
  } catch (e) {
    onError(e, 'link');
    return false;
  }
}
