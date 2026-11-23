import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { counts, site } from './data';

export default function Home() {
  const n = counts();
  return (
    <>
      <p className="brand">
        <svg
          viewBox="0 0 100 100"
          width="44"
          height="44"
          role="img"
          aria-label="WhyLikeDIs mark: an eye"
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
        WhyLikeDIs
      </p>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          Clear answers about Israel, each with sources you can check.
        </h1>
        <p className="lede">
          When your child comes home with a claim about Israel, find an answer
          you can give in two minutes, the other side in its own words, and the
          source for every fact.
        </p>
        <div className="actions">
          <Link href="/facts/" className={buttonVariants({ size: 'lg' })}>
            See the answers
          </Link>
          <Link href="/method/">How we check</Link>
        </div>
      </section>
      <div className="nums">
        <div>
          <b>{n.verified}</b>answers checked by a second reader
        </div>
        <div>
          <b>{n.quotes}</b>source quotes you can check
        </div>
        <div>
          <b>{n.cards}</b>questions we are working on
        </div>
      </div>
      <p className="soft">
        An answer is published in full only after someone who did not write it
        has tried to break it. The rest are still being checked, and each one
        says so.
      </p>
      <h2>Where we stand</h2>
      {/* Built by export.py from docs/chapters.md, every character escaped before any tag is added. */}
      <div dangerouslySetInnerHTML={{ __html: site.standing }} />
    </>
  );
}
