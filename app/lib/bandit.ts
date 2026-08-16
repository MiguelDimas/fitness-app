// ---------------------------------------------------------------------------
// Contextual epsilon-greedy bandit for adaptive goal-setting.
//
// ARMS      = the goal adjustments the engine can choose (minutes).
// CONTEXT   = the user's situation, reduced to a discrete key (met? + difficulty).
// REWARD    = 1.0 if the day was completed at a comfortable level,
//             0.5 if completed but felt Hard, 0.0 if missed.
// LEARNING  = for each context, track the average reward each arm has produced.
//             Pick the best-average arm most of the time (exploit); pick a random
//             arm epsilon of the time (explore). Averages update as data arrives.
// ---------------------------------------------------------------------------

export const ARMS = [-5, 0, 5, 10] as const; // minutes to change the next goal by
export type Arm = (typeof ARMS)[number];

const EPSILON = 0.2; // 20% of the time, explore a random arm

// One arm's learned record within a context: how many times it's been tried,
// and its running average reward.
type ArmStat = { count: number; avgReward: number };

// The bandit's "memory": for each context key, a stat per arm.
export type BanditModel = Record<string, Record<string, ArmStat>>;

// ---- CONTEXT ---------------------------------------------------------------
// Reduce a day to a small, discrete context so the bandit can learn patterns.
export function contextKey(met: boolean, difficulty: string): string {
  return `${met ? "met" : "missed"}_${difficulty}`;
}

// ---- REWARD ----------------------------------------------------------------
// "Completed AND not too hard" reward signal.
export function reward(met: boolean, difficulty: string): number {
  if (!met) return 0;                 // didn't complete → bad
  if (difficulty === "Hard") return 0.5; // completed but a struggle → partial
  return 1;                            // completed comfortably → good
}

// ---- CHOOSE (the explore/exploit decision) --------------------------------
export function chooseArm(model: BanditModel, ctx: string): Arm {
  const stats = model[ctx] ?? {};

  // EXPLORE: with probability EPSILON, try a random arm to keep learning.
  if (Math.random() < EPSILON) {
    return ARMS[Math.floor(Math.random() * ARMS.length)];
  }

  // EXPLOIT: otherwise pick the arm with the best average reward so far.
  // If this context is new (no data), fall back to "0" (hold steady) —
  // the cold-start rules in adaptiveEngine.ts handle very new users.
  let best: Arm = 0;
  let bestAvg = -1;
  for (const arm of ARMS) {
    const s = stats[String(arm)];
    const avg = s ? s.avgReward : 0; // untried arms treated as neutral 0
    if (avg > bestAvg) { bestAvg = avg; best = arm; }
  }
  return best;
}

// ---- LEARN (update the model after seeing an outcome) ---------------------
// Called once we know how a chosen arm turned out. Updates the running
// average reward for (context, arm) — this is where the bandit "learns".
export function updateModel(model: BanditModel, ctx: string, arm: Arm, r: number): BanditModel {
  const next: BanditModel = { ...model, [ctx]: { ...(model[ctx] ?? {}) } };
  const prev = next[ctx][String(arm)] ?? { count: 0, avgReward: 0 };
  const count = prev.count + 1;
  // incremental average: newAvg = oldAvg + (reward - oldAvg) / count
  const avgReward = prev.avgReward + (r - prev.avgReward) / count;
  next[ctx][String(arm)] = { count, avgReward };
  return next;
}