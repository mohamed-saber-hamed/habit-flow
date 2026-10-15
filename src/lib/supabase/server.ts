import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie writes can be unavailable in server components; route handlers can set them.
        }
      },
    },
  });
}

type UserContext = { ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse };

export async function requireUser(): Promise<UserContext> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, response: NextResponse.json({ error: "Cloud database is not configured." }, { status: 503 }) };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  return { ok: true, supabase, user: data.user };
}
