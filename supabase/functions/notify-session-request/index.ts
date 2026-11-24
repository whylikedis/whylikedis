// Emails the team when a session request arrives. Called by a Database Webhook on
// INSERT into public.session_requests (Supabase dashboard > Database > Webhooks), with the
// header `x-webhook-secret` set to WEBHOOK_SECRET.
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY  an API key from resend.com
//   NOTIFY_TO       where the email goes
//   NOTIFY_FROM     a sender on a domain verified in Resend, e.g. "WhyLikeDIs <sessions@…>"
//   WEBHOOK_SECRET  any long random string, the same one the webhook sends

type Request = {
  for_whom: string;
  topic: string | null;
  day: string;
  time: string;
  time_zone: string;
  name: string;
  email: string;
  notes: string | null;
};

const env = (k: string) => Deno.env.get(k) ?? '';

Deno.serve(async (req) => {
  if (
    req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET') ||
    !env('WEBHOOK_SECRET')
  )
    return new Response('forbidden', { status: 403 });
  const { type, record } = (await req.json()) as {
    type: string;
    record: Request;
  };
  if (type !== 'INSERT') return new Response('ignored');

  const lines = [
    `For: ${record.for_whom === 'group' ? 'a group' : 'a family'}`,
    `Topic: ${record.topic || 'open'}`,
    `When: ${record.day} at ${record.time} (${record.time_zone})`,
    `Name: ${record.name}`,
    `Email: ${record.email}`,
    record.notes ? `Notes: ${record.notes}` : '',
  ].filter(Boolean);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env('NOTIFY_FROM'),
      to: env('NOTIFY_TO'),
      reply_to: record.email,
      subject: `Session request: ${record.name}, ${record.day} ${record.time}`,
      text: lines.join('\n'),
    }),
  });
  return new Response(res.ok ? 'sent' : 'send failed', {
    status: res.ok ? 200 : 502,
  });
});
