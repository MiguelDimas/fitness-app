"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "./lib/firebase";
import GoalCard from "./components/GoalCard";
import WorkoutForm from "./components/WorkoutForm";
import WorkoutList from "./components/WorkoutList";
import Login from "./components/Login";
import StudySetup from "./components/StudySetup";
import { Workout } from "./lib/types";
import { nextGoal, Session, DEFAULT_GOAL, FIXED_GOAL, clampGoal } from "./lib/adaptiveEngine";
import { BanditModel, Arm, contextKey, reward, chooseArm, updateModel } from "./lib/bandit";
import BadgeShelf from "./components/BadgeShelf";
import { earnedBadges, badgeProgress, BadgeProgress } from "./lib/badges";

type Mode = "fixed" | "adaptive";
const COLDSTART_DAYS = 2;
const DAYS_PER_PHASE = 3;

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
  const [mode, setMode] = useState<Mode>("fixed");
  const [fixedGoal, setFixedGoal] = useState(FIXED_GOAL);
  const [motivation, setMotivation] = useState(3);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, BadgeProgress>>({});
  const [banditModel, setBanditModel] = useState<BanditModel>({});
  const [pendingArm, setPendingArm] = useState<number | null>(null);
  const [pendingContext, setPendingContext] = useState<string | null>(null);

  // study fields
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [firstMode, setFirstMode] = useState<Mode>("fixed");
  const [phaseDay, setPhaseDay] = useState(1);   // day within the current phase (1..DAYS_PER_PHASE)
  const [phase, setPhase] = useState(1);          // 1 or 2
  const [studyComplete, setStudyComplete] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

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

    if (!stateSnap.exists() || !stateSnap.data().participantId) {
      // no study record yet → show setup screen
      setNeedsSetup(true);
      setLoading(false);
      return;
    }

    const s = stateSnap.data();
    const curGoal = s.currentGoal, curStreak = s.streak;
    const curModel: BanditModel = s.banditModel ?? {};
    const curPhase = s.phase ?? 1, curPhaseDay = s.phaseDay ?? 1, curFirst = (s.firstMode ?? "fixed") as Mode;
    const complete = s.studyComplete ?? false;

    setParticipantId(s.participantId);
    setFirstMode(curFirst);
    setPhase(curPhase);
    setPhaseDay(curPhaseDay);
    setStudyComplete(complete);
    setNeedsSetup(false);

    // current mode is decided by phase + first-mode order
    const curMode: Mode = curPhase === 1 ? curFirst : (curFirst === "fixed" ? "adaptive" : "fixed");
    setMode(curMode);
    setGoal(curGoal); setStreak(curStreak); setFixedGoal(s.fixedGoal ?? FIXED_GOAL);
    setBanditModel(curModel); setPendingArm(s.pendingArm ?? null); setPendingContext(s.pendingContext ?? null);
    setDay(s.currentDay ?? 1);

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

    const wSnap = await getDocs(query(collection(db, "workouts"), where("userId", "==", uid), where("dayNumber", "==", s.currentDay ?? 1)));
    const loaded = wSnap.docs.map((d) => d.data() as Workout);
    setWorkouts(loaded);
    setPoints(loaded.reduce((sum, w) => sum + w.mins * 10, 0));
    setLoading(false);
  }

  async function startStudy(pid: string, first: Mode) {
    if (!user) return;
    await setDoc(doc(db, "adaptiveState", user.uid), {
      participantId: pid, firstMode: first, phase: 1, phaseDay: 1,
      currentDay: 1, currentGoal: first === "fixed" ? FIXED_GOAL : DEFAULT_GOAL,
      streak: 0, fixedGoal: FIXED_GOAL, studyComplete: false,
      banditModel: {}, pendingArm: null, pendingContext: null,
    });
    await loadState(user.uid);
  }

  const done = workouts.reduce((sum, w) => sum + w.mins, 0);

  async function addWorkout(type: string, mins: number, diff: string) {
    if (!user) return;
    const w: Workout = { type, mins, diff };
    setWorkouts([w, ...workouts]);
    setPoints((p) => p + mins * 10);
    await addDoc(collection(db, "workouts"), { ...w, userId: user.uid, dayNumber: day, createdAt: serverTimestamp() });
  }

  async function finishDay() {
    if (!user) return;
    const achieved = done;
    const difficulty = hardestDifficulty(workouts);
    const met = achieved >= goal;

    await addDoc(collection(db, "days"), {
      userId: user.uid, participantId, phase, mode, dayNumber: day, phaseDay,
      goal, achieved, difficulty, met, motivation, createdAt: serverTimestamp(),
    });

    const newStreak = met ? streak + 1 : 0;

    // work out next goal for the *current* mode
    let newGoal: number;
    let updatedModel = banditModel;
    let newPendingArm: number | null = null;
    let newPendingContext: string | null = null;

    if (mode === "fixed") {
      newGoal = fixedGoal;
    } else {
      const daysSnap = await getDocs(query(collection(db, "days"), where("userId", "==", user.uid)));
      const adaptiveDays = daysSnap.docs.map((d) => d.data()).filter((d) => d.mode === "adaptive")
        .sort((a, b) => a.dayNumber - b.dayNumber);
      if (pendingArm !== null && pendingContext !== null) {
        updatedModel = updateModel(banditModel, pendingContext, pendingArm as Arm, reward(met, difficulty));
      }
      if (adaptiveDays.length <= COLDSTART_DAYS) {
        const history: Session[] = adaptiveDays.map((d) => ({ goal: d.goal, achieved: d.achieved, difficulty: d.difficulty }));
        newGoal = nextGoal(history, newStreak);
      } else {
        const ctx = contextKey(met, difficulty);
        const arm = chooseArm(updatedModel, ctx);
        newGoal = clampGoal(goal + arm);
        newPendingArm = arm; newPendingContext = ctx;
      }
    }

    // advance phase/day
    let newPhase = phase, newPhaseDay = phaseDay + 1, complete = false;
    let nextMode: Mode = mode;
    if (newPhaseDay > DAYS_PER_PHASE) {
      if (phase === 1) {
        newPhase = 2; newPhaseDay = 1;
        nextMode = firstMode === "fixed" ? "adaptive" : "fixed";
        // reset goal/streak/bandit for the new phase
        newGoal = nextMode === "fixed" ? fixedGoal : DEFAULT_GOAL;
        newPendingArm = null; newPendingContext = null;
      } else {
        complete = true; // finished phase 2
      }
    }

    await setDoc(doc(db, "adaptiveState", user.uid), {
      participantId, firstMode, phase: newPhase, phaseDay: newPhaseDay,
      currentDay: day + 1, currentGoal: newGoal,
      streak: newPhaseDay === 1 ? 0 : newStreak, fixedGoal, studyComplete: complete,
      banditModel: updatedModel, pendingArm: newPendingArm, pendingContext: newPendingContext,
    });

    setMotivation(3);
    await loadState(user.uid);
  }

  if (!authReady) return <main className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center text-gray-400">Loading…</main>;
  if (!user) return <Login />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 text-gray-900">
      <div className="mx-auto max-w-md px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Fitness Tracker
          </h1>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-gray-800">Log out</button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
        ) : needsSetup ? (
          <StudySetup onStart={startStudy} />
        ) : studyComplete ? (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6 text-center space-y-2">
            <p className="text-2xl">🎉</p>
            <h2 className="text-lg font-semibold">Study complete</h2>
            <p className="text-sm text-gray-500">Thank you for taking part. You can close the app now.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">Phase {phase} of 2 · Day {phaseDay} of {DAYS_PER_PHASE}</p>
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
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition">
                Finish day
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}