"use client";

import {
  Activity,
  Archive,
  ArrowDownRight,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Droplets,
  Dumbbell,
  FileText,
  Flame,
  Heart,
  LayoutDashboard,
  ListChecks,
  Moon,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { currentStreak, dateKey, longestStreak, shiftDateKey, weekKeys, weekdayForKey } from "@/lib/metrics.mjs";
import type { AppData, AppView, Habit, HabitStatus, Task } from "@/lib/types";
import { HabitModal, TaskModal } from "@/components/modals";

const STORAGE_KEY = "habit-flow:data:v1";
const LEGACY_SAMPLE_HABIT_IDS = new Set(["demo-water", "demo-move", "demo-read", "demo-mind", "demo-sleep", "demo-skill", "demo-journal"]);
const LEGACY_SAMPLE_TASK_IDS = new Set(["task-plan", "task-book", "task-review"]);
const EMPTY_DATA: AppData = { habits: [], tasks: [] };
const THEME_KEY = "habit-flow:theme";
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const NAV_ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "habits", label: "My habits", icon: Sprout },
  { id: "reports", label: "Insights", icon: Activity },
  { id: "tasks", label: "To-do list", icon: ListChecks },
];
const BACKEND_READY = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const THEME_EVENT = "habit-flow:theme-change";
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wellness: Heart,
  water: Droplets,
  movement: Dumbbell,
  exercise: Dumbbell,
  learning: BookOpen,
  reading: BookOpen,
  mindfulness: Sparkles,
  rest: Moon,
  growth: Sprout,
};

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getThemeSnapshot(): "light" | "dark" {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

function setStoredTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

function getBrowserClient() {
  if (!BACKEND_READY) return null;
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function safeParseData(value: string | null): AppData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as AppData;
    if (Array.isArray(parsed.habits) && Array.isArray(parsed.tasks)) {
      return {
        habits: parsed.habits.filter((habit) => !LEGACY_SAMPLE_HABIT_IDS.has(habit.id)),
        tasks: parsed.tasks.filter((task) => !LEGACY_SAMPLE_TASK_IDS.has(task.id)),
      };
    }
  } catch {
    return null;
  }
  return null;
}

function csvCell(value: string | number | boolean | null) {
  const safe = String(value ?? "").replaceAll('"', '""');
  return `"${safe}"`;
}

function initials(email: string | null) {
  if (!email) return "M";
  return email.split("@")[0].split(/[._-]/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

export default function HabitFlowApp() {
  const [data, setData] = useState<AppData>({ habits: [], tasks: [] });
  const [today, setToday] = useState("2000-01-01");
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(!BACKEND_READY);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light" as const);
  const setTheme = setStoredTheme;
  const [habitModal, setHabitModal] = useState<{ open: boolean; habit?: Habit }>({ open: false });
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [searchText, setSearchText] = useState("");
  const [habitStatusFilter, setHabitStatusFilter] = useState<HabitStatus | "all">("active");
  const [weekOffset, setWeekOffset] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const activeHabits = data.habits.filter((habit) => habit.status === "active");
  const doneToday = activeHabits.filter((habit) => habit.completedDates.includes(today)).length;
  const plannedToday = activeHabits.filter((habit) => habit.scheduledDays.includes(weekdayForKey(today))).length;
  const completionPercent = plannedToday ? Math.round((doneToday / plannedToday) * 100) : 0;
  const bestStreak = Math.max(0, ...data.habits.map((habit) => longestStreak(habit.completedDates, habit.scheduledDays)));
  const strongestCurrentStreak = Math.max(0, ...activeHabits.map((habit) => currentStreak(habit.completedDates, habit.scheduledDays, today)));
  const todayHabits = activeHabits.filter((habit) => habit.scheduledDays.includes(weekdayForKey(today)));
  const currentWeek = weekKeys(today, weekOffset);
  const weekLabel = `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${currentWeek[0]}T12:00:00`))} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${currentWeek[6]}T12:00:00`))}`;
  const pageTitle = NAV_ITEMS.find((item) => item.id === view)?.label ?? "Settings";

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  const loadCloudData = useCallback(async () => {
    const [habitResponse, taskResponse] = await Promise.all([fetch("/api/habits", { cache: "no-store" }), fetch("/api/tasks", { cache: "no-store" })]);
    if (!habitResponse.ok || !taskResponse.ok) throw new Error("Could not load your saved data.");
    const habitsJson = (await habitResponse.json()) as { habits: Habit[] };
    const tasksJson = (await taskResponse.json()) as { tasks: Task[] };
    setData({ habits: habitsJson.habits, tasks: tasksJson.tasks });
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- Read browser storage and subscribe to the external auth session during hydration. */
  useEffect(() => {
    let disposed = false;

    if (!BACKEND_READY) {
      const local = safeParseData(localStorage.getItem(STORAGE_KEY));
      setData(local ?? EMPTY_DATA);
      setToday(dateKey());
      setReady(true);
      return () => { disposed = true; };
    }

    const client = getBrowserClient();
    if (!client) return;
    const syncSession = async (sessionUser: { email?: string | null } | null) => {
      if (disposed) return;
      setToday(dateKey());
      setAuthenticated(Boolean(sessionUser));
      setUserEmail(sessionUser?.email ?? null);
      if (sessionUser) {
        try {
          await loadCloudData();
        } catch {
          showToast("We couldn’t sync your data. Please try again.");
        }
      } else {
        setData({ habits: [], tasks: [] });
      }
      if (!disposed) setReady(true);
    };
    void client.auth.getSession().then(({ data: sessionData }) => syncSession(sessionData.session?.user ?? null));
    const { data: authSubscription } = client.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.user ?? null);
    });
    return () => {
      disposed = true;
      authSubscription.subscription.unsubscribe();
    };
  }, [loadCloudData, showToast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready || BACKEND_READY) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const checkReminders = () => {
      const now = new Date();
      const time = `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`;
      for (const habit of activeHabits) {
        const reminderKey = `${today}:${habit.id}:${time}`;
        if (habit.reminderTime === time && !habit.completedDates.includes(today) && !sessionStorage.getItem(reminderKey)) {
          new Notification("A little nudge from Habit Flow", { body: `Time for “${habit.title}”. Small steps count.` });
          sessionStorage.setItem(reminderKey, "sent");
        }
      }
    };
    const timer = window.setInterval(checkReminders, 30000);
    checkReminders();
    return () => window.clearInterval(timer);
  }, [activeHabits, notificationsEnabled, today]);

  const setViewSafely = (next: AppView) => {
    setView(next);
    setSearchText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const createHabit = async (fields: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
    const draft: Habit = { ...fields, id: `habit-${crypto.randomUUID()}`, completedDates: [], createdAt: today };
    if (BACKEND_READY) {
      const response = await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      if (!response.ok) throw new Error("Could not save habit. Please try again.");
      const result = (await response.json()) as { habit: Habit };
      setData((previous) => ({ ...previous, habits: [result.habit, ...previous.habits] }));
    } else {
      setData((previous) => ({ ...previous, habits: [draft, ...previous.habits] }));
    }
    setHabitModal({ open: false });
    showToast("Your habit is ready. One small step at a time.");
  };

  const updateHabit = async (habitId: string, patch: Partial<Habit>) => {
    if (BACKEND_READY) {
      const response = await fetch(`/api/habits/${habitId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!response.ok) throw new Error("Could not update habit.");
    }
    setData((previous) => ({ ...previous, habits: previous.habits.map((habit) => habit.id === habitId ? { ...habit, ...patch } : habit) }));
    showToast("Habit updated.");
  };

  const deleteHabit = async (habitId: string) => {
    if (!window.confirm("Delete this habit and its completion history? This can’t be undone.")) return;
    if (BACKEND_READY) {
      const response = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (!response.ok) return showToast("Could not delete this habit.");
    }
    setData((previous) => ({ ...previous, habits: previous.habits.filter((habit) => habit.id !== habitId) }));
    showToast("Habit deleted.");
  };

  const toggleCompletion = async (habitId: string, onDate = today) => {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    const wasDone = habit.completedDates.includes(onDate);
    const dates = wasDone ? habit.completedDates.filter((date) => date !== onDate) : [...habit.completedDates, onDate];
    if (BACKEND_READY) {
      const response = await fetch(`/api/habits/${habitId}/logs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completedOn: onDate, completed: !wasDone }) });
      if (!response.ok) return showToast("Could not save your check-in.");
    }
    setData((previous) => ({ ...previous, habits: previous.habits.map((item) => item.id === habitId ? { ...item, completedDates: dates } : item) }));
  };

  const createTask = async (fields: Pick<Task, "title" | "dueDate">) => {
    const draft: Task = { ...fields, id: `task-${crypto.randomUUID()}`, done: false, createdAt: today };
    if (BACKEND_READY) {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      if (!response.ok) throw new Error("Could not save task.");
      const result = (await response.json()) as { task: Task };
      setData((previous) => ({ ...previous, tasks: [result.task, ...previous.tasks] }));
    } else {
      setData((previous) => ({ ...previous, tasks: [draft, ...previous.tasks] }));
    }
    setTaskModalOpen(false);
    setViewSafely("tasks");
    showToast("Task added to your list.");
  };

  const toggleTask = async (task: Task) => {
    const done = !task.done;
    if (BACKEND_READY) {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
      if (!response.ok) return showToast("Could not update this task.");
    }
    setData((previous) => ({ ...previous, tasks: previous.tasks.map((item) => item.id === task.id ? { ...item, done } : item) }));
  };

  const deleteTask = async (taskId: string) => {
    if (BACKEND_READY) {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) return showToast("Could not remove this task.");
    }
    setData((previous) => ({ ...previous, tasks: previous.tasks.filter((task) => task.id !== taskId) }));
  };

  const exportCsv = () => {
    const rows: (string | number | boolean | null)[][] = [["Record type", "Title", "Category", "Status", "Date", "Reminder", "Frequency"]];
    for (const habit of data.habits) {
      rows.push(["Habit", habit.title, habit.category, habit.status, "", habit.reminderTime, habit.frequency]);
      for (const completedOn of habit.completedDates) rows.push(["Check-in", habit.title, habit.category, "Completed", completedOn, habit.reminderTime, habit.frequency]);
    }
    for (const task of data.tasks) rows.push(["Task", task.title, "", task.done ? "Completed" : "Open", task.dueDate, "", ""]);
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blobUrl = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `habit-flow-${today}.csv`;
    link.click();
    URL.revokeObjectURL(blobUrl);
    showToast("Your CSV report has been downloaded.");
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return showToast("This browser does not support notifications.");
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") {
      setNotificationsEnabled(true);
      showToast("Reminders are on while Habit Flow is open.");
    } else {
      setNotificationsEnabled(false);
      showToast("Notifications are blocked in your browser settings.");
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>, mode: "sign-in" | "sign-up") => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const client = getBrowserClient();
    if (!client) return showToast("Account sign-in will be available when cloud storage is connected.");
    const result = mode === "sign-in"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (result.error) return showToast(result.error.message);
    if (mode === "sign-up" && !result.data.session) return showToast("Check your email to confirm your new account.");
    setAuthModalOpen(false);
    showToast(mode === "sign-up" ? "Welcome to Habit Flow." : "You’re signed in.");
  };
  const handlePasswordReset = async (email: string) => {
    const client = getBrowserClient();
    if (!client) return showToast("Password reset will be available when cloud storage is connected.");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/update-password` });
    if (error) return showToast(error.message);
    setAuthModalOpen(false);
    showToast("Check your email for a secure password reset link.");
  };

  const signOut = async () => {
    const client = getBrowserClient();
    if (client) await client.auth.signOut();
    setAuthenticated(!BACKEND_READY);
    setUserEmail(null);
    setViewSafely("dashboard");
    showToast("You’ve been signed out.");
  };

  if (!ready) {
    return <div className="app-loading" aria-label="Loading Habit Flow"><span className="loading-mark"><Sprout size={22} /></span><span>Finding your flow…</span></div>;
  }

  if (BACKEND_READY && !authenticated) {
    return (
      <div className={`auth-gate ${theme === "dark" ? "theme-dark" : ""}`}>
        <div className="auth-gate-card">
          <BrandMark />
          <div className="auth-gate-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-sun"><Sun size={24} /></div><div className="art-plant"><Sprout size={64} strokeWidth={1.15} /></div><div className="art-note note-one"><Check size={14} /> one small step</div><div className="art-note note-two"><Flame size={14} /> keep your rhythm</div></div>
          <p className="eyebrow">A softer kind of productivity</p>
          <h1>Make room for<br /><em>better habits.</em></h1>
          <p className="auth-gate-copy">Create a little consistency, one thoughtful day at a time.</p>
          <button className="button button-primary button-wide" onClick={() => setAuthModalOpen(true)}>Sign in to your space <ArrowRight size={16} /></button>
          <p className="auth-gate-foot">New here? <button className="text-button" onClick={() => setAuthModalOpen(true)}>Create an account</button></p>
        </div>
        {authModalOpen && <AuthDialog onClose={() => setAuthModalOpen(false)} onSubmit={handleAuth} onResetPassword={handlePasswordReset} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  return (
    <div className={`app-shell ${theme === "dark" ? "theme-dark" : ""}`}>
      <aside className="sidebar">
        <BrandMark />
        <div className="side-label">YOUR SPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${view === id ? "is-active" : ""}`} onClick={() => setViewSafely(id)} aria-current={view === id ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === "tasks" && data.tasks.filter((task) => !task.done).length > 0 && <span className="nav-count">{data.tasks.filter((task) => !task.done).length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-spacer" />
        <div className="sidebar-prompt">
          <div className="prompt-illustration"><div className="prompt-orbit" /><div className="prompt-leaf"><Sprout size={36} strokeWidth={1.3} /></div><span className="prompt-dot" /></div>
          <p className="prompt-kicker">A gentle reminder</p><p className="prompt-copy">Progress isn’t a straight line. Keep showing up.</p>
          <button className="prompt-link" onClick={() => setViewSafely("reports")}>See your growth <ArrowRight size={14} /></button>
        </div>
        <button className={`nav-link side-settings ${view === "settings" ? "is-active" : ""}`} onClick={() => setViewSafely("settings")}><Settings2 size={18} /><span>Settings</span></button>
        <div className="profile-mini"><div className="avatar">{initials(userEmail)}</div><div className="profile-copy"><strong>{userEmail ? userEmail.split("@")[0] : "Your little corner"}</strong><span>{BACKEND_READY ? "Personal space" : "Browser workspace"}</span></div><button className="icon-button profile-more" aria-label="Account options" onClick={() => BACKEND_READY ? void signOut() : showToast("Your data stays in this browser only.")}><MoreHorizontal size={19} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Habit Flow</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            {!BACKEND_READY && <span className="demo-badge"><span className="demo-dot" /> Preview mode</span>}
            <button className="icon-button topbar-icon" aria-label="Open insights" onClick={() => setViewSafely("reports")}><Search size={18} /></button>
            <button className="icon-button topbar-icon" aria-label="Notification settings" onClick={() => setViewSafely("settings")}><Bell size={18} />{notificationsEnabled && <span className="notification-dot" />}</button>
            <button className="avatar avatar-top" aria-label="Open settings" onClick={() => setViewSafely("settings")}>{initials(userEmail)}</button>
          </div>
        </header>

        <div className="mobile-brand"><BrandMark /><button className="icon-button" onClick={() => setViewSafely("settings")} aria-label="Open settings"><Settings2 size={19} /></button></div>
        <section className="page-content" key={view}>
          {view === "dashboard" && <DashboardView data={data} today={today} todayLabel={getTodayLabel()} todayHabits={todayHabits} currentWeek={currentWeek} weekLabel={weekLabel} weekOffset={weekOffset} doneToday={doneToday} plannedToday={plannedToday} completionPercent={completionPercent} bestStreak={bestStreak} strongestCurrentStreak={strongestCurrentStreak} onWeekChange={setWeekOffset} onToggle={toggleCompletion} onNavigate={setViewSafely} onAddHabit={() => setHabitModal({ open: true })} onAddTask={() => setTaskModalOpen(true)} onToggleTask={toggleTask} onDeleteTask={deleteTask} />}
          {view === "habits" && <HabitsView data={data} today={today} searchText={searchText} onSearch={setSearchText} statusFilter={habitStatusFilter} onStatusFilter={setHabitStatusFilter} onAdd={() => setHabitModal({ open: true })} onEdit={(habit) => setHabitModal({ open: true, habit })} onToggle={toggleCompletion} onUpdate={updateHabit} onDelete={deleteHabit} />}
          {view === "reports" && <ReportsView data={data} today={today} onExport={exportCsv} onPrint={() => window.print()} />}
          {view === "tasks" && <TasksView tasks={data.tasks} today={today} onToggle={toggleTask} onDelete={deleteTask} onAdd={() => setTaskModalOpen(true)} />}
          {view === "settings" && <SettingsView theme={theme} onThemeChange={setTheme} notificationsEnabled={notificationsEnabled} onNotifications={requestNotifications} onExport={exportCsv} onSignOut={BACKEND_READY ? signOut : undefined} onReset={() => { if (window.confirm("Clear all habits and tasks saved in this browser? This cannot be undone.")) { localStorage.removeItem(STORAGE_KEY); setData(EMPTY_DATA); showToast("Local workspace cleared."); } }} />}
        </section>

        <button className="quick-add" onClick={() => setHabitModal({ open: true })}><Plus size={19} strokeWidth={2.2} /><span>Quick add</span></button>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "mobile-nav-active" : ""} onClick={() => setViewSafely(id)} aria-label={label}><Icon size={19} /><span>{label === "Overview" ? "Home" : label === "My habits" ? "Habits" : label === "Insights" ? "Reports" : "Tasks"}</span></button>)}
        </nav>
      </main>

      {habitModal.open && <HabitModal habit={habitModal.habit} onClose={() => setHabitModal({ open: false })} onSave={async (fields) => { try { if (habitModal.habit) { await updateHabit(habitModal.habit.id, fields); setHabitModal({ open: false }); } else { await createHabit(fields); } } catch (error) { showToast(error instanceof Error ? error.message : "Could not save this habit."); } }} />}
      {taskModalOpen && <TaskModal onClose={() => setTaskModalOpen(false)} onSave={async (fields) => { try { await createTask(fields); } catch (error) { showToast(error instanceof Error ? error.message : "Could not save this task."); } }} />}
      {authModalOpen && <AuthDialog onClose={() => setAuthModalOpen(false)} onSubmit={handleAuth} onResetPassword={handlePasswordReset} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function BrandMark() {
  return <div className="brand-mark"><span className="brand-icon"><Sprout size={18} strokeWidth={2} /></span><span>habit<span className="brand-light">flow</span><sup>®</sup></span></div>;
}

type DashboardProps = {
  data: AppData; today: string; todayLabel: string; todayHabits: Habit[]; currentWeek: string[]; weekLabel: string; weekOffset: number;
  doneToday: number; plannedToday: number; completionPercent: number; bestStreak: number; strongestCurrentStreak: number;
  onWeekChange: (offset: number) => void; onToggle: (id: string, date?: string) => void; onNavigate: (view: AppView) => void;
  onAddHabit: () => void; onAddTask: () => void; onToggleTask: (task: Task) => void; onDeleteTask: (id: string) => void;
};

function DashboardView(props: DashboardProps) {
  const { data, today, todayLabel, todayHabits, currentWeek, weekLabel, weekOffset, doneToday, plannedToday, completionPercent, bestStreak, strongestCurrentStreak } = props;
  const pendingTasks = data.tasks.filter((task) => !task.done).slice(0, 3);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  const weeklyBars = currentWeek.map((key) => ({ key, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${key}T12:00:00`)), completed: data.habits.filter((habit) => habit.status === "active" && habit.completedDates.includes(key)).length, planned: data.habits.filter((habit) => habit.status === "active" && habit.scheduledDays.includes(weekdayForKey(key))).length }));
  const weekCompletions = weeklyBars.reduce((sum, day) => sum + day.completed, 0);
  const weekPlan = weeklyBars.reduce((sum, day) => sum + day.planned, 0);
  const weekRate = weekPlan ? Math.round(weekCompletions / weekPlan * 100) : 0;
  const todayTaskCount = data.tasks.filter((task) => !task.done && task.dueDate === today).length;
  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">{todayLabel} <span className="eyebrow-dot">·</span> TAKE A MOMENT FOR YOU</p><h1>{greeting}, <em>friend.</em></h1><p className="welcome-subtitle">A little progress, made gently. You’ve got this.</p></div><button className="button button-outline welcome-add" onClick={props.onAddHabit}><Plus size={17} /> New habit</button></div>
      {!BACKEND_READY && <div className="preview-banner"><Sparkles size={16} /><span>This is a working preview. Habits and tasks you add save in this browser only. Connect Supabase to turn on private accounts and cloud sync.</span><button className="text-button" onClick={() => props.onNavigate("settings")}>About preview</button></div>}
      <div className="metrics-grid">
        <MetricCard label="TODAY’S RHYTHM" value={`${doneToday}/${plannedToday}`} note={plannedToday ? `${completionPercent}% of today’s plan` : "No habits planned today"} icon={Target} tone="green" progress={completionPercent} />
        <MetricCard label="CURRENT STREAK" value={`${strongestCurrentStreak}`} suffix="days" note={strongestCurrentStreak ? "Your consistency is adding up" : "Your next step starts today"} icon={Flame} tone="peach" />
        <MetricCard label="PERSONAL BEST" value={`${bestStreak}`} suffix="days" note="Your longest run so far" icon={Trophy} tone="yellow" />
        <MetricCard label="THIS WEEK" value={`${weekRate}%`} note={`${weekCompletions} small wins across the week`} icon={Activity} tone="blue" progress={weekRate} />
      </div>

      <div className="dashboard-grid">
        <section className="panel today-panel">
          <div className="panel-heading"><div><p className="section-eyebrow">A SMALL STEP COUNTS</p><h2>Today’s rhythm <span className="heading-count">{doneToday}<span>/</span>{plannedToday}</span></h2></div><button className="icon-button panel-menu" aria-label="Add a habit" onClick={props.onAddHabit}><Plus size={19} /></button></div>
          <p className="panel-intro">The habits you planned for today. No rush.</p>
          {todayHabits.length ? <div className="habit-check-list">{todayHabits.slice(0, 5).map((habit) => <HabitCheckRow key={habit.id} habit={habit} today={today} onToggle={() => props.onToggle(habit.id)} />)}</div> : <EmptyState icon={Sprout} title="Your routine starts here" copy="Add a habit you’d like to make room for." action="Create your first habit" onAction={props.onAddHabit} />}
          {todayHabits.length > 5 && <button className="panel-footer-link" onClick={() => props.onNavigate("habits")}>See all {todayHabits.length} habits <ArrowRight size={15} /></button>}
          <div className="gentle-note"><div className="note-spark"><Sparkles size={15} /></div><p>Consistency isn’t perfection. <strong>It’s coming back.</strong></p><span>— your friendly reminder</span></div>
        </section>

        <section className="panel week-panel">
          <div className="panel-heading"><div><p className="section-eyebrow">YOUR MOMENTUM</p><h2>Week at a glance</h2></div><div className="week-nav"><button className="icon-button mini-icon" onClick={() => props.onWeekChange(weekOffset - 1)} aria-label="Previous week"><ChevronLeft size={17} /></button><button className="icon-button mini-icon" onClick={() => props.onWeekChange(weekOffset + 1)} aria-label="Next week"><ChevronRight size={17} /></button></div></div>
          <div className="week-range"><CalendarDays size={14} />{weekLabel}</div>
          <div className="chart-legend"><span><i className="legend-dot legend-primary" />Completed</span><span><i className="legend-dot legend-muted" />Still to come</span></div>
          <div className="bar-chart" role="img" aria-label={`Weekly habit completions. ${weekCompletions} check-ins out of ${weekPlan} planned.`}>
            {weeklyBars.map((day) => { const fill = day.planned ? Math.min(100, Math.round(day.completed / day.planned * 100)) : 0; return <div className={`bar-day ${day.key === today ? "bar-today" : ""}`} key={day.key}><div className="bar-value">{day.completed || ""}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(fill, day.planned ? 10 : 0)}%` }} /></div><span className="bar-day-label">{day.label.slice(0, 1)}</span></div>; })}
          </div>
          <div className="chart-footer"><span className="chart-footer-copy"><strong>{weekCompletions}</strong> check-ins this week</span><button className="text-button" onClick={() => props.onNavigate("reports")}>Full report <ArrowRight size={14} /></button></div>
        </section>

        <section className="panel tasks-panel">
          <div className="panel-heading"><div><p className="section-eyebrow">CLEAR A LITTLE SPACE</p><h2>Gentle to-dos <span className="heading-count">{pendingTasks.length}</span></h2></div><button className="icon-button panel-menu" aria-label="Add task" onClick={props.onAddTask}><Plus size={19} /></button></div>
          <p className="panel-intro">A few small things you can take off your mind.</p>
          {pendingTasks.length ? <div className="task-mini-list">{pendingTasks.map((task) => <TaskCheckRow key={task.id} task={task} today={today} onToggle={() => props.onToggleTask(task)} onDelete={() => props.onDeleteTask(task.id)} />)}</div> : <div className="empty-inline"><CheckCircle2 size={19} /><span>Nothing waiting. Enjoy the space.</span></div>}
          <button className="panel-footer-link" onClick={() => props.onNavigate("tasks")}>Open to-do list <ArrowRight size={15} /></button>
        </section>

        <section className="panel focus-panel">
          <div className="focus-copy"><p className="section-eyebrow">A MOMENT TO NOTICE</p><h2>Your small steps<br /><em>are taking root.</em></h2><p>Every check-in is proof that you made time for what matters to you.</p><button className="button button-dark" onClick={() => props.onNavigate("reports")}>See your progress <ArrowRight size={15} /></button></div>
          <div className="growth-illustration" aria-hidden="true"><div className="growth-sun" /><div className="growth-hill hill-one" /><div className="growth-hill hill-two" /><div className="growth-stem"><span className="leaf leaf-left" /><span className="leaf leaf-right" /><span className="leaf leaf-top" /></div><div className="growth-ground" /></div>
        </section>
      </div>
      <div className="dashboard-bottom-note"><Heart size={14} /> Be kind to yourself today. The small things are the big things.</div>
      {todayTaskCount > 0 && <span className="sr-only">You have {todayTaskCount} tasks due today.</span>}
    </>
  );
}

function MetricCard({ label, value, suffix, note, icon: Icon, tone, progress }: { label: string; value: string; suffix?: string; note: string; icon: LucideIcon; tone: string; progress?: number }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span></div><div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div><p className="metric-note">{note}</p>{typeof progress === "number" && <div className="metric-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>}</article>;
}

function HabitCheckRow({ habit, today, onToggle }: { habit: Habit; today: string; onToggle: () => void }) {
  const done = habit.completedDates.includes(today);
  const Icon = CATEGORY_ICONS[habit.category.toLowerCase()] ?? Sprout;
  const streak = currentStreak(habit.completedDates, habit.scheduledDays, today);
  return <div className={`habit-row ${done ? "habit-row-done" : ""}`}><button className={`check-control ${done ? "checked" : ""}`} onClick={onToggle} aria-label={`${done ? "Unmark" : "Mark"} ${habit.title} complete`} aria-pressed={done}>{done && <Check size={15} strokeWidth={2.7} />}</button><div className={`habit-row-icon tone-${habit.color}`}><Icon size={17} strokeWidth={1.75} /></div><div className="habit-row-copy"><span className="habit-row-title">{habit.title}</span><span className="habit-row-meta">{habit.category} <i /> <Flame size={12} /> {streak} day{streak === 1 ? "" : "s"}</span></div>{habit.reminderTime && <span className="habit-time"><Clock3 size={13} />{habit.reminderTime}</span>}</div>;
}

function TaskCheckRow({ task, today, onToggle, onDelete }: { task: Task; today: string; onToggle: () => void; onDelete: () => void }) {
  const dueLabel = task.dueDate === today ? "Today" : task.dueDate ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${task.dueDate}T12:00:00`)) : "Anytime";
  return <div className={`task-row ${task.done ? "task-row-done" : ""}`}><button className={`task-check ${task.done ? "checked" : ""}`} onClick={onToggle} aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`} aria-pressed={task.done}>{task.done && <Check size={13} />}</button><span className="task-title">{task.title}</span><span className={`task-due ${task.dueDate === today && !task.done ? "due-today" : ""}`}>{dueLabel}</span><button className="row-icon-button" onClick={onDelete} aria-label={`Delete ${task.title}`}><X size={15} /></button></div>;
}

function EmptyState({ icon: Icon, title, copy, action, onAction }: { icon: LucideIcon; title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon size={22} /></span><strong>{title}</strong><p>{copy}</p><button className="button button-outline button-small" onClick={onAction}>{action}</button></div>;
}

type HabitsViewProps = { data: AppData; today: string; searchText: string; onSearch: (value: string) => void; statusFilter: HabitStatus | "all"; onStatusFilter: (value: HabitStatus | "all") => void; onAdd: () => void; onEdit: (habit: Habit) => void; onToggle: (id: string, date?: string) => void; onUpdate: (id: string, patch: Partial<Habit>) => void; onDelete: (id: string) => void };

function HabitsView(props: HabitsViewProps) {
  const filteredHabits = props.data.habits.filter((habit) => (props.statusFilter === "all" || habit.status === props.statusFilter) && `${habit.title} ${habit.category}`.toLowerCase().includes(props.searchText.toLowerCase()));
  const filters: { id: HabitStatus | "all"; label: string }[] = [{ id: "active", label: "Active" }, { id: "completed", label: "Completed" }, { id: "archived", label: "Archived" }, { id: "all", label: "All habits" }];
  return <>
    <PageIntro eyebrow="YOUR DAILY PRACTICE" title={<>Habits that <em>feel like you.</em></>} copy="Build a routine that fits your life. Every little check-in counts." action={<button className="button button-primary" onClick={props.onAdd}><Plus size={17} /> Create a habit</button>} />
    <div className="manager-toolbar"><div className="filter-tabs" role="tablist" aria-label="Filter habits">{filters.map((filter) => <button key={filter.id} className={props.statusFilter === filter.id ? "filter-tab active" : "filter-tab"} onClick={() => props.onStatusFilter(filter.id)} role="tab" aria-selected={props.statusFilter === filter.id}>{filter.label}<span>{filter.id === "all" ? props.data.habits.length : props.data.habits.filter((habit) => habit.status === filter.id).length}</span></button>)}</div><label className="search-field"><Search size={16} /><span className="sr-only">Search habits</span><input value={props.searchText} onChange={(event) => props.onSearch(event.target.value)} placeholder="Find a habit" /></label></div>
    {filteredHabits.length ? <div className="habits-grid">{filteredHabits.map((habit) => <HabitManagerCard key={habit.id} habit={habit} today={props.today} onEdit={() => props.onEdit(habit)} onToggle={() => props.onToggle(habit.id)} onUpdate={(patch) => props.onUpdate(habit.id, patch)} onDelete={() => props.onDelete(habit.id)} />)}</div> : <div className="panel manager-empty"><EmptyState icon={Search} title={props.searchText ? "No habits found" : "This shelf is still open"} copy={props.searchText ? "Try a different name or category." : "Add a small habit you’d like to make part of your week."} action="Add a habit" onAction={props.onAdd} /></div>}
    <div className="manager-footnote"><CircleHelp size={15} /><span>Choose a pace that feels sustainable. Your schedule can always change with you.</span></div>
  </>;
}

function HabitManagerCard({ habit, today, onEdit, onToggle, onUpdate, onDelete }: { habit: Habit; today: string; onEdit: () => void; onToggle: () => void; onUpdate: (patch: Partial<Habit>) => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = CATEGORY_ICONS[habit.category.toLowerCase()] ?? Sprout;
  const done = habit.completedDates.includes(today);
  const streak = currentStreak(habit.completedDates, habit.scheduledDays, today);
  const plannedToday = habit.scheduledDays.includes(weekdayForKey(today));
  return <article className={`habit-card manager-card tone-border-${habit.color}`}><div className="manager-card-top"><div className={`manager-icon tone-${habit.color}`}><Icon size={19} /></div><div className="manager-card-actions"><button className="row-icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label={`Actions for ${habit.title}`} aria-expanded={menuOpen}><MoreHorizontal size={19} /></button></div></div><span className="habit-category-tag">{habit.category}</span><h2>{habit.title}</h2><p className="manager-schedule"><CalendarDays size={14} />{habit.frequency === 7 ? "Every day" : `${habit.frequency} days a week`}{habit.reminderTime && <><span className="meta-separator">·</span><Clock3 size={13} />{habit.reminderTime}</>}</p><div className="schedule-dots" aria-label={`Scheduled ${habit.scheduledDays.length} days per week`}>{DAYS.map((day, index) => <span key={`${day}-${index}`} className={habit.scheduledDays.includes(index) ? "schedule-dot dot-on" : "schedule-dot"}>{day}</span>)}</div><div className="manager-card-bottom"><div className="manager-streak"><Flame size={15} /><strong>{streak}</strong><span>day streak</span></div>{habit.status === "active" && plannedToday ? <button className={`button checkin-button ${done ? "checkin-done" : ""}`} onClick={onToggle}>{done ? <><Check size={14} /> Done today</> : "Check in"}</button> : <span className={`status-pill status-${habit.status}`}>{habit.status}</span>}</div><div className={`manager-overflow ${menuOpen ? "menu-open" : ""}`}><button onClick={onEdit}>Edit habit</button>{habit.status === "active" && <button onClick={() => onUpdate({ status: "completed" })}>Mark completed</button>}{habit.status !== "archived" && <button onClick={() => onUpdate({ status: "archived" })}>Archive</button>}{habit.status !== "active" && <button onClick={() => onUpdate({ status: "active" })}>Move to active</button>}<button className="danger-action" onClick={onDelete}>Delete</button></div></article>;
}

function PageIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: ReactNode; copy: string; action?: ReactNode }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="welcome-subtitle">{copy}</p></div>{action}</div>;
}

function ReportsView({ data, today, onExport, onPrint }: { data: AppData; today: string; onExport: () => void; onPrint: () => void }) {
  const active = data.habits.filter((habit) => habit.status === "active");
  const firstHeatmapKey = shiftDateKey(today, -((weekdayForKey(today) + 6) % 7) - 77);
  const keys = Array.from({ length: 84 }, (_, index) => shiftDateKey(firstHeatmapKey, index));
  const elapsedKeys = keys.filter((key) => key <= today);
  const completionCount = active.reduce((sum, habit) => sum + habit.completedDates.filter((key) => elapsedKeys.includes(key)).length, 0);
  const plannedCount = active.reduce((sum, habit) => sum + elapsedKeys.filter((key) => habit.scheduledDays.includes(weekdayForKey(key))).length, 0);
  const rate = plannedCount ? Math.round(completionCount / plannedCount * 100) : 0;
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const dates = Array.from({ length: 7 }, (_, day) => shiftDateKey(today, (index - 7) * 7 + day - ((weekdayForKey(today) + 6) % 7)));
    const elapsedDates = dates.filter((key) => key <= today);
    const done = active.reduce((sum, habit) => sum + habit.completedDates.filter((key) => elapsedDates.includes(key)).length, 0);
    const planned = active.reduce((sum, habit) => sum + elapsedDates.filter((key) => habit.scheduledDays.includes(weekdayForKey(key))).length, 0);
    return { dates, done, planned, rate: planned ? Math.round(done / planned * 100) : 0 };
  });
  const bestHabit = [...active].sort((a, b) => b.completedDates.filter((key) => keys.includes(key)).length - a.completedDates.filter((key) => keys.includes(key)).length)[0];
  const linePoints = weeks.map((week, index) => ({ x: 26 + index * 44, y: 122 - week.rate * 0.88, ...week }));
  const linePath = linePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `26,122 ${linePath} 334,122`;
  return <>
    <PageIntro eyebrow="A LOOK BACK, A LITTLE FURTHER" title={<>Look how far <em>you’ve come.</em></>} copy="Your progress is made of all the days you showed up—even the quiet ones." action={<div className="report-actions"><button className="button button-outline" onClick={onExport}><Download size={16} /> Export CSV</button><button className="button button-soft" onClick={onPrint}><FileText size={16} /> Save as PDF</button></div>} />
    <div className="report-summary-grid"><div className="report-stat"><span>12-WEEK COMPLETION</span><strong>{rate}<small>%</small></strong><p>{completionCount} of {plannedCount} planned check-ins</p></div><div className="report-stat"><span>TOTAL CHECK-INS</span><strong>{completionCount}</strong><p>A whole lot of small wins.</p></div><div className="report-stat"><span>HABITS IN YOUR ROUTINE</span><strong>{active.length}</strong><p>{data.habits.filter((habit) => habit.status === "archived").length} archived for now</p></div><div className="report-stat report-stat-highlight"><span>YOUR STEADIEST HABIT</span><strong className="report-best">{bestHabit?.title ?? "Your next one"}</strong><p>{bestHabit ? `${bestHabit.completedDates.filter((key) => keys.includes(key)).length} check-ins in the last 12 weeks` : "Start with something small."}</p></div></div>
    <div className="reports-grid"><section className="panel heatmap-panel"><div className="panel-heading"><div><p className="section-eyebrow">SHOWING UP, DAY BY DAY</p><h2>Your habit garden</h2></div><span className="range-label">Last 12 weeks</span></div><p className="panel-intro">Each little square is a day you checked in. Look at that growing patch.</p><div className="heatmap-months"><span>3 months ago</span><span>2 months ago</span><span>Last month</span><span>This month</span></div><div className="heatmap-wrap"><div className="heatmap-weekdays"><span>M</span><span>W</span><span>F</span></div><div className="heatmap-grid">{keys.map((key) => { const count = active.reduce((sum, habit) => sum + (habit.completedDates.includes(key) ? 1 : 0), 0); const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / Math.max(1, Math.min(active.length, 4)) * 4)); return <span key={key} className={`heatmap-cell heat-${level}`} title={`${key}: ${count} check-in${count === 1 ? "" : "s"}`} aria-label={`${key}: ${count} check-ins`} />; })}</div></div><div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`heatmap-cell heat-${level}`} />)}<span>More</span></div></section>
      <section className="panel weekly-report-panel"><div className="panel-heading"><div><p className="section-eyebrow">THE BIGGER PICTURE</p><h2>Weekly consistency</h2></div><span className="report-icon"><Activity size={17} /></span></div><p className="panel-intro">Your check-ins as a share of what you planned.</p><div className="report-line-chart"><svg viewBox="0 0 360 140" role="img" aria-label="Weekly completion trend for the last eight weeks" preserveAspectRatio="none"><line x1="26" x2="334" y1="34" y2="34" stroke="var(--chart-grid)" /><line x1="26" x2="334" y1="78" y2="78" stroke="var(--chart-grid)" /><line x1="26" x2="334" y1="122" y2="122" stroke="var(--chart-grid)" /><polygon points={areaPath} fill="var(--chart-fill)" opacity=".62" /><polyline points={linePath} fill="none" stroke="var(--chart-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{linePoints.map((point) => <circle key={point.dates[0]} cx={point.x} cy={point.y} r="4" fill="var(--surface)" stroke="var(--chart-line)" strokeWidth="2" />)}</svg><div className="line-chart-labels">{linePoints.map((point, index) => <span key={point.dates[0]}>{index === 7 ? "Now" : `${7 - index}w`}</span>)}</div></div><div className="weekly-average"><span>12-week average</span><strong>{rate}%</strong></div></section>
      <section className="panel reflection-panel"><div className="reflection-mark"><Sparkles size={18} /></div><div><p className="section-eyebrow">A NOTE TO KEEP</p><h2>You’re building a rhythm, not chasing perfection.</h2><p>Some weeks will look different from others. The fact that you keep returning is the part that matters.</p></div></section>
      <section className="panel report-tips-panel"><p className="section-eyebrow">YOUR NEXT LITTLE WIN</p><h2>Make it easier to begin.</h2><p>Try attaching a new habit to something you already do—like stretching after your morning coffee.</p><button className="text-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to your report <ArrowRight size={14} /></button></section></div>
  </>;
}

function TasksView({ tasks, today, onToggle, onDelete, onAdd }: { tasks: Task[]; today: string; onToggle: (task: Task) => void; onDelete: (id: string) => void; onAdd: () => void }) {
  const openTasks = tasks.filter((task) => !task.done).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const doneTasks = tasks.filter((task) => task.done);
  return <>
    <PageIntro eyebrow="A CLEARER MIND, ONE LIST AT A TIME" title={<>Make space for <em>what matters.</em></>} copy="Keep the little things somewhere safe, so your mind can rest." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add a task</button>} />
    <div className="tasks-page-grid"><section className="panel tasks-page-panel"><div className="panel-heading"><div><p className="section-eyebrow">YOUR OPEN LOOPS</p><h2>Still to do <span className="heading-count">{openTasks.length}</span></h2></div><ListChecks className="muted-icon" size={19} /></div>{openTasks.length ? <div className="task-list-full">{openTasks.map((task) => <TaskCheckRow key={task.id} task={task} today={today} onToggle={() => onToggle(task)} onDelete={() => onDelete(task.id)} />)}</div> : <div className="empty-inline"><CheckCircle2 size={18} /><span>All clear. Take a breath.</span></div>}</section><section className="panel task-completed-panel"><div className="panel-heading"><div><p className="section-eyebrow">LOOK AT YOU</p><h2>Already done <span className="heading-count">{doneTasks.length}</span></h2></div><CheckCircle2 className="muted-icon" size={19} /></div>{doneTasks.length ? <div className="task-list-full">{doneTasks.map((task) => <TaskCheckRow key={task.id} task={task} today={today} onToggle={() => onToggle(task)} onDelete={() => onDelete(task.id)} />)}</div> : <div className="empty-inline"><Sparkles size={17} /><span>Your finished tasks will show up here.</span></div>}</section></div>
    <div className="task-kind-note"><div className="note-spark"><ArrowDownRight size={16} /></div><div><strong>Keep tasks kind and small.</strong><p>A short list gives you room to focus on your habits, too.</p></div></div>
  </>;
}

function SettingsView({ theme, onThemeChange, notificationsEnabled, onNotifications, onExport, onSignOut, onReset }: { theme: "light" | "dark"; onThemeChange: (theme: "light" | "dark") => void; notificationsEnabled: boolean; onNotifications: () => void; onExport: () => void; onSignOut?: () => void; onReset: () => void }) {
  return <>
    <PageIntro eyebrow="MAKE THIS SPACE YOURS" title={<>A little more <em>your way.</em></>} copy="Small preferences that make Habit Flow feel comfortable to return to." />
    <div className="settings-layout"><div className="settings-main">
      <section className="panel settings-section"><div className="settings-section-head"><div><p className="section-eyebrow">HOW IT FEELS</p><h2>Appearance</h2><p>Choose the light that feels right today.</p></div><Sun className="muted-icon" size={20} /></div><div className="theme-options"><button className={`theme-option ${theme === "light" ? "theme-selected" : ""}`} onClick={() => onThemeChange("light")}><span className="theme-preview theme-preview-light"><span /><span /><span /></span><strong>Soft light</strong><span className="theme-radio" /></button><button className={`theme-option ${theme === "dark" ? "theme-selected" : ""}`} onClick={() => onThemeChange("dark")}><span className="theme-preview theme-preview-dark"><span /><span /><span /></span><strong>Evening dark</strong><span className="theme-radio" /></button></div></section>
      <section className="panel settings-section"><div className="settings-section-head"><div><p className="section-eyebrow">A GENTLE NUDGE</p><h2>Reminders</h2><p>Browser reminders can nudge you at the times you choose.</p></div><Bell className="muted-icon" size={20} /></div><div className="setting-row"><div className="setting-symbol"><Clock3 size={17} /></div><div className="setting-copy"><strong>Habit reminders</strong><span>Works while Habit Flow is open in this browser.</span></div><button className={`switch ${notificationsEnabled ? "switch-on" : ""}`} onClick={onNotifications} role="switch" aria-checked={notificationsEnabled} aria-label="Enable habit reminders"><span /></button></div><div className="setting-hint">Your browser will ask for permission the first time you turn this on.</div></section>
      <section className="panel settings-section"><div className="settings-section-head"><div><p className="section-eyebrow">YOUR INFORMATION</p><h2>Keep a copy</h2><p>Take your check-ins and to-dos with you any time.</p></div><Download className="muted-icon" size={20} /></div><div className="setting-row"><div className="setting-symbol"><FileText size={17} /></div><div className="setting-copy"><strong>Export your data</strong><span>Download habits, check-ins, and tasks as a CSV file.</span></div><button className="button button-outline button-small" onClick={onExport}>Export CSV</button></div></section>
      {!BACKEND_READY && <section className="panel setup-note"><div className="setup-note-icon"><LockIcon /></div><div><p className="section-eyebrow">PREVIEW WORKSPACE</p><h2>Private accounts are ready to connect.</h2><p>This preview stores the habits and tasks you add in your browser. Connect a Supabase project to enable secure sign-in and cloud sync for your own account.</p><code>NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY</code></div></section>}
      {onSignOut && <section className="panel settings-section"><div className="setting-row"><div className="setting-symbol"><LogOut size={17} /></div><div className="setting-copy"><strong>Sign out</strong><span>End this session on this device.</span></div><button className="button button-outline button-small" onClick={onSignOut}>Sign out</button></div></section>}
    </div><aside className="settings-side"><div className="settings-side-card"><div className="side-card-icon"><Sparkles size={18} /></div><p className="section-eyebrow">A SMALL THOUGHT</p><h2>Let your routine fit your life—not the other way around.</h2><p>Change your habit days or reminder times whenever your week changes.</p></div><button className="reset-button" onClick={onReset}><Archive size={15} /> Clear local workspace</button></aside></div>
  </>;
}

function LockIcon() { return <span className="lock-glyph">✓</span>; }

function AuthDialog({ onClose, onSubmit, onResetPassword }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, mode: "sign-in" | "sign-up") => void; onResetPassword: (email: string) => Promise<void> }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    setBusy(true);
    try {
      if (mode === "reset") {
        event.preventDefault();
        const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
        await onResetPassword(email);
      } else await onSubmit(event, mode);
    } finally { setBusy(false); }
  };
  const resetMode = mode === "reset";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><BrandMark /><p className="eyebrow auth-eyebrow">{resetMode ? "A FRESH START" : mode === "sign-in" ? "GOOD TO HAVE YOU BACK" : "A NEW LITTLE BEGINNING"}</p><h2 id="auth-title">{resetMode ? "Reset your password." : mode === "sign-in" ? "Welcome back." : "Make a little space."}</h2><p className="modal-subtitle">{resetMode ? "We’ll send a secure reset link to your inbox." : mode === "sign-in" ? "Sign in to pick up where you left off." : "Create your private Habit Flow space."}</p><form onSubmit={submit} className="modal-form"><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>{!resetMode && <label>Password<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} placeholder="At least 8 characters" required /></label>}{mode === "sign-in" && <button className="text-button auth-forgot" type="button" onClick={() => setMode("reset")}>Forgot password?</button>}<button className="button button-primary button-wide" type="submit" disabled={busy}>{busy ? "One moment…" : resetMode ? "Send reset link" : mode === "sign-in" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button></form><p className="auth-switch">{resetMode ? "Remembered your password?" : mode === "sign-in" ? "New to Habit Flow?" : "Already have an account?"} <button className="text-button" onClick={() => setMode(resetMode || mode === "sign-up" ? "sign-in" : "sign-up")}>{resetMode ? "Sign in" : mode === "sign-in" ? "Create an account" : "Sign in"}</button></p><p className="auth-privacy">Your account and habit data stay private to you.</p></section></div>;
}
