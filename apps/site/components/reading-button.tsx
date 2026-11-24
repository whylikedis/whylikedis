'use client';

import { TypeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ContrastToggle,
  TextSizeControl,
} from '@/components/ui/reading-settings';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';

// "Reading" in the top bar: a reader who finds the text small or faint can make it bigger or
// stronger, and the choice is kept for their next visit (THEME_SCRIPT in the layout puts it back
// before the first paint). Two controls behind one button keep the bar calm.
export function ReadingButton() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          // Icon only: at the largest text size a labelled button pushed the bar past a
          // 360px phone. The name is still read out, and shown on hover.
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reading settings"
            title="Reading settings"
          >
            <TypeIcon aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent align="end">
        <Stack gap="sm">
          <Typography as="p" variant="ui-sm" tone="muted">
            Text size
          </Typography>
          <TextSizeControl />
          <ContrastToggle />
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
