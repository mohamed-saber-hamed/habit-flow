export type HabitStatus = "active" | "completed" | "archived";

export type Habit = {
  id: string;
  title: string;
  category: string;
  color: "sage" | "gold" | "sky" | "coral" | "lilac";
  frequency: number;
  scheduledDays: number[];
  reminderTime: string | null;
  status: HabitStatus;
  completedDates: string[];
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
};

export type AppData = { habits: Habit[]; tasks: Task[] };
export type AppView = "dashboard" | "habits" | "reports" | "tasks" | "settings";
