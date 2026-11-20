import Link from 'next/link';
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
            stroke="var(--flag-blue)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M14 58 Q50 92 86 58"
            fill="none"
            stroke="var(--flag-blue)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle cx="50" cy="52" r="12" fill="var(--gold)" />
        </svg>
        WhyLikeDIs
      </p>
      <h1>Clear answers about Israel, each with sources you can check.</h1>
      <p className="lede">
        We are building a fact base for parents: one card for each claim a child
        hears. Each card gives an answer in plain words, the facts behind it
        with the exact words quoted from every source, where the record is
        disputed, and what the card does not claim.
      </p>
      <div className="nums">
        <div>
          <b>{n.cards}</b>cards so far
        </div>
        <div>
          <b>{n.verified}</b>verified by a second reader
        </div>
        <div>
          <b>{n.sourced}</b>of {n.facts} facts fully sourced
        </div>
      </div>
      <p>
        Most cards are still drafts, and each one says so. A card is verified
        only after a reader who did not write it has tried to break it, every
        sentence of the answer is tied to a fact, and every quote has been found
        on its page.
      </p>
      <p>
        <Link href="/facts/">Read the fact base</Link> ·{' '}
        <Link href="/method/">How we check</Link> ·{' '}
        <Link href="/questions/">Questions we tested</Link>
      </p>
      <h2>Where we stand</h2>
      {/* Built by export.py from docs/chapters.md, every character escaped before any tag is added. */}
      <div dangerouslySetInnerHTML={{ __html: site.standing }} />
    </>
  );
}
