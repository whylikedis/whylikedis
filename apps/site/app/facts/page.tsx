import { type Card, PREVIEW, type Round, type Source, counts, site } from '../data';

export const metadata = { title: 'Fact base' };

// The gate allows only https links. This is the same rule at the last step before a reader's click.
const safe = (url: string) => (url.startsWith('https://') ? url : undefined);

const Sources = ({ list }: { list: Source[] }) => (
  <ul>
    {list.map((s, i) => (
      <li className="src" key={i}>
        <a href={safe(s.url)} rel="noopener noreferrer">
          {s.publisher}
        </a>{' '}
        <span className="soft">
          ({s.kind}
          {s.wire ? `, ${s.wire} copy` : ''})
        </span>
        <blockquote>{s.quote}</blockquote>
      </li>
    ))}
  </ul>
);

const Plain = ({ items }: { items: string[] }) => (
  <ul>{items.length ? items.map((x, i) => <li key={i}>{x}</li>) : <li>Nothing recorded.</li>}</ul>
);

const ROUNDS = [
  ['skeptic', 'attack round'],
  ['citer', 'citation round'],
] as const;

function CardView({ c }: { c: Card }) {
  const rounds = ROUNDS.flatMap(([who, label]): [string, Round][] => {
    const r = c.review?.[who];
    return r ? [[label, r]] : [];
  });
  return (
    <article className="card" id={c.id}>
      <p>
        <span className={c.status === 'verified' ? 'tag ok' : 'tag'}>{c.status}</span>
        {rounds.map(([label, r]) =>
          r.verdict ? (
            <span className={r.verdict === 'holds' ? 'tag' : 'tag warn'} key={label}>
              {label}: {r.verdict}
            </span>
          ) : null,
        )}
        {!c.content_approved && <span className="tag">not approved as teaching content</span>}
      </p>
      <h3>
        <q>{c.claim}</q>
      </h3>
      <p>{c.answer}</p>
      <details>
        <summary>
          Facts and sources ({c.facts.filter((f) => f.enough).length} of {c.facts.length} fully sourced)
        </summary>
        <ol>
          {c.facts.map((f, i) => (
            <li key={i}>
              {f.text}
              {f.record && <span className="tag"> what a record says</span>}
              {!f.enough && <span className="tag warn"> short of sources</span>}
              <Sources list={f.sources} />
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>Who says this ({c.heard.length})</summary>
        <ul>
          {c.heard.map((h, i) => (
            <li className="src" key={i}>
              {h.who}:{' '}
              <a href={safe(h.url)} rel="noopener noreferrer">
                source
              </a>
              <blockquote>{h.quote}</blockquote>
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Where the record is contested ({c.contested.length})</summary>
        <ul>
          {c.contested.length ? (
            c.contested.map((x, i) =>
              typeof x === 'string' ? (
                <li key={i}>{x}</li>
              ) : (
                <li key={i}>
                  {x.text}
                  <Sources list={x.sources ?? []} />
                </li>
              ),
            )
          ) : (
            <li>Nothing recorded.</li>
          )}
        </ul>
      </details>
      <details>
        <summary>What this card does not claim</summary>
        <Plain items={c.not_claimed} />
      </details>
      <details>
        <summary>What we could not verify ({c.could_not_verify?.length ?? 0})</summary>
        <Plain items={c.could_not_verify ?? []} />
      </details>
      {rounds.length > 0 && (
        <details>
          <summary>Review notes</summary>
          {rounds.map(([label, r]) => (
            <p className="soft" key={label}>
              <b>{label[0].toUpperCase() + label.slice(1)}.</b> {r.notes}
            </p>
          ))}
        </details>
      )}
      <p className="soft">
        <code>{c.id}</code>
      </p>
    </article>
  );
}

export default function Facts() {
  const n = counts();
  return (
    <>
      <p className="label">The fact base</p>
      <h1 style={{ paddingTop: 0 }}>One card for each claim a child hears</h1>
      <p className="lede">
        Each card gives an answer a parent can say in two minutes, the facts behind it with the exact words quoted from
        each source, where the record is disputed, and what the card does not claim.
      </p>
      <div className="nums">
        <div>
          <b>{n.cards}</b>cards
        </div>
        <div>
          <b>{n.verified}</b>verified by a second reader
        </div>
        <div>
          <b>{n.sourced}</b>of {n.facts} facts fully sourced
        </div>
        <div>
          <b>{n.approved}</b>approved as teaching content
        </div>
      </div>
      <ul className="chips">
        {site.chapters.map((ch) => (
          <li key={ch.n}>
            <a href={`#ch${ch.n}`}>
              {ch.n}. {ch.title}
            </a>
          </li>
        ))}
      </ul>
      {site.chapters.map((ch) => {
        const mine = site.cards.filter((c) => c.era === ch.n);
        // The hosted site shows a card in full only once it is verified; drafts are listed by their
        // claim, so nobody mistakes an unreviewed answer for a checked one.
        const full = mine.filter((c) => PREVIEW || c.status === 'verified');
        const drafts = mine.filter((c) => !full.includes(c));
        return (
          <section key={ch.n}>
            <h2 id={`ch${ch.n}`}>
              {ch.n}. {ch.title}
            </h2>
            {full.map((c) => (
              <CardView c={c} key={c.id} />
            ))}
            {drafts.length > 0 && (
              <>
                <p className="soft" style={{ marginTop: 18 }}>
                  In review, not yet verified:
                </p>
                <ul>
                  {drafts.map((c) => (
                    <li key={c.id}>
                      <q>{c.claim}</q>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
