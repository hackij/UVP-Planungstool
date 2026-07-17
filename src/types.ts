export type CompetencyArea = "fach" | "selbst" | "sozial";
export type CompetencyDimension = "wissen" | "wollen" | "koennen";
export type Competencies = Record<CompetencyArea, Record<CompetencyDimension, number>>;
export type TargetAudience = "students" | "ref-beginning" | "ref-advanced" | "in-service";

export type CompetencyFieldId = `${CompetencyArea}-${CompetencyDimension}`;

export interface CompetencyNeedEntry {
  demand: string;
  levelGoal: string;
  levelDescription: string;
  selectedClarifications: string[];
  customClarification: string;
  selectedConsequences: string[];
  customConsequence: string;
}

export interface CompetencyNeedAnalysis {
  selectedFields: CompetencyFieldId[];
  selectedLevels: Partial<Record<CompetencyFieldId, number[]>>;
  entries: Partial<Record<CompetencyFieldId, CompetencyNeedEntry>>;
  summary: string;
}

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
  groupFactors: string[];
  groupOther: string;
  specialFactors: string[];
  specialOther: string;
  selectedConsequences: Record<string, string[]>;
  customConsequences: Record<string, string>;
}

export interface GoalAssistant {
  situation: string;
  content: string;
  behavior: string;
  notes: string;
}

export interface LearningSituationCheckEntry {
  checked: boolean;
  notes: string;
}

export interface MindmapNode {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface ContentBubble {
  id: string;
  title: string;
  description: string;
  color: string;
  x: number;
  y: number;
  size: number;
  width: number;
  height: number;
}

export type BubbleSide = "left" | "right" | "top" | "bottom";

export interface ContentConnection {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: BubbleSide;
  toSide?: BubbleSide;
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
  goalAssistant: GoalAssistant;
  learningSituationChecks: Record<string, LearningSituationCheckEntry>;
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
  competencyNeedAnalysis: CompetencyNeedAnalysis;
  learningPrerequisites: LearningPrerequisites;
  didacticConsiderations: string;
  methodologicalConsiderations: string;
  contentMindmap: MindmapNode[];
  contentBubbles: ContentBubble[];
  contentConnections: ContentConnection[];
  preparation: { before: string; during: string; after: string };
  criteriaChecks: Record<string, boolean>;
  phases: Phase[];
}
