export type CompetencyArea = "fach" | "selbst" | "sozial";
export type CompetencyDimension = "wissen" | "wollen" | "koennen";
export type Competencies = Record<CompetencyArea, Record<CompetencyDimension, number>>;

export interface DifferentiationDetails {
  up: boolean;
  upHow: string;
  down: boolean;
  downHow: string;
}

export interface Phase {
  id: string;
  title: string;
  goal: string;
  content: string;
  methods: string;
  minutes: number;
  moderation: string;
  differentiation: "Ja" | "Nein" | "Nicht vorgesehen";
  differentiationDetails: DifferentiationDetails;
  competencies: Competencies;
  color: string;
}

export interface Plan {
  topic: string;
  globalGoal: string;
  date: string;
  startTime: string;
  preparation: { before: string; during: string; after: string };
  phases: Phase[];
}
