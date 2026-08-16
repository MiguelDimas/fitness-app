export type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const ALL_BADGES: Badge[] = [
  { id: "first_day",   name: "First Steps",   emoji: "🥉", description: "Complete your first day" },
  { id: "three_days",  name: "Getting Going", emoji: "🥈", description: "Complete 3 days" },
  { id: "seven_days",  name: "One Week",      emoji: "🥇", description: "Complete 7 days" },
  { id: "streak_3",    name: "On a Roll",     emoji: "🔥", description: "Hit a 3-day streak" },
  { id: "streak_7",    name: "Unstoppable",   emoji: "⚡", description: "Hit a 7-day streak" },
  { id: "century",     name: "Centurion",     emoji: "💯", description: "Log 100 total minutes" },
];

type Stats = {
  daysCompleted: number;
  bestStreak: number;
  totalMinutes: number;
};

// pure function: given the user's stats, return which badge ids are earned
export function earnedBadges(stats: Stats): string[] {
  const earned: string[] = [];
  if (stats.daysCompleted >= 1) earned.push("first_day");
  if (stats.daysCompleted >= 3) earned.push("three_days");
  if (stats.daysCompleted >= 7) earned.push("seven_days");
  if (stats.bestStreak >= 3) earned.push("streak_3");
  if (stats.bestStreak >= 7) earned.push("streak_7");
  if (stats.totalMinutes >= 100) earned.push("century");
  return earned;
}

export type BadgeProgress = {
  id: string;
  current: number;
  target: number;
};

// how far along the user is toward each badge
export function badgeProgress(stats: Stats): Record<string, BadgeProgress> {
  return {
    first_day:  { id: "first_day",  current: stats.daysCompleted, target: 1 },
    three_days: { id: "three_days", current: stats.daysCompleted, target: 3 },
    seven_days: { id: "seven_days", current: stats.daysCompleted, target: 7 },
    streak_3:   { id: "streak_3",   current: stats.bestStreak,    target: 3 },
    streak_7:   { id: "streak_7",   current: stats.bestStreak,    target: 7 },
    century:    { id: "century",    current: stats.totalMinutes,  target: 100 },
  };
}