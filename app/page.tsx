"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "./lib/firebase";
import GoalCard from "./components/GoalCard";
import WorkoutForm from "./components/WorkoutForm";
import WorkoutList from "./components/WorkoutList";
import Login from "./components/Login";
import { Workout } from "./lib/types";
import { nextGoal, Session, DEFAULT_GOAL, FIXED_GOAL, clampGoal } from "./lib/adaptiveEngine";
import { BanditModel, Arm, contextKey, reward, chooseArm, updateModel } from "./lib/bandit";
import BadgeShelf from "./components/BadgeShelf";
import { earnedBadges, badgeProgress, BadgeProgress } from "./lib/badges";

type Mode = "fixed" | "adaptive";

const COLDSTART_DAYS = 2; // first N adaptive days use the rule-based policy; then the bandit takes over

function hardestDifficulty(ws: Workout[]): string {
  if (ws.some((w) => w.diff === "Hard")) return "Hard";
  if (ws.some((w) => w.diff === "OK")) return "OK";
  if (ws.some((w) => w.diff === "Easy")) return "Easy";
  return "OK";
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [day, setDay] = useState(1);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [mode, setMode] = useState<Mode>("adaptive");
  const [fixedGoal, setFixedGoal] = useState(FIXED_GOAL);
  const [motivation, setMotivation] = useState(3);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, BadgeProgress>>({});

  // bandit state (persisted per-user on adaptiveState)
  const [banditModel, setBanditModel] = useState<BanditModel>({});
  const [pendingArm, setPendingArm] = useState<number | null>(null);
  const [pendingContext, setPendingContext] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) loadState(user.uid);
  }, [user]);

  async function loadState(uid: string) {
    setLoading(true);
    const stateRef = doc(db, "adaptiveState", uid);
    const stateSnap = await getDoc(stateRef);
    let curDay = 1, curGoal = DEFAULT_GOAL, curStreak = 0, curMode: Mode = "adaptive", curFixed = FIXED_GOAL;
    let curModel: BanditModel = {}, curPendingArm: number | null = null, curPendingContext: string | null = null;
    if (stateSnap.exists()) {
      const s = stateSnap.data();
      curDay = s.currentDay; curGoal = s.currentGoal; curStreak = s.streak;
      curMode = (s.mode ?? "adaptive") as Mode; curFixed = s.fixedGoal ?? FIXED_GOAL;
      curModel = s.banditModel ?? {}; curPendingArm = s.pendingArm ?? null; curPendingContext = s.pendingContext ?? null;
    } else {
      await setDoc(stateRef, {
        currentDay: 1, currentGoal: DEFAULT_GOAL, streak: 0, mode: "adaptive", fixedGoal: FIXED_GOAL,
        banditModel: {}, pendingArm: null, pendingContext: null,
      });
    }
    setDay(curDay); setGoal(curGoal); setStreak(curStreak); setMode(curMode); setFixedGoal(curFixed);
    setBanditModel(curModel); setPendingArm(curPendingArm); setPendingContext(curPendingContext);

    const allDaysSnap = await getDocs(query(collection(db, "days"), where("userId", "==", uid)));
    const allDays = allDaysSnap.docs.map((d) => d.data());
    const daysCompleted = allDays.filter((d) => d.met).length;
    const totalMinutes = allDays.reduce((sum, d) => sum + (d.achieved || 0), 0);
    let bestStreak = 0, run = 0;
    allDays.sort((a, b) => a.dayNumber - b.dayNumber).forEach((d) => {
      run = d.met ? run + 1 : 0;
      if (run > bestStreak) bestStreak = run;
    });
    setBadges(earnedBadges({ daysCompleted, bestStreak, totalMinutes }));
    setProgress(badgeProgress({ daysCompleted, bestStreak, totalMinutes }));

    const wSnap = await getDocs(query(
      collection(db, "workouts"),
      where("userId", "==", uid),
      where("dayNumber", "==", curDay)
    ));
    const loaded = wSnap.docs.map((d) => d.data() as Workout);
    setWorkouts(loaded);
    setPoints(loaded.reduce((sum, w) => sum + w.mins * 10, 0));
    setLoading(false);
  }

  const done = workouts.reduce((sum, w) => sum + w.mins, 0);

  async function addWorkout(type: string, mins: number, diff: string) {
    if (!user) return;
    const w: Workout = { type, mins, diff };
    setWorkouts([w, ...workouts]);
    setPoints((p) => p + mins * 10);
    await addDoc(collection(db, "workouts"), {
      ...w, userId: user.uid, dayNumber: day, createdAt: serverTimestamp(),
    });
  }

  async function finishDay() {
    if (!user) return;
    const achieved = done;
    const difficulty = hardestDifficulty(workouts);
    const met = achieved >= goal;

    // log the day (this is your evaluation dataset)
    await addDoc(collection(db, "days"), {
      userId: user.uid, dayNumber: day, goal, achieved, difficulty, met,
      mode, motivation, createdAt: serverTimestamp(),
    });

    const newStreak = met ? streak + 1 : 0;

    let newGoal: number;
    let updatedModel = banditModel;
    let newPendingArm: number | null = null;
    let newPendingContext: string | null = null;

    if (mode === "fixed") {
      newGoal = fixedGoal; // fixed mode never adapts
    } else {
      // all adaptive days so far (includes the day just logged)
      const daysSnap = await getDocs(query(collection(db, "days"), where("userId", "==", user.uid)));
      const adaptiveDays = daysSnap.docs
        .map((d) => d.data())
        .filter((d) => (d.mode ?? "adaptive") === "adaptive")
        .sort((a, b) => a.dayNumber - b.dayNumber);

      // 1) LEARN: if the goal we just tested was chosen by the bandit, credit that (context, arm) with its reward
      if (pendingArm !== null && pendingContext !== null) {
        const r = reward(met, difficulty);
        updatedModel = updateModel(banditModel, pendingContext, pendingArm as Arm, r);
      }

      // 2) DECIDE tomorrow's goal
      if (adaptiveDays.length <= COLDSTART_DAYS) {
        // COLD START: use the rule-based policy while the bandit has too little data
        const history: Session[] = adaptiveDays.map((d) => ({ goal: d.goal, achieved: d.achieved, difficulty: d.difficulty }));
        newGoal = nextGoal(history, newStreak);
      } else {
        // BANDIT: choose an adjustment for tomorrow based on today's context, then apply it
        const ctx = contextKey(met, difficulty);
        const arm = chooseArm(updatedModel, ctx);
        newGoal = clampGoal(goal + arm);
        newPendingArm = arm;       // remember what we chose so we can credit it tomorrow
        newPendingContext = ctx;
      }
    }

    await setDoc(doc(db, "adaptiveState", user.uid), {
      currentDay: day + 1, currentGoal: newGoal, streak: newStreak, mode, fixedGoal,
      banditModel: updatedModel, pendingArm: newPendingArm, pendingContext: newPendingContext,
    });

    setMotivation(3);
    await loadState(user.uid);
  }

  async function switchMode(newMode: Mode) {
    if (!user) return;
    const newGoal = newMode === "fixed" ? fixedGoal : goal;
    await setDoc(doc(db, "adaptiveState", user.uid), {
      currentDay: day, currentGoal: newGoal, streak, mode: newMode, fixedGoal,
      banditModel, pendingArm, pendingContext,
    });
    await loadState(user.uid);
  }

  if (!authReady) return <main className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</main>;
  if (!user) return <Login />;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Fitness Tracker · Day {day}</h1>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-gray-800">Log out</button>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
          <button onClick={() => switchMode("fixed")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${mode === "fixed" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Fixed
          </button>
          <button onClick={() => switchMode("adaptive")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${mode === "adaptive" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
            Adaptive
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
        ) : (
          <>
            <GoalCard done={done} goal={goal} points={points} streak={streak} />
            <BadgeShelf earned={badges} progress={progress} />
            <WorkoutForm onAdd={addWorkout} />
            <WorkoutList workouts={workouts} />

            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5 space-y-3">
              <p className="text-sm font-medium text-gray-500">How motivated did you feel today?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMotivation(n)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${motivation === n ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <button onClick={finishDay}
                className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black transition">
                Finish day → next goal
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}