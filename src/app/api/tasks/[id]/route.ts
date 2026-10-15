import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const taskUpdateSchema = z.object({ title: z.string().trim().min(1).max(120).optional(), dueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(), done: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Task details are invalid." }, { status: 400 });
  const update: Record<string, string | boolean | null> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.dueDate !== undefined) update.due_date = parsed.data.dueDate;
  if (parsed.data.done !== undefined) update.completed = parsed.data.done;
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("tasks").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update task." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const { data, error } = await auth.supabase.from("tasks").delete().eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete task." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
