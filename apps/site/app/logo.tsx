// The WhyLikeDIs mark: an eye, flag blue with a gold iris.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="WhyLikeDIs"
    >
      <path
        d="M14 46 Q50 12 86 46"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M14 58 Q50 92 86 58"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="50" cy="52" r="12" fill="var(--chart-2)" />
    </svg>
  );
}
