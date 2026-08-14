"use client";
import { useState } from "react";

type WorkoutFormProps = { onAdd: (type: string, mins: number, diff: string) => void };

export default function WorkoutForm({ onAdd }: WorkoutFormProps) {
  const [type, setType] = useState("");
  const [mins, setMins] = useState(15);
  const [diff, setDiff] = useState("OK");

  function submit() {
    onAdd(type.trim() || "Workout", Math.max(1, Math.round(Number(mins) || 0)), diff);
    setType("");
    setMins(15);
    setDiff("OK");
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-medium text-gray-500">Log a workout</h2>
      <input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="e.g. Full body"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-3">
        <input
          type="number"
          min={1}
          value={mins}
          onChange={(e) => setMins(Number(e.target.value))}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={diff}
          onChange={(e) => setDiff(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>Easy</option>
          <option>OK</option>
          <option>Hard</option>
        </select>
      </div>
      <button
        onClick={submit}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
      >
        Add workout
      </button>
    </div>
  );
}