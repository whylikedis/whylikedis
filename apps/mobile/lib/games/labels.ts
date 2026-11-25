// Words the game screens share, so the home and a finished round never disagree.
export const streakLabel = (n: number) =>
  n === 0
    ? 'Play today to start a streak'
    : n === 1
      ? '1 day in a row'
      : `${n} days in a row`;

// ["A", "B", "C"] -> "A, B and C".
export const listOf = (names: readonly string[]) =>
  names.length < 2
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
