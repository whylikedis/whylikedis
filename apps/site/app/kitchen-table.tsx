// A line drawing for the home page: a parent and a child at the table, each with something to say,
// and a source marker over the parent's answer. Strokes follow the theme: ink for the people, the
// brand blue for the answer, so it reads in the dark scheme too. Decorative, so hidden from readers.
const BLUE = { stroke: 'var(--primary)' };

export function KitchenTable() {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M40 300 H360" />
      <path d="M80 300 V360 M320 300 V360" />
      <circle cx="120" cy="150" r="30" />
      <path d="M70 300 C70 230 90 200 120 200 C150 200 170 230 172 300" />
      <circle cx="285" cy="185" r="24" />
      <path d="M245 300 C245 250 260 228 285 228 C310 228 325 250 325 300" />
      <path d="M190 300 v-22 h24 v22" />
      <path d="M214 284 c10 0 10 12 0 12" />
      <path
        style={BLUE}
        d="M210 70 h120 a14 14 0 0 1 14 14 v40 a14 14 0 0 1 -14 14 h-80 l-18 18 v-18 h-22 a14 14 0 0 1 -14 -14 v-40 a14 14 0 0 1 14 -14z"
      />
      <path style={BLUE} d="M226 96 h92 M226 114 h60" />
      <path d="M60 60 h96 a12 12 0 0 1 12 12 v32 a12 12 0 0 1 -12 12 h-50 l-14 14 v-14 h-32 a12 12 0 0 1 -12 -12 v-32 a12 12 0 0 1 12 -12z" />
      <path d="M76 82 h60 M76 98 h40" />
      <rect style={BLUE} x="300" y="40" width="34" height="20" rx="5" />
      <path style={BLUE} d="M309 50 h16" />
    </svg>
  );
}
