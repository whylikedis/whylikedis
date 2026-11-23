'use client';

// A client module, so DialogueStepper sees its own Step and Choices parts (a server component hands
// it client references it cannot tell apart). Every word comes from the card, passed in as data.
import { Citation } from '@/components/ui/patterns/citation';
import { Dialogue } from '@/components/ui/patterns/dialogue';
import {
  DialogueChoice,
  DialogueChoices,
  DialogueStep,
  DialogueStepper,
} from '@/components/ui/patterns/dialogue-stepper';
import type { Line } from './answer-parts';

// Answer lines as one reply, each sentence with its source chip.
function Said({ lines }: { lines: Line[] }) {
  return lines.map((l, i) => (
    <span key={i}>
      <Citation marker="chip" sources={l.sources} chipLabel={l.chip}>
        {l.says}
      </Citation>{' '}
    </span>
  ));
}

type Props = { claim: string; first: Line[]; more: Line[]; argued?: string };

// The reader steps through it: each "What do I say?" reveals the next line, and a follow-up can go
// deeper or jump to what is still argued. Without JS it reads in full.
export function PracticeTalk({ claim, first, more, argued }: Props) {
  return (
    <DialogueStepper
      start="heard"
      speakers="inside"
      aria-label="Practice the talk: an example conversation"
    >
      <DialogueStep id="heard">
        <Dialogue.Turn speaker="Your kid" tone="muted">
          Someone at school said this: {claim}
        </Dialogue.Turn>
        <DialogueChoices>
          <DialogueChoice next="say">What do I say?</DialogueChoice>
        </DialogueChoices>
      </DialogueStep>
      <DialogueStep id="say">
        <Dialogue.Turn speaker="You" side="end" tone="inverse">
          <Said lines={first} />
        </Dialogue.Turn>
        <DialogueChoices>
          {more.length > 0 && (
            <DialogueChoice next="more">They ask: “What else?”</DialogueChoice>
          )}
          {argued && (
            <DialogueChoice next="who">
              They ask: “So who is right?”
            </DialogueChoice>
          )}
        </DialogueChoices>
      </DialogueStep>
      {more.length > 0 && (
        <DialogueStep id="more">
          <Dialogue.Turn speaker="Your kid" tone="muted">
            What else?
          </Dialogue.Turn>
          <Dialogue.Turn speaker="You" side="end" tone="inverse">
            <Said lines={more} />
          </Dialogue.Turn>
          {argued && (
            <DialogueChoices>
              <DialogueChoice next="who">
                They ask: “So who is right?”
              </DialogueChoice>
            </DialogueChoices>
          )}
        </DialogueStep>
      )}
      {argued && (
        <DialogueStep id="who">
          <Dialogue.Turn speaker="Your kid" tone="muted">
            So who is right?
          </Dialogue.Turn>
          <Dialogue.Turn speaker="You" side="end" tone="inverse">
            That part is still argued. {argued}
          </Dialogue.Turn>
        </DialogueStep>
      )}
    </DialogueStepper>
  );
}
