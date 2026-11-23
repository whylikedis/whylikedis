'use client';

import { useRouter } from 'next/navigation';
import {
  ComboboxCompose,
  type ComboboxComposeItem,
} from '@/components/ui/combobox';

// "What did they hear?": type a few words of what the child came home with, pick the line, and go
// straight to its answer. The list is every claim we work on; one still being checked says so and
// leads to its chapter, where it is listed by its claim only.
type Item = ComboboxComposeItem & { href: string };

export function HeardSearch({ items }: { items: Item[] }) {
  const router = useRouter();
  const href = new Map(items.map((i) => [i.value, i.href]));
  return (
    <ComboboxCompose
      items={items}
      aria-label="What did your child hear?"
      placeholder="What did they hear? Try “apartheid” or “river”"
      emptyMessage="Nothing yet for that. Try one word from what they said."
      onValueChange={(item) => {
        const to = item && href.get(item.value);
        if (to) router.push(to);
      }}
    />
  );
}
