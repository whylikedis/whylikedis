// The games the Play section lists, in order. A live game has its own routes under
// app/play/<id>/; a coming one is shown as a promise, never as a dead button.
import { WWYS } from '@whylikedis/games';

export type CatalogEntry = {
  id: string;
  title: string;
  status: 'live' | 'coming';
  players: '1' | '2' | 'group';
};

export const CATALOG: readonly CatalogEntry[] = [
  { id: WWYS, title: 'What would you say?', status: 'live', players: '1' },
  { id: 'closer', title: 'Closer', status: 'coming', players: '1' },
  {
    id: 'before-or-after',
    title: 'Before or after',
    status: 'coming',
    players: '1',
  },
  {
    id: 'with-friends',
    title: 'Playing with friends',
    status: 'coming',
    players: 'group',
  },
];

export const comingSoon = () => CATALOG.filter((g) => g.status === 'coming');
