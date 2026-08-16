import { Workout } from "../lib/types";

const diffStyle: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  OK: "bg-blue-100 text-blue-700",
  Hard: "bg-orange-100 text-orange-700",
};

export default function WorkoutList({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-6">No workouts yet — log your first one above.</p>;
  }
  return (
    <div className="space-y-2">
      {workouts.map((w, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm">
          <span className="font-medium">{w.type}</span>
          <span className="flex items-center gap-2 text-gray-500">
            {w.mins} min
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffStyle[w.diff] ?? "bg-gray-100 text-gray-600"}`}>
              {w.diff}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}