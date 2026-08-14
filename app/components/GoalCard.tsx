type GoalCardProps = { done: number; goal: number; points: number; streak: number };

export default function GoalCard({ done, goal, points, streak }: GoalCardProps) {
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-gray-500">Today&apos;s goal</h2>
        <span className="text-sm text-gray-400">{pct}%</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">
        {done} <span className="text-gray-400 text-lg">/ {goal} min</span>
      </p>
      <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Points</p>
          <p className="text-xl font-semibold">{points.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Streak</p>
          <p className="text-xl font-semibold">
            {streak} <span className="text-sm font-normal text-gray-500">days</span>
          </p>
        </div>
      </div>
    </div>
  );
}