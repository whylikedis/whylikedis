import { Badge } from '@/components/ui/badge';
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
      <p className="badges">
        {c.status === 'verified' ? (
          <Badge>Checked by a second reader</Badge>
        ) : (
          <Badge variant="outline">Still being checked</Badge>
        )}
        {rounds.map(([label, r]) =>
          r.verdict ? (
            <Badge
              variant="outline"
              className={r.verdict === 'holds' ? undefined : 'border-warning text-warning'}
              key={label}
            >
              {label}: {r.verdict}
            </Badge>
          ) : null,
        )}
        {!c.content_approved && <Badge variant="outline">Not yet approved for teaching</Badge>}
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
              {f.record && <Badge variant="outline">what a record says</Badge>}
              {!f.enough && (
                <Badge variant="outline" className="border-warning text-warning">
                  short of sources
                </Badge>
              )}
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
        Card <code>{c.id}</code>
      </p>
    </article>
  );
}

export default function Facts() {
  const n = counts();
  return (
    <>
      <p className="label">Answers</p>
      <h1 style={{ paddingTop: 0 }}>Answers to what your child hears about Israel</h1>
      <p className="lede">
        Each card gives an answer a parent can say in two minutes, the facts behind it with the exact words quoted from
        each source, where the record is disputed, and what the card does not claim.
      </p>
      <div className="nums">
        <div>
          <b>{n.verified}</b>checked by a second reader
        </div>
        <div>
          <b>{n.cards - n.verified}</b>still being checked
        </div>
        <div>
          <b>{n.approved}</b>approved for teaching
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
                  Still being checked:
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
