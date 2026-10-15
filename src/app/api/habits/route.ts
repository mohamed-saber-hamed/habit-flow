import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const habitSchema = z.object({
  title: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
  color: z.enum(["sage", "gold", "sky", "coral", "lilac"]),
  frequency: z.number().int().min(1).max(7),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  reminderTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.null()]),
  status: z.enum(["active", "completed", "archived"]).optional(),
}).strict();

type HabitLog = { completed_on: string };
type HabitRow = { id: string; title: string; category: string; color: "sage" | "gold" | "sky" | "coral" | "lilac"; frequency: number; scheduled_days: number[]; reminder_time: string | null; status: "active" | "completed" | "archived"; created_at: string; habit_logs: HabitLog[] | null };

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("habits").select("id,title,category,color,frequency,scheduled_days,reminder_time,status,created_at,habit_logs(completed_on)").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load habits." }, { status: 500 });
  const habits = ((data ?? []) as unknown as HabitRow[]).map((row) => ({
    id: row.id, title: row.title, category: row.category, color: row.color, frequency: row.frequency,
    scheduledDays: row.scheduled_days, reminderTime: row.reminder_time, status: row.status,
    createdAt: row.created_at.slice(0, 10), completedDates: (row.habit_logs ?? []).map((log) => log.completed_on),
  }));
  return NextResponse.json({ habits });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = habitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Habit details are invalid." }, { status: 400 });
  const input = parsed.data;
  if (new Set(input.scheduledDays).size !== input.scheduledDays.length || input.frequency !== input.scheduledDays.length) return NextResponse.json({ error: "Frequency must match the selected days." }, { status: 400 });
  const { data, error } = await auth.supabase.from("habits").insert({
    user_id: auth.user.id, title: input.title, category: input.category, color: input.color,
    frequency: input.frequency, scheduled_days: input.scheduledDays, reminder_time: input.reminderTime, status: input.status ?? "active",
  }).select("id,title,category,color,frequency,scheduled_days,reminder_time,status,created_at").single();
  if (error || !data) return NextResponse.json({ error: "Could not save habit." }, { status: 500 });
  return NextResponse.json({ habit: { id: data.id, title: data.title, category: data.category, color: data.color, frequency: data.frequency, scheduledDays: data.scheduled_days, reminderTime: data.reminder_time, status: data.status, createdAt: data.created_at.slice(0, 10), completedDates: [] } }, { status: 201 });
}
