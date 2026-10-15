export function dateKey(date?: Date | string): string;
export function shiftDateKey(key: string, amount: number): string;
export function weekdayForKey(key: string): number;
export function currentStreak(logDates: string[], plannedDays?: number[], today?: string): number;
export function longestStreak(logDates: string[], plannedDays?: number[]): number;
export function weekKeys(anchor?: string, weekOffset?: number): string[];
export function completionRate(completed: number, planned: number): number;
