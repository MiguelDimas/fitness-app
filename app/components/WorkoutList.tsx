import { Workout } from "../lib/types";

export default function WorkoutList({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-6">No workouts yet — log your first one above.</p>;
  }
  return (
    <div className="space-y-2">
      {workouts.map((w, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm">
          <span className="font-medium">{w.type}</span>
          <span className="text-gray-500">{w.mins} min · {w.diff}</span>
        </div>
      ))}
    </div>
  );
}