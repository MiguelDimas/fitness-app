import { ALL_BADGES, BadgeProgress } from "../lib/badges";

type Props = {
  earned: string[];
  progress: Record<string, BadgeProgress>;
};

export default function BadgeShelf({ earned, progress }: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
      <h2 className="text-sm font-medium text-gray-500 mb-3">Your medals</h2>
      <div className="grid grid-cols-3 gap-3">
        {ALL_BADGES.map((b) => {
          const has = earned.includes(b.id);
          const p = progress[b.id];
          const pct = p ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0;
          return (
            <div key={b.id} title={b.description}
              className={`flex flex-col items-center rounded-xl border p-3 text-center transition ${has ? "border-transparent bg-gradient-to-br from-blue-50 to-purple-50 ring-1 ring-blue-200" : "border-gray-200 bg-gray-50"}`}>
              <span className={`text-2xl ${has ? "" : "opacity-40 grayscale"}`}>{b.emoji}</span>
              <span className={`mt-1 text-xs font-medium ${has ? "text-gray-800" : "text-gray-400"}`}>{b.name}</span>
              {has ? (
                <span className="mt-1 text-[10px] font-semibold text-blue-600">Earned ✓</span>
              ) : (
                <div className="mt-2 w-full">
                  <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mt-1 block text-[10px] text-gray-400">
                    {Math.min(p?.current ?? 0, p?.target ?? 0)} / {p?.target ?? 0}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}