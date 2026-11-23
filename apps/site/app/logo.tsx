// The WhyLikeDIs mark: an Israeli street sign. Israeli signs carry Hebrew, Arabic and English,
// so the name is said three ways, the way the country itself writes it: למה ככה, ليش هيك, WhyLikeDis.
// Flag blue sign, white face, a blue inner rule. The fonts come from layout.tsx (Heebo, Noto Naskh Arabic).
export function Logo({ height = 56 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 150 96"
      height={height}
      width={(height * 150) / 96}
      role="img"
      aria-label="WhyLikeDIs"
    >
      <rect
        x="1.5"
        y="1.5"
        width="147"
        height="93"
        rx="10"
        fill="#fff"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <rect
        x="7"
        y="7"
        width="136"
        height="82"
        rx="6"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <g fill="var(--primary)" textAnchor="middle">
        <text
          x="75"
          y="35"
          fontSize="22"
          fontWeight="800"
          direction="rtl"
          style={{ fontFamily: 'var(--font-heebo)' }}
        >
          למה ככה
        </text>
        <text
          x="75"
          y="58"
          fontSize="19"
          fontWeight="700"
          direction="rtl"
          style={{ fontFamily: 'var(--font-naskh)' }}
        >
          ليش هيك
        </text>
        <text
          x="75"
          y="80"
          fontSize="17"
          fontWeight="800"
          letterSpacing="0.6"
          style={{ fontFamily: 'var(--font-heebo)' }}
        >
          WHYLIKEDIS
        </text>
      </g>
    </svg>
  );
}
