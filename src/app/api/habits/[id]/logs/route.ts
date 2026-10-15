import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const logSchema = z.object({ completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completed: z.boolean() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Completion details are invalid." }, { status: 400 });
  const { id: habitId } = await context.params;
  const { completedOn, completed } = parsed.data;
  if (completed) {
    const { error } = await auth.supabase.from("habit_logs").insert({ habit_id: habitId, user_id: auth.user.id, completed_on: completedOn });
    if (error && error.code !== "23505") return NextResponse.json({ error: "Could not save check-in." }, { status: error.code === "23503" ? 404 : 500 });
  } else {
    const { error } = await auth.supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("user_id", auth.user.id).eq("completed_on", completedOn);
    if (error) return NextResponse.json({ error: "Could not remove check-in." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
