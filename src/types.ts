export type CompetencyArea = "fach" | "selbst" | "sozial";
export type CompetencyDimension = "wissen" | "wollen" | "koennen";
export type Competencies = Record<CompetencyArea, Record<CompetencyDimension, number>>;
export type TargetAudience = "students" | "ref-beginning" | "ref-compact";

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
  shortDescription: string;
  methods: string;
  minutes: number;
  moderation: string;
  teacherAction: string;
  studentAction: string;
  differentiation: "Ja" | "Nein" | "Nicht vorgesehen";
  differentiationDetails: DifferentiationDetails;
  competencies: Competencies;
  color: string;
}

export interface LearningPrerequisites {
  priorKnowledge: string;
  subject: string;
  language: string;
  methodological: string;
  social: string;
  difficulties: string;
  consequences: string;
  compact: string;
}

export interface MindmapNode {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface Plan {
  targetAudience: TargetAudience;
  teacherName: string;
  topic: string;
  className: string;
  situationDescription: string;
  situationImageDataUrl: string;
  situationImageName: string;
  globalGoal: string;
  learningContent: string;
  observationEnabled: boolean;
  observationTask: string;
  date: string;
  startTime: string;
  studentCount: string;
  lessonDuration: string;
  organizationNotes: string;
  curriculumReference: string;
  annualPlanReference: string;
  topicPlacement: string;
  competencyIntentions: string;
  competencyDemand: string;
  wkwFocus: string;
  learningPrerequisites: LearningPrerequisites;
  didacticConsiderations: string;
  methodologicalConsiderations: string;
  contentMindmap: MindmapNode[];
  preparation: { before: string; during: string; after: string };
  criteriaChecks: Record<string, boolean>;
  phases: Phase[];
}
