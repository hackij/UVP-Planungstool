import type { Competencies, Phase, Plan } from "./types.ts";

// Farbenblindheitsfreundliche, klar unterscheidbare Akzentfarben.
export const PHASE_COLORS = ["#009E73", "#E69F00", "#0072B2", "#D55E00", "#8B5CF6", "#CC79A7", "#56B4E9", "#7A7F00"];

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
  shortDescription: "",
  methods: "",
  minutes,
  moderation: "",
  teacherAction: "",
  studentAction: "",
  differentiation: "Nicht vorgesehen",
  differentiationDetails: { up: false, upHow: "", down: false, downHow: "" },
  competencies: emptyCompetencies(),
  color,
});

export const initialPlan = (): Plan => ({
  targetAudience: "students",
  teacherName: "",
  topic: "",
  className: "",
  situationDescription: "",
  situationImageDataUrl: "",
  situationImageName: "",
  globalGoal: "",
  learningContent: "",
  observationEnabled: false,
  observationTask: "",
  date: "",
  startTime: "",
  studentCount: "",
  lessonDuration: "",
  organizationNotes: "",
  curriculumReference: "",
  annualPlanReference: "",
  topicPlacement: "",
  competencyIntentions: "",
  competencyDemand: "",
  wkwFocus: "",
  learningPrerequisites: {
    priorKnowledge: "",
    subject: "",
    language: "",
    methodological: "",
    social: "",
    difficulties: "",
    consequences: "",
    compact: "",
  },
  didacticConsiderations: "",
  methodologicalConsiderations: "",
  contentMindmap: [],
  preparation: { before: "", during: "", after: "" },
  criteriaChecks: {},
  phases: [],
});

export const phaseTemplate = (index: number): Phase =>
  phase("", 10, PHASE_COLORS[index % PHASE_COLORS.length], "");
