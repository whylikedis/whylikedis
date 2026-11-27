// What a route's parameters can be. A deep link (whylikedis://answers/x) hands the screen whatever
// the address held: a missing value, a repeated one (an array), or text no card has. These turn
// that into something a screen can trust.
export type Param = string | string[] | undefined;

export const firstParam = (v: Param): string | undefined =>
  (Array.isArray(v) ? v[0] : v) || undefined;

// A round is the daily question or a practice round; any other address is not a round at all (it
// used to be played, and counted toward the streak, as the daily).
export const roundMode = (v: Param): 'daily' | 'practice' | null => {
  const m = firstParam(v);
  return m === 'daily' || m === 'practice' ? m : null;
};
