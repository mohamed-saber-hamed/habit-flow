"use client";

import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, LockKeyhole, Sprout } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!url || !key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- No auth session is available to await when cloud settings are absent.
      setReady(true);
      return;
    }
    const client = createBrowserClient(url, key);
    let mounted = true;
    void client.auth.getSession().then(({ data }) => {
      if (mounted) { setHasSession(Boolean(data.session)); setReady(true); }
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) { setHasSession(Boolean(session)); setReady(true); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirmation) return setError("The passwords don’t match.");
    if (!url || !key) return setError("Cloud accounts are not configured for this preview.");
    setBusy(true); setError("");
    try {
      const client = createBrowserClient(url, key);
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      setMessage("Your password is updated. Returning to Habit Flow…");
      window.setTimeout(() => { router.replace("/"); router.refresh(); }, 900);
    } finally { setBusy(false); }
  };

  return <main className="auth-gate"><section className="auth-gate-card"><div className="brand-mark"><span className="brand-icon"><Sprout size={18} /></span><span>habit<span className="brand-light">flow</span><sup>®</sup></span></div><div className="auth-gate-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-sun"><LockKeyhole size={22} /></div><div className="art-plant"><Sprout size={64} strokeWidth={1.15} /></div></div><p className="eyebrow">A FRESH START</p><h1>Choose a new<br /><em>password.</em></h1>{!ready ? <p className="auth-gate-copy">Checking your secure link…</p> : !hasSession ? <><p className="auth-gate-copy">This reset link is unavailable or has expired. Request a new one from the sign-in screen.</p><Link className="button button-primary button-wide" href="/">Return to Habit Flow <ArrowRight size={16} /></Link></> : <form className="modal-form" onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required /></label><label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={8} placeholder="Enter it once more" required /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-error" role="status">{message}</p>}<button className="button button-primary button-wide" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}<ArrowRight size={16} /></button></form>}<p className="auth-gate-foot">Your account stays private to you.</p></section></main>;
}
