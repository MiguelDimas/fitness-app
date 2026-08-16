// Contextual epsilon-greedy bandit for adaptive goal-setting.
// ARMS = goal adjustments (minutes). CONTEXT = met? + difficulty.
// REWARD = 1 completed comfortably, 0.5 completed but Hard, 0 missed.
// Picks the best-average arm most of the time (exploit), random arm epsilon of the time (explore).

export const ARMS = [-5, 0, 5, 10] as const;
export type Arm = (typeof ARMS)[number];

const EPSILON = 0.2; // 20% explore

type ArmStat = { count: number; avgReward: number };
export type BanditModel = Record<string, Record<string, ArmStat>>;

export function contextKey(met: boolean, difficulty: string): string {
  return `${met ? "met" : "missed"}_${difficulty}`;
}

export function reward(met: boolean, difficulty: string): number {
  if (!met) return 0;
  if (difficulty === "Hard") return 0.5;
  return 1;
}

export function chooseArm(model: BanditModel, ctx: string): Arm {
  const stats = model[ctx] ?? {};
  if (Math.random() < EPSILON) {
    return ARMS[Math.floor(Math.random() * ARMS.length)]; // explore
  }
  let best: Arm = 0;
  let bestAvg = -1;
  for (const arm of ARMS) {
    const s = stats[String(arm)];
    const avg = s ? s.avgReward : 0;
    if (avg > bestAvg) { bestAvg = avg; best = arm; }
  }
  return best; // exploit
}

export function updateModel(model: BanditModel, ctx: string, arm: Arm, r: number): BanditModel {
  const next: BanditModel = { ...model, [ctx]: { ...(model[ctx] ?? {}) } };
  const prev = next[ctx][String(arm)] ?? { count: 0, avgReward: 0 };
  const count = prev.count + 1;
  const avgReward = prev.avgReward + (r - prev.avgReward) / count; // incremental average
  next[ctx][String(arm)] = { count, avgReward };
  return next;
}