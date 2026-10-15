"use client";

import { CalendarDays, Clock3, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Habit, HabitStatus, Task } from "@/lib/types";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const CATEGORY_OPTIONS = ["Wellness", "Movement", "Learning", "Mindfulness", "Rest", "Growth", "Other"];
const COLOR_OPTIONS: Habit["color"][] = ["sage", "gold", "sky", "coral", "lilac"];

type HabitFields = Omit<Habit, "id" | "completedDates" | "createdAt">;

export function HabitModal({ habit, onClose, onSave }: { habit?: Habit; onClose: () => void; onSave: (fields: HabitFields) => Promise<void> }) {
  const [title, setTitle] = useState(habit?.title ?? "");
  const [category, setCategory] = useState(habit?.category ?? "Wellness");
  const [scheduledDays, setScheduledDays] = useState<number[]>(habit?.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? "");
  const [color, setColor] = useState<Habit["color"]>(habit?.color ?? "sage");
  const [status, setStatus] = useState<HabitStatus>(habit?.status ?? "active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (day: number) => setScheduledDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return setError("Give your habit a name first.");
    if (!scheduledDays.length) return setError("Choose at least one day for this habit.");
    setBusy(true);
    setError("");
    try {
      await onSave({ title: title.trim(), category, scheduledDays, frequency: scheduledDays.length, reminderTime: reminderTime || null, color, status });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your habit.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card habit-modal" role="dialog" aria-modal="true" aria-labelledby="habit-modal-title"><div className="modal-header"><div className="modal-icon"><Plus size={18} /></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><p className="eyebrow">MAKE IT YOURS</p><h2 id="habit-modal-title">{habit ? "Edit your habit" : "Plant a new habit."}</h2><p className="modal-subtitle">Keep it simple. You can adjust your rhythm any time.</p></div><form className="modal-form" onSubmit={submit}>
    <label>What would you like to do?<input autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Take a mindful walk" required /></label>
    <div className="form-two-col"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label><span className="label-icon"><Clock3 size={13} /> Reminder <span className="optional-label">(optional)</span></span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label></div>
    <fieldset className="day-picker"><legend><span className="label-icon"><CalendarDays size={14} /> Your weekly rhythm</span><small>{scheduledDays.length} day{scheduledDays.length === 1 ? "" : "s"} a week</small></legend><div className="day-picker-row">{WEEK_DAYS.map((label, index) => <button key={label} type="button" className={`day-chip ${scheduledDays.includes(index) ? "day-chip-on" : ""}`} onClick={() => toggleDay(index)} aria-pressed={scheduledDays.includes(index)}>{label}</button>)}</div></fieldset>
    <fieldset className="color-picker"><legend>Pick a color</legend><div className="color-picker-row">{COLOR_OPTIONS.map((value) => <button key={value} className={`color-choice color-${value} ${color === value ? "color-choice-on" : ""}`} type="button" onClick={() => setColor(value)} aria-label={`${value} color`} aria-pressed={color === value}><span /></button>)}</div></fieldset>
    {habit && <label>Habit shelf<select value={status} onChange={(event) => setStatus(event.target.value as HabitStatus)}><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="modal-footer"><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : habit ? "Save changes" : "Create habit"}</button></div>
  </form></section></div>;
}

export function TaskModal({ onClose, onSave }: { onClose: () => void; onSave: (fields: Pick<Task, "title" | "dueDate">) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return setError("Add a few words to your task.");
    setBusy(true);
    setError("");
    try { await onSave({ title: title.trim(), dueDate: dueDate || null }); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save your task."); }
    finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-header"><div className="modal-icon modal-icon-peach"><CalendarDays size={18} /></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><p className="eyebrow">CLEAR A LITTLE SPACE</p><h2 id="task-modal-title">Add a gentle to-do.</h2><p className="modal-subtitle">Write it down, then let your mind rest.</p></div><form className="modal-form" onSubmit={submit}><label>What needs a little attention?<input autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pick up a book from the library" required /></label><label>When would you like to do it?<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-footer"><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Adding…" : "Add to list"}</button></div></form></section></div>;
}
