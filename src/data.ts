import type { Competencies, Phase, Plan } from "./types.ts";

export const PHASE_COLORS = ["#e97b58", "#89c5d2", "#d9f45f", "#efb95d", "#9fa8dc", "#7fc6a4", "#ef9fbb"];

export const emptyCompetencies = (): Competencies => ({
  fach: { wissen: 0, wollen: 0, koennen: 0 },
  selbst: { wissen: 0, wollen: 0, koennen: 0 },
  sozial: { wissen: 0, wollen: 0, koennen: 0 },
});

const phase = (title: string, minutes: number, color: string, goal = ""): Phase => ({
  id: crypto.randomUUID(),
  title,
  goal,
  content: "",
  methods: "",
  minutes,
  moderation: "",
  differentiation: "Nicht vorgesehen",
  differentiationDetails: { up: false, upHow: "", down: false, downHow: "" },
  competencies: emptyCompetencies(),
  color,
});

export const initialPlan = (): Plan => ({
  topic: "Lernsituation / Thema der Stunde",
  globalGoal: "Die Lernenden können …",
  date: new Date().toISOString().slice(0, 10),
  startTime: "08:00",
  preparation: { before: "", during: "", after: "" },
  criteriaChecks: {},
  phases: [
    { ...phase("Orientieren", 10, PHASE_COLORS[0], "Wir erkennen die zentrale Herausforderung …"), moderation: "Ankommen, aktivieren, irritieren: Was fällt euch auf?" },
    phase("Informieren", 15, PHASE_COLORS[1], "Wir erschließen die nötigen Informationen …"),
    phase("Planen", 10, PHASE_COLORS[2], "Wir entwickeln einen begründeten Lösungsweg …"),
    phase("Durchführen", 25, PHASE_COLORS[3], "Wir setzen unseren Plan selbstständig um …"),
    phase("Bewerten", 15, PHASE_COLORS[4], "Wir prüfen unser Ergebnis anhand der Kriterien …"),
    phase("Reflektieren", 10, PHASE_COLORS[5], "Wir leiten Erkenntnisse für unser weiteres Lernen ab …"),
  ],
});

export const phaseTemplate = (index: number): Phase =>
  phase("Neue Phase", 10, PHASE_COLORS[index % PHASE_COLORS.length], "Wir können …");
