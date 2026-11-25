// How many updates the player has not seen yet, for the Updates tab's badge. A badge reads "9+"
// past nine, and none at zero.
export function unreadCount(
  updates: readonly { id: string }[],
  seen: readonly string[] | undefined,
): number {
  const s = new Set(seen ?? []);
  return updates.filter((u) => !s.has(u.id)).length;
}

export const badgeText = (n: number): string | undefined =>
  n <= 0 ? undefined : n > 9 ? '9+' : String(n);
