import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  color: z.enum(["sage", "gold", "sky", "coral", "lilac"]).optional(),
  frequency: z.number().int().min(1).max(7).optional(),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  reminderTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.null()]).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Habit details are invalid." }, { status: 400 });
  const input = parsed.data;
  if (input.scheduledDays && new Set(input.scheduledDays).size !== input.scheduledDays.length) return NextResponse.json({ error: "Days must be unique." }, { status: 400 });
  if (input.frequency !== undefined && input.scheduledDays && input.frequency !== input.scheduledDays.length) return NextResponse.json({ error: "Frequency must match the selected days." }, { status: 400 });
  const update: Record<string, string | number | number[] | null> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.category !== undefined) update.category = input.category;
  if (input.color !== undefined) update.color = input.color;
  if (input.frequency !== undefined) update.frequency = input.frequency;
  if (input.scheduledDays !== undefined) update.scheduled_days = input.scheduledDays;
  if (input.reminderTime !== undefined) update.reminder_time = input.reminderTime;
  if (input.status !== undefined) update.status = input.status;
  if (input.scheduledDays && input.frequency === undefined) update.frequency = input.scheduledDays.length;
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("habits").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update habit." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("habits").delete().eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete habit." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
