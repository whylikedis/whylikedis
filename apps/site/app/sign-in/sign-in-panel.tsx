'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { OtpField } from '@/components/ui/otp-field';
import { SocialSignIn } from '@/components/ui/patterns/social-sign-in';
import { readLastSignIn, rememberSignIn } from '@/lib/last-sign-in';
import { supabase } from '@/lib/supabase/client';
import {
  AUTH_ENABLED,
  ENABLED_PROVIDERS,
  PROVIDERS,
  safeNext,
  type ProviderId,
} from '@/lib/supabase/config';

// What a reason in ?error= means, in words a parent can act on.
const ERRORS: Record<string, string> = {
  cancelled: 'That sign-in was cancelled. Try again, or choose another way in.',
  access_denied:
    'That sign-in was cancelled. Try again, or choose another way in.',
  unavailable: 'Signing in is not open yet.',
  otp_expired: 'That code or link has expired. Ask for a new one.',
};
const errorText = (code: string | null) =>
  code
    ? (ERRORS[code] ?? 'Something went wrong signing you in. Please try again.')
    : undefined;

export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [lastUsed, setLastUsed] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState(errorText(params.get('error')));
  const [codeError, setCodeError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const codeId = useId();

  useEffect(() => setLastUsed(readLastSignIn()), []);

  if (!AUTH_ENABLED) {
    return (
      <p className="text-muted-foreground">
        Accounts are not open yet. Everything on the site works without one.{' '}
        <Link href="/" className="underline underline-offset-2">
          Back to the start
        </Link>
      </p>
    );
  }

  const callback = () =>
    `${window.location.origin}/auth/callback/?next=${encodeURIComponent(next)}`;

  const withProvider = async (id: string) => {
    setError(undefined);
    const p = PROVIDERS[id as ProviderId];
    rememberSignIn(id);
    const { error: e } = await supabase().auth.signInWithOAuth({
      provider: p.supabase,
      options: { redirectTo: callback(), scopes: p.scopes },
    });
    // On success the browser is already leaving for the provider.
    if (e) setError(errorText(e.code ?? 'failed'));
  };

  const withEmail = async (email: string) => {
    setError(undefined);
    const { error: e } = await supabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: callback() },
    });
    if (e) {
      setError(
        e.code === 'over_email_send_rate_limit'
          ? 'Too many emails just now. Wait a minute and try again.'
          : errorText(e.code ?? 'failed'),
      );
      return;
    }
    rememberSignIn('email');
    setSentTo(email);
  };

  const verify = async (token: string) => {
    if (!sentTo) return;
    setVerifying(true);
    setCodeError(undefined);
    const { error: e } = await supabase().auth.verifyOtp({
      email: sentTo,
      token,
      type: 'email',
    });
    setVerifying(false);
    if (e) {
      setCodeError(
        e.code === 'otp_expired'
          ? ERRORS.otp_expired
          : 'That code does not match. Check the email and try again.',
      );
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <SocialSignIn
        providers={ENABLED_PROVIDERS}
        lastUsed={lastUsed}
        onProviderSelect={withProvider}
        email
        onEmailSubmit={withEmail}
        emailSubmitLabel="Email me a code"
        sentTo={sentTo}
        sentTitle="Check your email"
        sentMessage={(address) =>
          `We sent a 6-digit code to ${address}. You can also press the link in that email.`
        }
        onUseAnotherEmail={() => {
          setSentTo(undefined);
          setCodeError(undefined);
        }}
        error={error}
      />
      {sentTo ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={codeId} className="text-sm font-medium">
            Code from the email
          </label>
          <OtpField
            id={codeId}
            onValueComplete={verify}
            disabled={verifying}
            invalid={Boolean(codeError)}
            aria-describedby={codeError ? `${codeId}-error` : undefined}
          />
          {codeError ? (
            <p
              id={`${codeId}-error`}
              role="alert"
              className="text-destructive text-sm"
            >
              {codeError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
