import type { Competencies, CompetencyNeedAnalysis, Phase, Plan } from "./types.ts";

// Farbenblindheitsfreundliche, klar unterscheidbare Akzentfarben.
export const PHASE_COLORS = ["#009E73", "#E69F00", "#0072B2", "#D55E00", "#8B5CF6", "#CC79A7", "#56B4E9", "#7A7F00"];

export const emptyCompetencies = (): Competencies => ({
  fach: { wissen: 0, wollen: 0, koennen: 0 },
  selbst: { wissen: 0, wollen: 0, koennen: 0 },
  sozial: { wissen: 0, wollen: 0, koennen: 0 },
});

export const emptyCompetencyNeedAnalysis = (): CompetencyNeedAnalysis => ({
  selectedFields: [],
  selectedLevels: {},
  entries: {},
  summary: "",
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
  goalAssistant: {
    situation: "",
    content: "",
    behavior: "",
    notes: "",
  },
  learningSituationChecks: {},
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
  competencyNeedAnalysis: emptyCompetencyNeedAnalysis(),
  learningPrerequisites: {
    priorKnowledge: "",
    subject: "",
    language: "",
    methodological: "",
    social: "",
    difficulties: "",
    consequences: "",
    compact: "",
    groupFactors: [],
    groupOther: "",
    specialFactors: [],
    specialOther: "",
    selectedConsequences: {},
    customConsequences: {},
  },
  didacticConsiderations: "",
  methodologicalConsiderations: "",
  contentMindmap: [],
  contentBubbles: [],
  contentConnections: [],
  preparation: { before: "", during: "", after: "" },
  criteriaChecks: {},
  phases: [],
});

export const phaseTemplate = (index: number): Phase =>
  phase("", 10, PHASE_COLORS[index % PHASE_COLORS.length], "");
