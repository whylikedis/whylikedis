'use client';
import * as React from 'react';
import { Callout } from '@/components/ui/callout';
import { Calendar } from '@/components/ui/calendar';
import {
  addDays,
  toUtcDate,
  todayIn,
  weekdayOf,
} from '@/components/ui/calendar-model';
import { CelebrateCheck } from '@/components/ui/effects/celebrate';
import {
  Field,
  FieldControl,
  FieldError,
  FieldLabel,
} from '@/components/ui/form';
import { Grid, GridItem } from '@/components/ui/grid';
import { Input } from '@/components/ui/input';
import {
  MultiStepForm,
  MultiStepFormStep,
  MultiStepFormSummary,
} from '@/components/ui/patterns/multi-step-form';
import { TimeSlotPicker } from '@/components/ui/patterns/time-slot-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Cluster, Stack } from '@/components/ui/stack';
import { Textarea } from '@/components/ui/textarea';
import { Typography } from '@/components/ui/typography';
import { supabase } from '@/lib/supabase/client';
import { AUTH_ENABLED } from '@/lib/supabase/config';
import { useFormIntent } from '@/hooks/use-intent';

// With Supabase configured, the last step saves the request (public.session_requests, insert only)
// and the team is emailed about it. Without it, the flow is a preview that sends nothing. The times
// are an example week until real availability exists.
const ZONE = 'America/New_York';
const TIMES = ['10:00', '13:00', '17:30', '19:00', '20:30'];
const weekend = (d: string) => weekdayOf(d) === 6; // Saturday stays closed.
const slotsFor = (date: string | null) =>
  date ? TIMES.map((value) => ({ value })) : [];

const FOR = [
  ['family', 'My family', 'You, your kids, maybe the grandparents.'],
  [
    'group',
    'A group',
    'A school, a synagogue, a church, a company, a youth group or friends.',
  ],
] as const;

const dayName = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(toUtcDate(date))
    : '';

// Today in Eastern Time, read only in the browser, so the server HTML never fixes a stale day.
const noop = () => () => {};
function useToday() {
  return React.useSyncExternalStore(
    noop,
    () => todayIn(ZONE),
    () => null,
  );
}

export function BookingFlow({ topics }: { topics: string[] }) {
  const today = useToday();
  const [forWho, setForWho] = React.useState<string>('family');
  const [topic, setTopic] = React.useState('');
  const [date, setDate] = React.useState<string | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [who, setWho] = React.useState({ name: '', email: '' });
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // Started, sent, or left half-way: counted for the booking funnel, never what was typed.
  const intent = useFormIntent({ name: 'session_request' });
  const touched =
    forWho !== 'family' ||
    Boolean(topic || date || time || who.name || who.email);
  const { onChange: startIntent } = intent;
  React.useEffect(() => {
    if (touched) startIntent();
  }, [touched, startIntent]);

  async function send(data: FormData) {
    intent.markSubmitted();
    if (!AUTH_ENABLED) return setSent(true);
    setSending(true);
    setFailed(false);
    const text = (k: string) => String(data.get(k) ?? '').trim() || null;
    const { error } = await supabase()
      .from('session_requests')
      .insert({
        for_whom: forWho,
        topic: topic.trim() || null,
        day: date,
        time,
        time_zone: ZONE,
        name: who.name.trim(),
        email: who.email.trim(),
        notes: text('notes'),
      });
    setSending(false);
    if (error) setFailed(true);
    else setSent(true);
  }

  if (!today) return <Skeleton variant="card" />;

  if (sent)
    return (
      <Callout
        tone="info"
        title={AUTH_ENABLED ? 'Request sent' : 'Your request is ready'}
      >
        <Cluster gap="sm">
          <CelebrateCheck label="Done" tone="success" />
          <Typography>
            {AUTH_ENABLED
              ? 'Thank you. We will write to you to confirm the time.'
              : 'Bookings open soon, so nothing was sent yet. Thank you for trying it.'}
          </Typography>
        </Cluster>
      </Callout>
    );

  return (
    <MultiStepForm
      labels={{ submit: 'Request the session', submitting: 'Sending…' }}
      submitting={sending}
      onSubmit={(data) => void send(data)}
    >
      <MultiStepFormStep
        id="who-for"
        title="Who is it for?"
        description="A session is a guided talk about the questions kids bring home."
      >
        <Stack gap="lg">
          <RadioGroup
            name="for"
            value={forWho}
            onValueChange={(v) => setForWho(String(v))}
            aria-label="Who is it for?"
          >
            {FOR.map(([value, label, hint]) => (
              <Typography as="label" key={value}>
                <Cluster gap="sm" align="start">
                  <RadioGroupItem value={value} />
                  <Stack gap="xs">
                    <Typography as="span" variant="ui">
                      {label}
                    </Typography>
                    <Typography as="span" variant="ui-sm" tone="muted">
                      {hint}
                    </Typography>
                  </Stack>
                </Cluster>
              </Typography>
            ))}
          </RadioGroup>
          <Field name="topic">
            <FieldLabel>
              What would you like to talk about? (optional)
            </FieldLabel>
            <FieldControl
              render={
                <Input
                  list="session-topics"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              }
            />
            <datalist id="session-topics">
              {topics.map((t) => (
                <option value={t} key={t} />
              ))}
            </datalist>
          </Field>
        </Stack>
      </MultiStepFormStep>
      <MultiStepFormStep
        id="when"
        title="Pick a day and time"
        description="Times are in Eastern Time."
        validate={() =>
          !date || !time ? 'Pick a day and a time to go on.' : null
        }
      >
        <Grid gap="lg">
          <GridItem span={12} lgSpan={6}>
            <Calendar
              today={today}
              min={addDays(today, 1)}
              max={addDays(today, 60)}
              locale="en-US"
              value={date}
              onValueChange={(d) => {
                setDate(d);
                setTime(null);
              }}
              isDateUnavailable={weekend}
              isDateMarked={(d) => !weekend(d)}
              labels={{ marked: 'Times available' }}
            />
          </GridItem>
          <GridItem span={12} lgSpan={6}>
            <TimeSlotPicker
              key={date ?? 'none'}
              label={date ? dayName(date) : 'Pick a day first'}
              description="Eastern Time"
              slots={slotsFor(date)}
              value={time}
              onValueChange={setTime}
              name="time"
              locale="en-US"
              groupBy="period"
              labels={{ empty: 'Pick a day to see its times.' }}
            />
          </GridItem>
        </Grid>
        <input type="hidden" name="date" value={date ?? ''} />
      </MultiStepFormStep>
      <MultiStepFormStep
        id="details"
        title="Your details"
        description="We use your name and email only to arrange this session."
      >
        <Grid gap="md">
          <GridItem span={12} mdSpan={6}>
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <FieldControl
                render={
                  <Input
                    required
                    autoComplete="name"
                    value={who.name}
                    onChange={(e) => setWho({ ...who, name: e.target.value })}
                  />
                }
              />
              <FieldError />
            </Field>
          </GridItem>
          <GridItem span={12} mdSpan={6}>
            <Field name="email">
              <FieldLabel>Email</FieldLabel>
              <FieldControl
                render={
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={who.email}
                    onChange={(e) => setWho({ ...who, email: e.target.value })}
                  />
                }
              />
              <FieldError />
            </Field>
          </GridItem>
          <GridItem span={12}>
            <Field name="notes">
              <FieldLabel>Anything we should know (optional)</FieldLabel>
              <FieldControl render={<Textarea rows={3} />} />
            </Field>
          </GridItem>
        </Grid>
      </MultiStepFormStep>
      <MultiStepFormStep
        id="check"
        title="Check and request"
        description="Nothing is booked until we confirm it with you."
      >
        <MultiStepFormSummary
          items={[
            {
              label: 'For',
              value: FOR.find(([v]) => v === forWho)?.[1],
              step: 'who-for',
            },
            { label: 'Topic', value: topic || 'Open', step: 'who-for' },
            { label: 'Day', value: dayName(date), step: 'when' },
            { label: 'Time', value: time ? `${time} ET` : '', step: 'when' },
            { label: 'Name', value: who.name, step: 'details' },
            { label: 'Email', value: who.email, step: 'details' },
          ]}
        />
        {failed && (
          <Callout tone="danger" title="That did not go through">
            Please try again in a moment.
          </Callout>
        )}
      </MultiStepFormStep>
    </MultiStepForm>
  );
}
