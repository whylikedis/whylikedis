# Intent: a fact base a critic can check

## Problem

A parent is asked a hard question about Israel and has two minutes to answer. Answers without
sources do not survive a teenager with a phone. Answers with sources that turn out to be misquoted
are worse than no answer.

## Proposed outcome

A public set of fact cards, one per claim a child hears. Every fact on a card has two independent
sources and the exact words quoted from each. One command proves it, and fails when a quote is no
longer on its page.

## Affected users and systems

- Parents, who read the answers.
- The teacher, who approves what is taught.
- Agents, who write and attack the cards.
- Critics, who will check the sources. They are the real test.

## Constraints

- No dependencies. One Python file.
- Nothing private in this repository.
- The agent that writes a card does not verify it.
- A verified card is not teaching content until the teacher approves it.

## Open questions

- Which licence for the cards and for the code.
- How to cite sources that only exist as PDFs or scans.
- How often to re-run the online check, and who reads the failures.
