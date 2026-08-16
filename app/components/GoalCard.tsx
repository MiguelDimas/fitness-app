type GoalCardProps = { done: number; goal: number; points: number; streak: number };

export default function GoalCard({ done, goal, points, streak }: GoalCardProps) {
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-5 text-white shadow-lg shadow-blue-500/20">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-blue-100">Today&apos;s goal</h2>
        <span className="text-sm text-blue-100">{pct}%</span>
      </div>
      <p className="mt-1 text-3xl font-bold">
        {done} <span className="text-blue-200 text-lg font-medium">/ {goal} min</span>
      </p>
      <div className="mt-3 h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/15 backdrop-blur p-3">
          <p className="text-xs text-blue-100">Points</p>
          <p className="text-xl font-bold">{points.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white/15 backdrop-blur p-3">
          <p className="text-xs text-blue-100">Streak</p>
          <p className="text-xl font-bold">
            {streak} <span className="text-sm font-normal text-blue-100">days</span>
          </p>
        </div>
      </div>
    </div>
  );
}