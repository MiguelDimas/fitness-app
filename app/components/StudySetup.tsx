"use client";
import { useState } from "react";

type Props = { onStart: (participantId: string, firstMode: "fixed" | "adaptive") => void };

export default function StudySetup({ onStart }: Props) {
  const [pid, setPid] = useState("");
  const [firstMode, setFirstMode] = useState<"fixed" | "adaptive">("fixed");

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Study setup</h2>
        <p className="text-sm text-gray-500 mt-1">Enter the participant details to begin.</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-600">Participant ID</label>
        <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="e.g. P01"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-600">Starting phase</label>
        <div className="mt-1 flex rounded-lg bg-gray-100 p-1 text-sm">
          <button onClick={() => setFirstMode("fixed")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${firstMode === "fixed" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Fixed first
          </button>
          <button onClick={() => setFirstMode("adaptive")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${firstMode === "adaptive" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Adaptive first
          </button>
        </div>
      </div>
      <button
        onClick={() => pid.trim() && onStart(pid.trim(), firstMode)}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-40"
        disabled={!pid.trim()}>
        Start study
      </button>
    </div>
  );
}