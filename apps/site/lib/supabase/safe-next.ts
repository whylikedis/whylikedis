/**
 * Only same-site paths, so the sign-in page can never send someone to another site.
 * Browsers drop tabs and newlines from an address, so "/\t/host" would become "//host":
 * anything with a control character, whitespace or backslash is refused, and what is left
 * must still resolve to this site. Encoded slashes ("/%2F%2Fhost") stay a path on this site.
 */
export function safeNext(next: string | null | undefined): string {
  return next &&
    /^\/(?![/\\])[^\s\\\x00-\x1f\x7f]*$/.test(next) &&
    new URL(next, 'http://a').origin === 'http://a'
    ? next
    : '/account/';
}
