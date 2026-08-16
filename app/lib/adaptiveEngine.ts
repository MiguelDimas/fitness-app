export const DEFAULT_GOAL = 20;
export const FIXED_GOAL = 30;
export const MIN_GOAL = 10;
export const MAX_GOAL = 60;
const STEP = 5;

export type Session = {
  goal: number;
  achieved: number;
  difficulty: string;
};

export function clampGoal(goal: number): number {
  return Math.max(MIN_GOAL, Math.min(MAX_GOAL, goal));
}

// rule-based cold-start policy
export function nextGoal(history: Session[], streak: number): number {
  if (history.length === 0) return DEFAULT_GOAL;
  const last = history[history.length - 1];
  const met = last.achieved >= last.goal;
  let goal = last.goal;

  if (met && last.difficulty === "Easy") {
    goal += streak >= 3 ? STEP * 2 : STEP;
  } else if (met && last.difficulty === "Hard") {
    goal += 0;
  } else if (met) {
    goal += STEP;
  } else {
    goal -= STEP;
  }
  return clampGoal(goal);
}