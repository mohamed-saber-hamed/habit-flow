import { dateKey, shiftDateKey } from "@/lib/metrics.mjs";
import type { AppData, Habit } from "@/lib/types";

const stamp = (daysAgo: number) => shiftDateKey(dateKey(), -daysAgo);

function habit(
  id: string,
  title: string,
  category: string,
  color: Habit["color"],
  completedAgo: number[],
  scheduledDays = [0, 1, 2, 3, 4, 5, 6],
  reminderTime: string | null = null,
): Habit {
  return {
    id,
    title,
    category,
    color,
    frequency: scheduledDays.length,
    scheduledDays,
    reminderTime,
    status: "active",
    completedDates: completedAgo.map(stamp),
    createdAt: stamp(36),
  };
}

export function makeDemoData(): AppData {
  return {
    habits: [
      habit("demo-water", "Drink 8 glasses of water", "Wellness", "sky", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6], "10:00"),
      habit("demo-move", "Move your body", "Movement", "sage", [0, 1, 2, 3, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6], "17:30"),
      habit("demo-read", "Read for 20 minutes", "Learning", "gold", [0, 1, 2, 4, 5, 6, 8], [0, 1, 2, 3, 4, 5, 6], "21:00"),
      habit("demo-mind", "A moment of stillness", "Mindfulness", "lilac", [0, 1, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], "08:00"),
      habit("demo-sleep", "Wind down by 10:30", "Rest", "coral", [0, 2, 3, 4, 5, 7], [0, 1, 2, 3, 4, 5, 6]),
      habit("demo-skill", "Learn something new", "Growth", "sky", [1, 3, 5, 7, 9], [1, 3, 5]),
      habit("demo-journal", "Write a few lines", "Mindfulness", "gold", [0, 2, 4, 6, 8], [0, 2, 4, 6]),
    ],
    tasks: [
      { id: "task-plan", title: "Plan a gentle week", dueDate: stamp(0), done: false, createdAt: stamp(2) },
      { id: "task-book", title: "Book a morning walk", dueDate: stamp(1), done: false, createdAt: stamp(1) },
      { id: "task-review", title: "Review this month’s progress", dueDate: stamp(0), done: true, createdAt: stamp(3) },
    ],
  };
}
