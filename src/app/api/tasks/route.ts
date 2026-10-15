import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const taskSchema = z.object({ title: z.string().trim().min(1).max(120), dueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]) }).strict();

type TaskRow = { id: string; title: string; due_date: string | null; completed: boolean; created_at: string };

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("tasks").select("id,title,due_date,completed,created_at").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Could not load tasks." }, { status: 500 });
  const tasks = ((data ?? []) as TaskRow[]).map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, done: task.completed, createdAt: task.created_at.slice(0, 10) }));
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Task details are invalid." }, { status: 400 });
  const { data, error } = await auth.supabase.from("tasks").insert({ user_id: auth.user.id, title: parsed.data.title, due_date: parsed.data.dueDate }).select("id,title,due_date,completed,created_at").single();
  if (error || !data) return NextResponse.json({ error: "Could not save task." }, { status: 500 });
  return NextResponse.json({ task: { id: data.id, title: data.title, dueDate: data.due_date, done: data.completed, createdAt: data.created_at.slice(0, 10) } }, { status: 201 });
}
