import { Badge } from '@/components/ui/badge';
import { ClaimCard } from '@/components/ui/patterns/claim-card';
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
    <ClaimCard className="card" id={c.id}>
      <ClaimCard.Status>
        {c.status === 'verified' ? (
          <Badge variant="success">Checked by a second reader</Badge>
        ) : (
          <Badge variant="outline">Still being checked</Badge>
        )}
        {rounds.map(([label, r]) =>
          r.verdict ? (
            <Badge variant={r.verdict === 'holds' ? 'outline' : 'warning'} key={label}>
              {label}: {r.verdict}
            </Badge>
          ) : null,
        )}
        {!c.content_approved && <Badge variant="outline">Not yet approved for teaching</Badge>}
      </ClaimCard.Status>
      <ClaimCard.Claim>{c.claim}</ClaimCard.Claim>
      <ClaimCard.Answer>{c.answer}</ClaimCard.Answer>
      <ClaimCard.Section
        title="Facts and sources"
        meta={`${c.facts.filter((f) => f.enough).length} of ${c.facts.length} fully sourced`}
      >
        <ol>
          {c.facts.map((f, i) => (
            <li key={i}>
              {f.text} {f.record && <Badge variant="outline">what a record says</Badge>}{' '}
              {!f.enough && <Badge variant="warning">short of sources</Badge>}
              <Sources list={f.sources} />
            </li>
          ))}
        </ol>
      </ClaimCard.Section>
      <ClaimCard.Section title="Who says this" meta={c.heard.length}>
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
      </ClaimCard.Section>
      <ClaimCard.Section title="Where the record is contested" meta={c.contested.length}>
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
      </ClaimCard.Section>
      <ClaimCard.Section title="What this card does not claim">
        <Plain items={c.not_claimed} />
      </ClaimCard.Section>
      <ClaimCard.Section title="What we could not verify" meta={c.could_not_verify?.length ?? 0}>
        <Plain items={c.could_not_verify ?? []} />
      </ClaimCard.Section>
      {rounds.length > 0 && (
        <ClaimCard.Section title="Review notes">
          {rounds.map(([label, r]) => (
            <p className="soft" key={label}>
              <b>{label[0].toUpperCase() + label.slice(1)}.</b> {r.notes}
            </p>
          ))}
        </ClaimCard.Section>
      )}
      <ClaimCard.Footer>
        Card <code>{c.id}</code>
      </ClaimCard.Footer>
    </ClaimCard>
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
