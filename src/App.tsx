import { Fragment, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronDown, ChevronRight, ClipboardCheck, Clock3, Download, FileDown, Grid3X3,
  GripVertical, ImagePlus, LibraryBig, Menu, Plus, Printer, RotateCcw, Save, Trash2, Upload, X,
} from "lucide-react";
import { emptyCompetencyNeedAnalysis, initialPlan, PHASE_COLORS, phaseTemplate } from "./data.ts";
import { EXAM_CRITERIA, EXAM_CRITERIA_COUNT } from "./criteria.ts";
import { VERB_CATALOG } from "./verbCatalog.ts";
import { ACCESS_SESSION_KEY, APP_ACCESS_CODE, APP_FOOTER_TEXT, APP_VERSION } from "./appConfig.ts";
import type { BubbleSide, CompetencyArea, CompetencyDimension, CompetencyFieldId, CompetencyNeedAnalysis, CompetencyNeedEntry, ContentBubble, ContentConnection, MindmapNode, Phase, Plan, TargetAudience } from "./types.ts";

const STORAGE_KEY = "uvp-studio-plan-v1";
const ONBOARDING_VERSION = "app-entdecken-2026-07";
const ONBOARDING_STORAGE_KEY = "uvp-studio-onboarding";
const ONBOARDING_SESSION_LATER_KEY = "uvp-studio-onboarding-later";
const SCHOOL_LOGO = "./bs1-logo-hell.png";
const SEMINAR_LOGO = "./seminar-metalltechnik-logo.png";
const UVP_STUDIO_LOGO = "./logo-concepts/uvp-studio-logo-final-v2.png";
const HKM_REFERENCE_IMAGE = "./handlungskompetenzmatrix-dier-referenz-ohne-caption.png";
const LEGACY_PHASE_COLORS = new Set([
  "#e97b58", "#89c5d2", "#d9f45f", "#efb95d", "#9fa8dc", "#7fc6a4", "#ef9fbb",
  "#e5b5b8", "#b9cfe9", "#d8e7f7", "#d98d92", "#8fb0d7", "#c8d9ed", "#bd6268",
]);
const areas: { key: CompetencyArea; label: string; short: string }[] = [
  { key: "fach", label: "Fachkompetenz", short: "Fach" },
  { key: "selbst", label: "Selbstkompetenz", short: "Selbst" },
  { key: "sozial", label: "Sozialkompetenz", short: "Sozial" },
];
const dimensions: { key: CompetencyDimension; label: string }[] = [
  { key: "wissen", label: "Wissen" }, { key: "koennen", label: "Können" }, { key: "wollen", label: "Wollen" },
];
const landscapeDimensions: { key: CompetencyDimension; label: string }[] = [
  { key: "wissen", label: "A: Wissen" }, { key: "koennen", label: "B: Können" }, { key: "wollen", label: "C: Wollen" },
];
const competencyFieldOrder: CompetencyFieldId[] = areas.flatMap((area) => dimensions.map((dimension) => `${area.key}-${dimension.key}` as CompetencyFieldId));
const defaultCompetencyNeedEntry = (): CompetencyNeedEntry => ({
  demand: "",
  levelGoal: "",
  levelDescription: "",
  selectedClarifications: [],
  customClarification: "",
  selectedConsequences: [],
  customConsequence: "",
});
const competencyClarificationSuggestions: Record<CompetencyFieldId, string[]> = {
  "fach-wissen": ["Fachbegriffe kennen und verstehen", "Zusammenhänge erklären", "Regeln und Prinzipien einordnen", "Wissen auf eine berufliche Situation beziehen"],
  "fach-koennen": ["Verfahren fachgerecht anwenden", "Arbeitsschritte planen und durchführen", "Entscheidungen begründen", "Ergebnisse prüfen und verbessern", "Fachwissen auf neue Situationen übertragen"],
  "fach-wollen": ["fachgerecht arbeiten wollen", "Qualitätsansprüche beachten", "Verantwortung für das eigene Ergebnis übernehmen", "sorgfältig und nachhaltig handeln", "Entscheidungen fachlich vertreten"],
  "selbst-wissen": ["Anforderungen an selbstständiges Arbeiten kennen", "Kriterien für das eigene Vorgehen verstehen", "Lernstrategien benennen", "Fehler als Lernanlass einordnen"],
  "selbst-koennen": ["selbstständig arbeiten", "das eigene Vorgehen reflektieren", "Ausdauer zeigen", "Verantwortung für den eigenen Lernprozess übernehmen", "mit Fehlern konstruktiv umgehen"],
  "selbst-wollen": ["Eigenverantwortung übernehmen wollen", "Ausdauer und Sorgfalt zeigen", "Feedback annehmen", "Lernfortschritte aktiv verfolgen", "mit Unsicherheit konstruktiv umgehen"],
  "sozial-wissen": ["Kommunikationsregeln kennen", "Rollen und Aufgaben in Teams verstehen", "Perspektiven anderer einordnen", "Kriterien gelingender Kooperation benennen"],
  "sozial-koennen": ["Absprachen treffen", "kooperativ arbeiten", "Perspektiven anderer berücksichtigen", "Konflikte sachlich lösen", "gemeinsam Verantwortung übernehmen"],
  "sozial-wollen": ["Verantwortung für gemeinsame Ergebnisse übernehmen", "anderen aktiv zuhören", "fair und zuverlässig zusammenarbeiten", "Kompromisse mittragen", "Beiträge anderer wertschätzen"],
};
const dimensionConsequenceSuggestions: Record<CompetencyDimension, string[]> = {
  wissen: ["relevante Fachbegriffe und Regeln kennen", "Zusammenhänge der Tätigkeit verstehen", "Qualitäts- und Sicherheitsanforderungen begründen", "Wissen auf die berufliche Anforderung beziehen"],
  koennen: ["Arbeitsschritte fachgerecht planen", "Verfahren sachgerecht ausführen", "Entscheidungen im Arbeitsprozess begründen", "Ergebnisse prüfen und bewerten", "auf ähnliche berufliche Situationen übertragen"],
  wollen: ["Sorgfalt und Verantwortung übernehmen", "Qualitätsmaßstäbe ernst nehmen", "sicherheitsbewusst handeln", "Entscheidungen fachlich vertreten", "Auswirkungen des Handelns berücksichtigen"],
};
const areaConsequenceSuggestions: Record<CompetencyArea, string[]> = {
  fach: [],
  selbst: ["eigene Arbeit strukturieren", "Selbstkontrolle durchführen", "mit Unsicherheit umgehen", "Verantwortung für das Ergebnis übernehmen", "das eigene Vorgehen reflektieren"],
  sozial: ["Absprachen fachgerecht treffen", "Informationen adressatengerecht weitergeben", "Perspektiven anderer berücksichtigen", "gemeinsam Entscheidungen tragen", "Verantwortung im Team übernehmen"],
};
const targetAudienceOptions: { key: TargetAudience; title: string; subtitle: string }[] = [
  { key: "students", title: "Studium", subtitle: "Vollständige Analyse- und Grobplanungsfassung" },
  { key: "ref-beginning", title: "Am Anfang des Referendariats", subtitle: "Reduziert, aber mit didaktischer Orientierung" },
  { key: "ref-advanced", title: "Im fortgeschrittenen Referendariat", subtitle: "Schlanker Planungsmodus mit optionaler Vertiefung" },
  { key: "in-service", title: "Im Dienst", subtitle: "Kompakte Planung für den Unterrichtsalltag" },
];
const targetAudienceKeys = targetAudienceOptions.map((option) => option.key);
type FieldVisibility = "visible" | "optional" | "hidden";
type PlanningSectionId =
  | "organization"
  | "context"
  | "directResources"
  | "competencyNeed"
  | "contentAnalysis"
  | "addressAnalysis"
  | "synthesis"
  | "observation"
  | "competencyProfile";

interface PlanningLevelConfig {
  rank: number;
  sections: Record<PlanningSectionId, { visibility: FieldVisibility; fields?: Record<string, FieldVisibility> }>;
  pdf: {
    analysis: FieldVisibility;
    competencyProfile: FieldVisibility;
    professionalRequirement: FieldVisibility;
    phaseCompetencyGoal: FieldVisibility;
    phaseActions: FieldVisibility;
    phaseMethods: FieldVisibility;
  };
}

const planningLevelConfig: Record<TargetAudience, PlanningLevelConfig> = {
  students: {
    rank: 0,
    sections: {
      organization: { visibility: "visible", fields: { studentCount: "visible", lessonDuration: "visible", organizationNotes: "visible" } },
      context: { visibility: "visible", fields: { topic: "visible", professionalRequirement: "visible", situationFile: "visible", globalGoal: "visible", goalAssistant: "visible" } },
      directResources: { visibility: "visible" },
      competencyNeed: { visibility: "visible" },
      contentAnalysis: { visibility: "visible", fields: { contentBubbles: "visible", compactLearningContent: "hidden" } },
      addressAnalysis: { visibility: "visible", fields: { detailed: "visible", compact: "hidden" } },
      synthesis: { visibility: "visible", fields: { concreteLearningSituation: "visible", learningSituationCheck: "visible", phaseGoal: "visible", phaseActions: "visible", phaseMethods: "visible", phaseCompetencies: "visible", phaseModeration: "hidden" } },
      observation: { visibility: "hidden" },
      competencyProfile: { visibility: "visible" },
    },
    pdf: { analysis: "visible", competencyProfile: "visible", professionalRequirement: "visible", phaseCompetencyGoal: "visible", phaseActions: "visible", phaseMethods: "visible" },
  },
  "ref-beginning": {
    rank: 1,
    sections: {
      organization: { visibility: "visible", fields: { studentCount: "visible", lessonDuration: "visible", organizationNotes: "visible" } },
      context: { visibility: "visible", fields: { topic: "visible", professionalRequirement: "visible", situationFile: "visible", globalGoal: "visible", goalAssistant: "visible" } },
      directResources: { visibility: "visible" },
      competencyNeed: { visibility: "visible" },
      contentAnalysis: { visibility: "visible", fields: { contentBubbles: "visible", compactLearningContent: "hidden" } },
      addressAnalysis: { visibility: "visible", fields: { detailed: "visible", compact: "hidden" } },
      synthesis: { visibility: "visible", fields: { concreteLearningSituation: "visible", learningSituationCheck: "visible", phaseGoal: "visible", phaseActions: "visible", phaseMethods: "visible", phaseCompetencies: "visible", phaseModeration: "hidden" } },
      observation: { visibility: "optional" },
      competencyProfile: { visibility: "visible" },
    },
    pdf: { analysis: "visible", competencyProfile: "visible", professionalRequirement: "visible", phaseCompetencyGoal: "visible", phaseActions: "visible", phaseMethods: "visible" },
  },
  "ref-advanced": {
    rank: 2,
    sections: {
      organization: { visibility: "visible", fields: { studentCount: "visible", lessonDuration: "visible", organizationNotes: "hidden" } },
      context: { visibility: "visible", fields: { topic: "visible", professionalRequirement: "visible", situationFile: "visible", globalGoal: "visible", goalAssistant: "hidden" } },
      directResources: { visibility: "visible" },
      competencyNeed: { visibility: "hidden" },
      contentAnalysis: { visibility: "optional", fields: { contentBubbles: "optional", compactLearningContent: "visible" } },
      addressAnalysis: { visibility: "visible", fields: { detailed: "hidden", compact: "visible" } },
      synthesis: { visibility: "visible", fields: { concreteLearningSituation: "visible", learningSituationCheck: "optional", phaseGoal: "visible", phaseActions: "hidden", phaseMethods: "hidden", phaseCompetencies: "hidden", phaseModeration: "optional" } },
      observation: { visibility: "optional" },
      competencyProfile: { visibility: "hidden" },
    },
    pdf: { analysis: "optional", competencyProfile: "hidden", professionalRequirement: "visible", phaseCompetencyGoal: "visible", phaseActions: "hidden", phaseMethods: "hidden" },
  },
  "in-service": {
    rank: 3,
    sections: {
      organization: { visibility: "visible", fields: { studentCount: "hidden", lessonDuration: "hidden", organizationNotes: "hidden" } },
      context: { visibility: "visible", fields: { topic: "visible", professionalRequirement: "hidden", situationFile: "visible", globalGoal: "visible", goalAssistant: "hidden" } },
      directResources: { visibility: "hidden" },
      competencyNeed: { visibility: "hidden" },
      contentAnalysis: { visibility: "optional", fields: { contentBubbles: "optional", compactLearningContent: "hidden" } },
      addressAnalysis: { visibility: "hidden" },
      synthesis: { visibility: "visible", fields: { concreteLearningSituation: "hidden", learningSituationCheck: "hidden", phaseGoal: "hidden", phaseActions: "hidden", phaseMethods: "hidden", phaseCompetencies: "hidden", phaseModeration: "optional" } },
      observation: { visibility: "optional" },
      competencyProfile: { visibility: "hidden" },
    },
    pdf: { analysis: "hidden", competencyProfile: "hidden", professionalRequirement: "hidden", phaseCompetencyGoal: "hidden", phaseActions: "hidden", phaseMethods: "hidden" },
  },
};

const sectionVisibility = (config: PlanningLevelConfig, section: PlanningSectionId) => config.sections[section].visibility;
const fieldVisibility = (config: PlanningLevelConfig, section: PlanningSectionId, field: string) => config.sections[section].fields?.[field] ?? config.sections[section].visibility;
const isVisible = (visibility: FieldVisibility) => visibility === "visible" || visibility === "optional";
type OnboardingStatus = "new" | "skipped" | "completed";
type TourTargetId =
  | "app-shell"
  | "planning-stand"
  | "planning-overview"
  | "planning-overview-mobile"
  | "planning-room"
  | "professional-requirement"
  | "compact-content-frame"
  | "concrete-learning-situation"
  | "models-menu"
  | "phase-actions"
  | "file-menu"
  | "help-menu";
type TourStep = {
  id: string;
  targetId?: TourTargetId;
  fallbackTargetId?: TourTargetId;
  title: string;
  description: string;
  decisionHelp?: boolean;
  planningOverviewHelp?: boolean;
  allowTargetInteraction?: boolean;
};
type OnboardingRecord = { status: OnboardingStatus; version: string };

const readOnboardingRecord = (): OnboardingRecord => {
  try {
    const value = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!value) return { status: "new", version: ONBOARDING_VERSION };
    const parsed = JSON.parse(value) as Partial<OnboardingRecord>;
    if ((parsed.status === "skipped" || parsed.status === "completed") && parsed.version === ONBOARDING_VERSION) {
      return { status: parsed.status, version: parsed.version };
    }
  } catch {
    // Lokaler Komfortstatus ist optional.
  }
  return { status: "new", version: ONBOARDING_VERSION };
};

const writeOnboardingRecord = (status: OnboardingStatus) => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ status, version: ONBOARDING_VERSION }));
  } catch {
    // Ignorieren, falls localStorage nicht verfügbar ist.
  }
};

const markOnboardingLaterForSession = () => {
  try {
    sessionStorage.setItem(ONBOARDING_SESSION_LATER_KEY, ONBOARDING_VERSION);
  } catch {
    // Ignorieren, falls sessionStorage nicht verfügbar ist.
  }
};

const wasOnboardingDeferredThisSession = () => {
  try {
    return sessionStorage.getItem(ONBOARDING_SESSION_LATER_KEY) === ONBOARDING_VERSION;
  } catch {
    return false;
  }
};
const CONTENT_BUBBLE_COLORS = ["#f7c6c7", "#f8d9a6", "#dcebb7", "#bfe3df", "#c8d9f0", "#d9ccf0", "#f1c7df", "#d8d3c3"];
const competenceModelItems = [
  {
    key: "competence",
    title: "Kompetenz",
    subtitle: "Zentrum",
    description: "Kompetenz meint die Fähigkeit und Bereitschaft, Anforderungen sachgerecht, reflektiert und verantwortlich zu bewältigen.",
    meaning: "Unterricht zielt damit nicht nur auf Wissen, sondern auf verfügbares Handeln in konkreten Situationen.",
    example: "Lernende erklären eine fachliche Entscheidung, führen sie sachgerecht aus und können ihr Vorgehen verantworten.",
    questions: ["Welche Anforderung sollen die Lernenden bewältigen?", "Wird mehr sichtbar als reines Wiedergeben?"],
    group: "center",
  },
  {
    key: "fach",
    title: "Fachkompetenz",
    subtitle: "Umgang mit Sachen",
    description: "Fachkompetenz richtet sich auf fachliche Gegenstände, Aufgaben, Verfahren und berufliche Probleme.",
    meaning: "Sie hilft, Inhalte nicht als Stoffliste, sondern als Grundlage für fachlich begründetes Handeln zu planen.",
    example: "Lernende wählen ein geeignetes Verfahren aus und begründen die Auswahl fachlich.",
    questions: ["Welche fachliche Sache muss verstanden werden?", "Welche fachliche Entscheidung sollen Lernende begründen können?"],
    group: "area",
  },
  {
    key: "sozial",
    title: "Sozialkompetenz",
    subtitle: "Umgang mit anderen",
    description: "Sozialkompetenz betrifft Kommunikation, Zusammenarbeit, Abstimmung und gemeinsame Verantwortung.",
    meaning: "Sie wird wichtig, wenn berufliche Aufgaben kooperativ, adressatenbezogen oder kommunikativ gelöst werden müssen.",
    example: "Lernende stimmen Arbeitsschritte im Team ab und gehen sachlich mit unterschiedlichen Vorschlägen um.",
    questions: ["Wo braucht die Situation Abstimmung oder Kommunikation?", "Wie wird Zusammenarbeit beobachtbar?"],
    group: "area",
  },
  {
    key: "selbst",
    title: "Selbstkompetenz",
    subtitle: "Umgang mit sich selbst",
    description: "Selbstkompetenz beschreibt Selbstständigkeit, Zuverlässigkeit, Reflexion und persönliche Verantwortung.",
    meaning: "Sie zeigt sich darin, dass Lernende ihr Vorgehen steuern, prüfen und aus Rückmeldungen lernen.",
    example: "Lernende kontrollieren ihr Ergebnis eigenständig und leiten Verbesserungen ab.",
    questions: ["Wo übernehmen Lernende Verantwortung für ihr Vorgehen?", "Welche Reflexion ist für die Handlung nötig?"],
    group: "area",
  },
  {
    key: "wissen",
    title: "Wissen",
    subtitle: "Verstehen",
    description: "Wissen umfasst Begriffe, Regeln, Prinzipien und Zusammenhänge, die professionelles Handeln begründbar machen.",
    meaning: "Es soll nicht isoliert abgefragt werden, sondern für berufliche Aufgaben nutzbar sein.",
    example: "Lernende erklären, warum Sicherheitsvorschriften in der konkreten Arbeitssituation erforderlich sind.",
    questions: ["Welches Wissen benötigen die Lernenden für die Anforderung?", "Wird dieses Wissen später zum Begründen genutzt?"],
    group: "dimension",
  },
  {
    key: "koennen",
    title: "Können",
    subtitle: "Handeln",
    description: "Können beschreibt die Fähigkeit, Wissen anzuwenden, Verfahren auszuführen und Probleme zunehmend selbstständig zu bearbeiten.",
    meaning: "Unterricht sollte Gelegenheiten schaffen, in denen Lernende fachgerecht handeln und ihr Handeln auswerten.",
    example: "Lernende wählen ein Prüfverfahren aus, führen es sachgerecht durch und werten das Ergebnis aus.",
    questions: ["Welche Handlung sollen die Lernenden ausführen können?", "Woran wird zunehmende Selbstständigkeit sichtbar?"],
    group: "dimension",
  },
  {
    key: "wollen",
    title: "Wollen",
    subtitle: "Verantworten",
    description: "Wollen umfasst Bereitschaft, Haltung, Motivation und Werte, damit Wissen und Können verantwortlich eingesetzt werden.",
    meaning: "Es macht sichtbar, dass berufliches Handeln auch Sorgfalt, Verantwortung und Urteilskraft benötigt.",
    example: "Lernende berücksichtigen Sicherheitsanforderungen nicht nur auf Anweisung, sondern übernehmen selbst Verantwortung.",
    questions: ["Welche Haltung ist für die Handlung notwendig?", "Wo übernehmen Lernende Verantwortung?"],
    group: "dimension",
  },
  {
    key: "situation",
    title: "Anforderungssituation",
    subtitle: "Anwendung",
    description: "Kompetenz zeigt sich bei der Bewältigung konkreter beruflicher, gesellschaftlicher oder privater Anforderungen.",
    meaning: "Die Situation gibt dem Lernen Sinn und macht sichtbar, welches Wissen, Können und Wollen gebraucht wird.",
    example: "Ein Kundenauftrag, eine Störung oder ein Qualitätsproblem wird zum Anlass für fachliches Lernen.",
    questions: ["Ist die Ausgangslage beruflich bedeutsam?", "Eröffnet sie echte Denk- und Handlungsspielräume?"],
    group: "frame",
  },
  {
    key: "muendigkeit",
    title: "Mündigkeit",
    subtitle: "Bildungsziel",
    description: "Mündigkeit meint selbstständiges, urteilsfähiges, verantwortliches und mitgestaltendes Handeln.",
    meaning: "Sie bildet den langfristigen Bildungsanspruch kompetenzorientierten Unterrichts.",
    example: "Lernende treffen fachlich begründete Entscheidungen und können deren Folgen reflektieren.",
    questions: ["Wie unterstützt die Stunde eigenverantwortliches Handeln?", "Wo wird Urteilsfähigkeit angebahnt?"],
    group: "goal",
  },
] as const;
const hkmModelAreas: { key: CompetencyArea; title: string; subtitle: string; description: string }[] = [
  { key: "fach", title: "Fachkompetenz", subtitle: "Umgang mit der Sache", description: "Fachliche Anforderungen verstehen, begründen und sachgerecht in beruflichen Anforderungssituationen bearbeiten." },
  { key: "sozial", title: "Sozialkompetenz", subtitle: "Umgang mit anderen", description: "Kommunizieren, kooperieren, Perspektiven berücksichtigen und gemeinsame Verantwortung für Handlungsergebnisse übernehmen." },
  { key: "selbst", title: "Selbstkompetenz", subtitle: "Umgang mit sich selbst", description: "Eigenständig, reflektiert und verantwortlich mit Anforderungen, Fehlern, Unsicherheit und dem eigenen Lernprozess umgehen." },
];
const hkmModelDimensions: { key: CompetencyDimension; title: string; code: string; description: string }[] = [
  { key: "wissen", title: "Wissen", code: "A", description: "Begriffe, Regeln und Zusammenhänge verfügbar machen, damit Handeln verstanden und begründet werden kann." },
  { key: "koennen", title: "Können", code: "B", description: "Verfahren, Strategien und Handlungen fachgerecht ausführen, übertragen, prüfen und verbessern." },
  { key: "wollen", title: "Wollen", code: "C", description: "Bereitschaft, Verantwortung, Haltung und Wertbezug so entwickeln, dass Handeln getragen und verantwortet wird." },
];
const hkmModelLevels: { value: number; title: string; description: string }[] = [
  { value: 1, title: "Stufe 1", description: "Grundlagen aufnehmen, wiedergeben, wahrnehmen oder angeleitet nachmachen." },
  { value: 2, title: "Stufe 2", description: "Zusammenhänge erklären, einüben, reagieren und Vorgehen zunehmend sichern." },
  { value: 3, title: "Stufe 3", description: "Bekanntes auf neue berufliche Situationen übertragen, begründen und verfeinern." },
  { value: 4, title: "Stufe 4", description: "Komplexe Situationen selbstständig, verantwortungsbewusst und problemlösend bewältigen." },
];
const learnerGroupFactors = [
  { key: "large-heterogeneity", label: "Große Leistungsheterogenität" },
  { key: "different-companies", label: "Unterschiedliche Ausbildungsbetriebe" },
  { key: "different-prior-education", label: "Unterschiedliche Vorbildung" },
  { key: "high-motivation", label: "Hohe Motivation" },
  { key: "low-motivation", label: "Geringe Motivation" },
  { key: "high-absence", label: "Hohe Fehlzeiten" },
  { key: "strong-practice-link", label: "Hoher Praxisbezug" },
  { key: "high-independence", label: "Hohe Selbstständigkeit" },
  { key: "support-needed", label: "Unterstützungsbedarf" },
  { key: "other", label: "Sonstiges" },
];
const specialPrerequisiteFactors = [
  { key: "german-second-language", label: "Deutsch als Zweitsprache" },
  { key: "dyslexia", label: "Lese-Rechtschreib-Schwäche" },
  { key: "concentration", label: "Konzentrationsschwierigkeiten" },
  { key: "exam-anxiety", label: "Prüfungsangst" },
  { key: "social-anxiety", label: "Sozialphobie" },
  { key: "adhd", label: "ADHS" },
  { key: "visual-impairment", label: "Sehbeeinträchtigung" },
  { key: "hearing-impairment", label: "Hörbeeinträchtigung" },
  { key: "physical-limitation", label: "Körperliche Einschränkung" },
  { key: "other", label: "Sonstiges" },
];
const consequenceSuggestions: Record<string, string[]> = {
  "large-heterogeneity": ["Differenzierte Aufgaben anbieten", "Wahlaufgaben bereitstellen", "Hilfekarten einsetzen", "Expertenarbeit ermöglichen"],
  "different-companies": ["Betriebliche Erfahrungen gezielt austauschen lassen", "Beispiele aus unterschiedlichen Betrieben sammeln", "Gemeinsame fachliche Standards klären"],
  "different-prior-education": ["Vorwissen diagnostisch aktivieren", "Basisbegriffe sichern", "Zusatzmaterial für Vertiefung anbieten"],
  "high-motivation": ["Offene Problemstellungen nutzen", "Eigenständige Erarbeitung ermöglichen", "Transferaufgaben anbieten"],
  "low-motivation": ["Beruflichen Nutzen transparent machen", "Kurze Erfolgserlebnisse einplanen", "Aktivierende Einstiege einsetzen"],
  "high-absence": ["Zwischensicherungen sichtbar dokumentieren", "Materialien klar strukturiert bereitstellen", "Wiederanknüpfung zu Stundenbeginn einplanen"],
  "strong-practice-link": ["Praxisbeispiele der Lernenden einbinden", "Arbeitsprozessbezug herstellen", "Handlungsprodukte nutzen"],
  "high-independence": ["Selbststeuerungsphasen einplanen", "Erweiterte Wahlmöglichkeiten anbieten", "Peer-Feedback nutzen"],
  "support-needed": ["Arbeitsaufträge kleinschrittig formulieren", "Hilfekarten und Muster bereitstellen", "Zwischenfeedback einplanen"],
  "german-second-language": ["Sprachliche Hilfen bereitstellen", "Fachbegriffe visualisieren", "Einfache Operatoren verwenden", "Wortschatz sichern", "Partnerarbeit gezielt einsetzen"],
  dyslexia: ["Arbeitsblätter übersichtlich gestalten", "Lesezeit einplanen", "Zentrale Begriffe visuell hervorheben", "Mündliche Klärungen ermöglichen"],
  concentration: ["Arbeitsphasen klar takten", "Aufgaben in überschaubare Schritte teilen", "Zwischenergebnisse sichtbar machen", "Ablenkungen reduzieren"],
  "exam-anxiety": ["Bewertungskriterien transparent machen", "Übungsphasen ohne Bewertungsdruck einplanen", "Sicherheit durch Beispiele geben"],
  "social-anxiety": ["Schonende Beteiligungsformen ermöglichen", "Kleingruppen bewusst zusammensetzen", "Alternative Präsentationsformen anbieten"],
  adhd: ["Bewegungsphasen einplanen", "Kurze Arbeitsaufträge formulieren", "Arbeitsschritte visualisieren", "Strukturierte Arbeitsphasen schaffen", "Ablenkungsarme Arbeitsumgebung berücksichtigen"],
  "visual-impairment": ["Kontraste und Schriftgrößen prüfen", "Material digital zugänglich machen", "Verbale Beschreibungen ergänzen"],
  "hearing-impairment": ["Sichtkontakt beim Sprechen sicherstellen", "Arbeitsaufträge schriftlich bereitstellen", "Störgeräusche reduzieren"],
  "physical-limitation": ["Arbeitsplatz und Wege prüfen", "Materialzugang sicherstellen", "Alternative Handlungsformen ermöglichen"],
};

const observableGoalVerbs = [
  "beschreiben", "erklären", "begründen", "anwenden", "auswählen", "planen", "durchführen",
  "prüfen", "bewerten", "reflektieren", "entscheiden", "entwickeln", "dokumentieren", "präsentieren",
  "vergleichen", "einordnen", "analysieren", "konstruieren", "optimieren",
];

const dimensionFormulationHints: Record<CompetencyDimension, { focus: string; starters: string[] }> = {
  wissen: {
    focus: "Wissen zielt auf fachliches Verstehen, Einordnen und Begründen.",
    starters: ["Fachbegriffe sachgerecht verwenden", "Zusammenhänge erklären", "Regeln auf die Situation beziehen"],
  },
  koennen: {
    focus: "Können macht sichtbar, wie eine Fachkraft fachgerecht handelt oder ein Verfahren anwendet.",
    starters: ["Arbeitsschritte planen und ausführen", "Entscheidungen begründen", "Ergebnisse prüfen und verbessern"],
  },
  wollen: {
    focus: "Wollen fokussiert verantwortliches, wertorientiertes und qualitätsbewusstes Handeln.",
    starters: ["Verantwortung übernehmen", "Qualitätsmaßstäbe beachten", "Folgen des eigenen Handelns reflektieren"],
  },
};

const areaFormulationHints: Record<CompetencyArea, string> = {
  fach: "Fachkompetenz: Umgang mit der Sache – fachlich richtig, begründet und beruflich anschlussfähig.",
  selbst: "Selbstkompetenz: Umgang mit sich selbst – eigenständig, reflektiert und lernbereit handeln.",
  sozial: "Sozialkompetenz: Umgang mit anderen – kooperieren, kommunizieren und gemeinsam Verantwortung tragen.",
};

const levelFocusHints: Record<number, string> = {
  1: "Stufe 1: wiedergeben, wahrnehmen oder nachmachen – Grundlagen der beruflichen Tätigkeit sichtbar machen.",
  2: "Stufe 2: erklären, einüben oder reagieren – Strukturen verstehen und angeleitet beruflich handeln.",
  3: "Stufe 3: anwenden, verfeinern oder Position beziehen – Transfer und begründete berufliche Entscheidungen ermöglichen.",
  4: "Stufe 4: Problemlösung, souveränes Handeln und verantwortliche Bewertung – komplex und selbstständig agieren.",
};

const competencyAreaTones: Record<CompetencyArea, { label: string; soft: string; mid: string; strong: string; ink: string; ring: string }> = {
  fach: {
    label: "Fachkompetenz",
    soft: "#eaf4ff",
    mid: "#cfe6fb",
    strong: "#2f6fa9",
    ink: "#123f69",
    ring: "#9bc7ee",
  },
  selbst: {
    label: "Selbstkompetenz",
    soft: "#f3eefc",
    mid: "#e3d7f6",
    strong: "#7662ad",
    ink: "#4b3b78",
    ring: "#c9b8ea",
  },
  sozial: {
    label: "Sozialkompetenz",
    soft: "#eaf7f0",
    mid: "#cfeedd",
    strong: "#3b8a62",
    ink: "#255d44",
    ring: "#a8d9bd",
  },
};

const competencyLevelOpacity = (level?: number) => {
  if (!level) return 0.12;
  return [0.16, 0.28, 0.42, 0.58][Math.min(Math.max(level, 1), 4) - 1];
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

const planningFieldHelps = {
  globalGoal: {
    title: "Hilfe zum Globalziel",
    phase: "Grobplanung",
    purpose: "Das Globalziel beschreibt, welche berufliche Handlungskompetenz die Schülerinnen und Schüler am Ende der Unterrichtseinheit entwickelt haben sollen.",
    importance: "Dabei werden Wissen, Können und Wollen in einer beruflichen Handlungssituation zusammengeführt und auf einen gemeinsamen Zielhorizont bezogen.",
    questions: ["In welcher Situation handeln die Lernenden?", "Welcher Inhalt oder Gegenstand steht im Mittelpunkt?", "Woran kann man das Lernen beobachten?"],
    pitfalls: ["nur ein Thema statt eines beobachtbaren Handelns nennen", "zu viele Ziele in einen Satz packen", "Methoden mit Zielen verwechseln"],
    tips: ["Situation, Inhalt und Verhalten knapp verbinden.", "Ein starkes Verb macht das Ziel prüf- und beobachtbar.", "Wissen, Können und Wollen können gemeinsam vorkommen."],
  },
  contextAnalysis: {
    title: "Hilfe zur Kontextanalyse",
    phase: "Analyse",
    purpose: "Hier werden nur solche Rahmenbedingungen geklärt, die die Unterrichtsplanung tatsächlich beeinflussen.",
    importance: "Die Analyse verhindert, dass Thema, Ressourcen oder Vorgaben später lose neben dem Unterrichtsverlauf stehen.",
    questions: ["Welche Vorgaben sind verbindlich?", "Welche Ressourcen oder Grenzen prägen die Stunde?", "Warum ist die berufliche Anforderung für diesen Bildungsgang bedeutsam?"],
    pitfalls: ["alles sammeln, aber nichts für die Planung nutzen", "Berufliche Anforderung und konkrete Lernsituation vermischen"],
    tips: ["Formuliere knapp und entscheidungsrelevant.", "Notiere nur, was später bei Ziel, Inhalt, Methode oder Zeit eine Rolle spielt."],
  },
  directResources: {
    title: "Hilfe zu Vorgaben und Ressourcen",
    phase: "Analyse",
    purpose: "Lehrplan, Jahresplanung und thematische Einordnung geben den verbindlichen und organisatorischen Rahmen.",
    importance: "So bleibt die Stunde anschlussfähig an Lernfeld, Sequenz und Bildungsgang.",
    questions: ["Welche Kompetenzerwartung wird aufgegriffen?", "Was wurde vorbereitet und was folgt danach?", "Welche Ressourcen oder Materialien stehen sicher zur Verfügung?"],
    pitfalls: ["Lehrplanbezug nur zitieren", "Sequenzbezug nicht für Auswahlentscheidungen nutzen"],
    tips: ["Übersetze Vorgaben in konkrete Planungsentscheidungen.", "Halte Bezüge kurz, aber nachvollziehbar."],
  },
  competencyAnalysis: {
    title: "Hilfe zur kompetenzorientierten Sachanalyse",
    phase: "Analyse",
    purpose: "Ausgehend von der beruflichen Anforderung wird analysiert, welche Handlungskompetenz eine Fachkraft zur erfolgreichen Bewältigung der Tätigkeit benötigt.",
    importance: "So bleibt die Analyse zunächst bei der beruflichen Tätigkeit: Erst danach wird entschieden, was für den Unterricht reduziert, ausgewählt oder aufgebaut wird.",
    questions: ["Was muss eine Fachkraft in dieser beruflichen Situation verstehen, ausführen und verantworten?", "Welche fachlichen, sozialen oder selbstbezogenen Anforderungen stecken in der Tätigkeit?", "Welche Kompetenzstufe beschreibt den beruflichen Anspruch?"],
    pitfalls: ["zu viele Kompetenzfelder markieren", "Inhalte ohne beruflichen Bezug sammeln", "Zielniveau und Methode verwechseln"],
    tips: ["Arbeite mit wenigen zentralen Feldern.", "Prüfe immer den Rückbezug zur beruflichen Anforderung."],
  },
  competencyNeed: {
    title: "Hilfe zum Kompetenzbedarf",
    phase: "Analyse",
    purpose: "Hier wird noch nicht die Unterrichtsstunde geplant, sondern der Kompetenzbedarf der beruflichen Tätigkeit erschlossen.",
    importance: "Die berufliche Anforderung ist der Ausgangspunkt: Welche Kompetenzen braucht eine Fachkraft, bevor daraus später ein passendes Unterrichtsziel und eine didaktische Reduktion abgeleitet werden?",
    questions: ["Welche berufliche Tätigkeit oder Problemstellung muss bewältigt werden?", "Welches Wissen, Können und Wollen braucht eine Fachkraft dafür?", "Welche Kompetenzbereiche und Stufen passen zum Anspruch der Tätigkeit?"],
    pitfalls: ["alle Felder markieren", "Kompetenzstufen ohne Bezug zur Aufgabe wählen", "Zielformulierung und Methode vermischen"],
    tips: ["Wähle wenige tragende Kompetenzfelder.", "Formuliere anschließend konkret, was Lernende auf der Stufe zeigen sollen."],
  },
  learningContent: {
    title: "Hilfe zu Lerninhalten",
    phase: "Analyse",
    purpose: "Die Inhaltsanalyse hilft, fachliche Inhalte auszuwählen, zu ordnen und auf den beruflichen Handlungsanlass zu beziehen.",
    importance: "Sie macht deutlich, welche Inhalte wesentlich sind und welche nur Beiwerk wären.",
    questions: ["Was ist fachlich unverzichtbar?", "Was kann reduziert oder später vertieft werden?", "Welche Inhalte tragen direkt zum Ziel bei?"],
    pitfalls: ["Stoffsammlung ohne Auswahl", "Inhalte ohne Bezug zur Handlungssituation", "zu viele Begriffe für eine Stunde"],
    tips: ["Ordne Inhalte räumlich oder bündle sie nach Funktion.", "Markiere Kerninhalte anders als Vertiefungen."],
  },
  addressAnalysis: {
    title: "Hilfe zur Adressatenanalyse",
    phase: "Analyse",
    purpose: "Hier werden Lernvoraussetzungen, Erfahrungen, Unterstützungsbedarfe und aktuelle Beobachtungen der Lerngruppe berücksichtigt.",
    importance: "Aus der Analyse sollen konkrete Konsequenzen für Aufgaben, Sprache, Unterstützung und Sozialformen entstehen.",
    questions: ["Welches Vorwissen ist belastbar?", "Welche Heterogenität beeinflusst die Stunde?", "Welche Unterstützung braucht die Lerngruppe konkret?"],
    pitfalls: ["Defizite beschreiben, ohne Konsequenzen abzuleiten", "Einzelfälle zur gesamten Lerngruppe machen"],
    tips: ["Halte Beobachtungen planungsrelevant.", "Formuliere am Ende konkrete didaktische Konsequenzen."],
  },
  prerequisites: {
    title: "Hilfe zu Lernvoraussetzungen",
    phase: "Analyse",
    purpose: "Die Adressatenanalyse übersetzt Beobachtungen zur Lerngruppe in konkrete didaktische Konsequenzen.",
    importance: "Sie hilft, Lernaufgaben und Unterstützung weder zu eng noch zu offen anzulegen.",
    questions: ["Was können die Lernenden bereits?", "Was könnte den Lernprozess erschweren?", "Welche Konsequenzen ergeben sich für Aufgaben, Sprache, Sozialform oder Unterstützung?"],
    pitfalls: ["Defizite sammeln, ohne Konsequenzen abzuleiten", "Einzelfälle verallgemeinern", "Vorwissen überschätzen"],
    tips: ["Formuliere am Ende konkrete Konsequenzen für die Planung.", "Wähle nur Aspekte, die die Stunde tatsächlich beeinflussen."],
  },
  synthesis: {
    title: "Hilfe zur pädagogisch-didaktischen Synthese",
    phase: "Grobplanung",
    purpose: "Hier werden Analyseergebnisse zu einem konkreten Stundenziel, einer passenden Lernsituation und einem tragfähigen Grobkonzept verbunden.",
    importance: "Die Synthese übersetzt beruflichen Kompetenzbedarf in eine geplante Lernbewegung für diese Unterrichtsstunde.",
    questions: ["Welches Kompetenzziel verfolgt diese Stunde konkret?", "Wie operationalisiert die Lernsituation dieses Ziel?", "Wie passen Ziel, Inhalt, Methode und Ergebnissicherung zusammen?"],
    pitfalls: ["nur eine Aufgabe formulieren, aber keine Lernsituation", "Analyseergebnisse im Verlauf nicht wieder aufnehmen"],
    tips: ["Beginne mit der konkreten Situation.", "Prüfe anschließend, ob der rote Faden erkennbar bleibt."],
  },
  concreteLearningSituation: {
    title: "Hilfe zur konkreten Lernsituation",
    phase: "Synthese",
    purpose: "Die konkrete Lernsituation beschreibt, wie die berufliche Anforderung für diese Lerngruppe und diesen Unterricht erlebbar wird.",
    importance: "Sie ist der didaktische Einstiegspunkt für Lernhandlung, Aufgaben und Reflexion.",
    questions: ["Welche Situation begegnet den Lernenden konkret?", "Welcher Handlungsbedarf wird sichtbar?", "Welche Entscheidung oder Bearbeitung wird eröffnet?"],
    pitfalls: ["nur das Thema wiederholen", "eine fertige Schrittfolge statt eines Handlungsspielraums vorgeben"],
    tips: ["Formuliere aus Sicht der Lernenden.", "Halte beruflichen Anlass, Lerngruppe und Lernprozess zusammen."],
  },
  flow: {
    title: "Hilfe zum Unterrichtsverlaufplan",
    phase: "Feinplanung",
    purpose: "Der Verlauf verbindet Ziel, Inhalt, Lehr- und Lernhandlungen, Methoden, Medien und Zeit zu einem stimmigen Lernweg.",
    importance: "Er macht sichtbar, wie aus der Lernsituation eine nachvollziehbare Lernbewegung wird.",
    questions: ["Passt jede Phase zum Ziel?", "Ist sichtbar, was Lehrkraft und Lernende tun?", "Sind Übergänge und Sicherungen klar?"],
    pitfalls: ["Methoden ohne Zielbezug", "zu knappe Zeitansätze", "fehlende Sicherung oder Reflexion"],
    tips: ["Plane von den erwarteten Lernergebnissen her.", "Prüfe, ob Zeit, Methode und Medien das Ziel unterstützen."],
  },
  learningTasks: {
    title: "Hilfe zu Lernaufgaben",
    phase: "Feinplanung",
    purpose: "Lernaufgaben sollen Handeln, Verstehen, Begründen, Reflektieren und Transfer ermöglichen.",
    importance: "So bleibt die Aufgabe mehr als Beschäftigung und wird zum Motor der Kompetenzentwicklung.",
    questions: ["Welche Entscheidung müssen Lernende treffen?", "Wo begründen oder prüfen sie ihr Vorgehen?", "Wie wird Transfer vorbereitet?"],
    pitfalls: ["nur Arbeitsschritte abarbeiten lassen", "Reflexion erst ganz am Ende vergessen"],
    tips: ["Formuliere Aufgaben mit erkennbarem Denk- und Handlungsspielraum.", "Plane Sicherung und Transfer direkt mit."],
  },
  methodsMedia: {
    title: "Hilfe zu Methoden, Sozialformen, Medien und Materialien",
    phase: "Feinplanung",
    purpose: "Methoden, Sozialformen und Medien werden danach ausgewählt, welche Funktion sie für Ziel, Inhalt und Lernhandlung erfüllen.",
    importance: "Gute Materialien entlasten, öffnen oder strukturieren Lernprozesse gezielt.",
    questions: ["Welche Methode unterstützt die angestrebte Lernhandlung?", "Welche Sozialform passt zur Aufgabe?", "Welches Medium hilft beim Verstehen, Handeln oder Sichern?"],
    pitfalls: ["Methode als Selbstzweck", "Medien einsetzen, ohne Lernfunktion zu klären"],
    tips: ["Notiere bei Materialien kurz ihre Funktion.", "Prüfe, ob die Sozialform wirklich zur Lerngruppe passt."],
  },
  resultsTransfer: {
    title: "Hilfe zu Ergebnissicherung und Transfer",
    phase: "Feinplanung",
    purpose: "Ergebnisse sollen sichtbar, fachlich geordnet und auf neue Situationen übertragbar werden.",
    importance: "Erst Sicherung, Reflexion und Transfer machen Lernergebnisse dauerhaft verfügbar.",
    questions: ["Was wird am Ende sichtbar gesichert?", "Wie begründen Lernende ihre Ergebnisse?", "Wo wird eine Übertragung auf neue Fälle vorbereitet?"],
    pitfalls: ["Sicherung nur als Tafelbild verstehen", "Transfer zeitlich nicht einplanen"],
    tips: ["Plane eine kurze fachliche Systematisierung.", "Lass Lernende prüfen, was in ähnlichen Situationen gilt."],
  },
} as const;
const learningSituationReflectionItems = [
  {
    id: "professional-situation",
    title: "Beruflicher Anlass",
    prompt: "Wird deutlich, welche beruflich bedeutsame Ausgangslage die Lernenden bearbeiten?",
    hint: "Die Situation sollte mehr sein als ein Thema: Sie braucht einen nachvollziehbaren Anlass aus Arbeit, Technik, Kunde, Qualität, Sicherheit oder Prozess.",
  },
  {
    id: "decision-space",
    title: "Handlungs- und Entscheidungsspielraum",
    prompt: "Müssen Lernende deuten, auswählen, abwägen oder begründen - oder folgen sie nur fertigen Schritten?",
    hint: "Kompetenz zeigt sich besonders dort, wo nicht alles vorentschieden ist und Lernende fachlich begründet handeln müssen.",
  },
  {
    id: "competency-demand",
    title: "Kompetenzanforderung",
    prompt: "Ist erkennbar, welches Wissen, Können und Wollen fachlich, sozial oder personal aufgebaut wird?",
    hint: "Eine gute Lernsituation verbindet fachliche Anforderungen mit überfachlichen Anteilen wie Verantwortung, Kooperation oder Selbststeuerung.",
  },
  {
    id: "learning-action",
    title: "Lernhandlung statt bloßer Ausführung",
    prompt: "Wird das berufliche Handeln mit Verstehen, Begründen, Reflektieren und Systematisieren verbunden?",
    hint: "Die Lernenden sollen nicht nur etwas erledigen, sondern nachvollziehen, warum und wie ihr Handeln fachlich sinnvoll ist.",
  },
  {
    id: "sustainable-competence",
    title: "Nachhaltige Kompetenzentwicklung",
    prompt: "Zielt die Lernsituation über die einzelne Aufgabe hinaus auf begründetes und verantwortliches Handeln?",
    hint: "Die Reflexion fragt nicht nach einer Note, sondern danach, ob die Lernsituation langfristige Handlungsfähigkeit anbahnt.",
  },
] as const;
const USM_ITEMS = [
  { id: 1, title: "Mündigkeit", short: "Mündigkeit", description: "Langfristiges Ziel beruflicher Bildung: Lernende sollen eigenverantwortlich, fachlich begründet und verantwortungsbewusst handeln können.", question: "Wie unterstützt die Stunde selbstständiges und verantwortliches Handeln?", x: 50, y: 7, tone: "maturity", layer: "Übergeordnete Zielebene" },
  { id: 2, title: "Bildungserfolg", short: "Bildungserfolg", description: "Einzelne Unterrichtseinheiten tragen langfristig zur Kompetenzentwicklung bei. Bildungserfolg meint mehr als kurzfristige Leistung.", question: "Welchen Beitrag leistet die Stunde zum langfristigen Kompetenzaufbau?", x: 50, y: 20, tone: "success", layer: "Ergebnisebene" },
  { id: 3, title: "Lernergebnisse", short: "Lernergebnisse", description: "Lernergebnisse machen sichtbar, welche Kompetenzen am Ende beobachtbar geworden sind.", question: "Woran erkennst du, dass Lernen tatsächlich stattgefunden hat?", x: 50, y: 34, tone: "planning", layer: "Planungsebene" },
  { id: 4, title: "Ziele", short: "Ziele", description: "Ziele klären, welche Kompetenzen aufgebaut werden sollen. Sie steuern Inhalte, Methoden, Medien und Ergebnissicherung.", question: "Welche Kompetenz soll am Ende in der beruflichen Situation sichtbar werden?", x: 71, y: 43, tone: "planning", layer: "Planungsebene" },
  { id: 5, title: "Inhalte", short: "Inhalte", description: "Inhalte werden danach ausgewählt, ob sie zur Kompetenzentwicklung in der beruflichen Anforderung beitragen.", question: "Was ist wesentlich, was kann reduziert oder später vertieft werden?", x: 73, y: 53, tone: "planning", layer: "Planungsebene" },
  { id: 6, title: "Methoden", short: "Methoden", description: "Methoden unterstützen aktive Kompetenzentwicklung, wenn sie zum Ziel, zur Lerngruppe und zur beruflichen Handlung passen.", question: "Welche Lernhandlung ermöglicht Verstehen, Begründen, Üben oder Transfer?", x: 62, y: 62, tone: "planning", layer: "Planungsebene" },
  { id: 7, title: "Medien", short: "Medien", description: "Analoge und digitale Medien sollen Verstehen, Handeln, Zusammenarbeit oder selbstständiges Lernen sinnvoll unterstützen.", question: "Welches Medium hilft wirklich beim Lernen - und nicht nur bei der Darstellung?", x: 38, y: 62, tone: "planning", layer: "Planungsebene" },
  { id: 8, title: "Raum", short: "Raum", description: "Die Lernumgebung beeinflusst Kommunikation, Zusammenarbeit und Handlungsmöglichkeiten. Raum kann Lernen aktiv fördern.", question: "Wie muss der Lernort gestaltet sein, damit Handlung und Austausch gelingen?", x: 27, y: 53, tone: "planning", layer: "Planungsebene" },
  { id: 9, title: "Zeit", short: "Zeit", description: "Verfügbare Unterrichtszeit beeinflusst Zielauswahl, Methodik, Lernaufgaben, Übungsanteile und Reflexion.", question: "Reicht die Zeit für Erarbeiten, Handeln, Sichern und Reflektieren?", x: 29, y: 43, tone: "planning", layer: "Planungsebene" },
  { id: 10, title: "Lehr-Lern-Arrangement", short: "Lehr-Lern-Arrangement", description: "Im Zentrum greifen Ziele, Inhalte, Methoden, Medien, Raum und Zeit zu einer stimmigen Lernumgebung zusammen.", question: "Passen alle Entscheidungen so zusammen, dass Kompetenzentwicklung wahrscheinlicher wird?", x: 50, y: 52, tone: "communication", layer: "Zentrum der Planungsebene" },
  { id: 11, title: "Lehrende", short: "Lehrende", description: "Die Lehrkraft gestaltet Lernbedingungen, gibt Impulse, unterstützt, diagnostiziert und begleitet Kompetenzentwicklung.", question: "Welche Rolle übernimmt die Lehrkraft: anleiten, begleiten, klären, herausfordern?", x: 24, y: 82, tone: "foundation", layer: "Pädagogisch-didaktisches Dreieck" },
  { id: 12, title: "Lernende", short: "Lernende", description: "Schülerinnen und Schüler übernehmen eine aktive Rolle: Sie deuten, handeln, begründen, reflektieren und lernen zunehmend eigenverantwortlich.", question: "Wo handeln die Lernenden selbstständig und wo brauchen sie Unterstützung?", x: 50, y: 73, tone: "foundation", layer: "Pädagogisch-didaktisches Dreieck" },
  { id: 13, title: "Gegenstand", short: "Gegenstand", description: "Der fachliche Lerngegenstand ist beruflich verankert und bildet den Ausgangspunkt für kompetenzorientierte Lernprozesse.", question: "Welche Sache muss verstanden werden, damit berufliches Handeln begründet gelingt?", x: 76, y: 82, tone: "foundation", layer: "Pädagogisch-didaktisches Dreieck" },
  { id: 14, title: "Kommunikation", short: "Kommunikation", description: "Kommunikation verbindet Lehrende, Lernende und Gegenstand. Interaktion, Feedback und Zusammenarbeit prägen die Lernkultur.", question: "Wie werden Austausch, Feedback und Verständigung lernwirksam organisiert?", x: 50, y: 79, tone: "communication", layer: "Bindeglied" },
] as const;

const addMinutes = (time: string, minutes: number) => {
  if (!/^\d{2}:\d{2}$/.test(time)) return "—";
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const sentenceEnd = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const buildGoalSuggestion = (assistant: Plan["goalAssistant"]) => {
  const situation = assistant.situation.trim();
  const content = assistant.content.trim();
  const behavior = assistant.behavior.trim();
  if (!situation && !content && !behavior) return "";
  const parts = [
    situation ? `in der beruflichen Situation „${situation}“` : "",
    content ? `unter Einbezug von ${content}` : "",
    behavior || "ein beobachtbares, kompetenzorientiertes Verhalten zeigen",
  ].filter(Boolean);
  return sentenceEnd(`Die Schülerinnen und Schüler können ${parts.join(" ")}`);
};

const hasObservableVerb = (text: string) => {
  const lower = text.toLowerCase();
  return observableGoalVerbs.some((verb) => lower.includes(verb));
};

const inferGoalLevel = (text: string): { level: number; title: string; hint: string } | null => {
  const lower = text.toLowerCase();
  const patterns: Array<{ level: number; title: string; hint: string; verbs: RegExp[] }> = [
    {
      level: 4,
      title: "Problemlösung und Bewertung",
      hint: "Das Ziel deutet auf eigenständiges Entwickeln, Bewerten, Optimieren oder verantwortliches Entscheiden hin.",
      verbs: [/bewert/, /evaluier/, /entwickel/, /optimier/, /validier/, /reflektier/, /entschei/, /begründet stellung/, /verantwort/],
    },
    {
      level: 3,
      title: "Anwendung und Transfer",
      hint: "Das Ziel deutet auf Anwenden, Übertragen, Prüfen, Analysieren oder begründetes Auswählen hin.",
      verbs: [/anwend/, /übertrag/, /analysier/, /prüf/, /ermittel/, /auswähl/, /ableit/, /konstruier/, /durchführ/],
    },
    {
      level: 2,
      title: "Erklären und Einordnen",
      hint: "Das Ziel deutet auf Erklären, Beschreiben, Vergleichen oder Einordnen von Zusammenhängen hin.",
      verbs: [/erklär/, /beschreib/, /vergleich/, /einordn/, /klassifizier/, /interpretier/, /dokumentier/],
    },
    {
      level: 1,
      title: "Wiedergeben und Erkennen",
      hint: "Das Ziel deutet auf Benennen, Wiedergeben, Erkennen oder Erinnern von Grundlagen hin.",
      verbs: [/benenn/, /wiedergeb/, /wiederhol/, /erkenn/, /aufzähl/, /feststell/, /zitier/],
    },
  ];
  return patterns.find((pattern) => pattern.verbs.some((verb) => verb.test(lower))) ?? null;
};

const preparePdfPreview = async (file: File) => {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";
  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1200 / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Die PDF-Vorschau konnte nicht erzeugt werden.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" }).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    await loadingTask.destroy();
  }
};

const prepareImagePreview = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Die Bilddatei konnte nicht gelesen werden."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("Die Bilddatei konnte nicht verarbeitet werden."));
    image.onload = () => {
      const maxEdge = 1200;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Die Bilddatei konnte nicht verarbeitet werden."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

const prepareSituationImage = async (file: File) => {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!isPdf && !isImage) throw new Error("Bitte verwende JPEG, PNG, WebP oder PDF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Die Datei darf höchstens 10 MB groß sein.");
  try {
    return isPdf ? await preparePdfPreview(file) : await prepareImagePreview(file);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Die ")) throw error;
    throw new Error(isPdf ? "Die PDF-Datei konnte nicht verarbeitet werden." : "Die Bilddatei konnte nicht verarbeitet werden.");
  }
};

const isBubbleSide = (value: unknown): value is BubbleSide =>
  value === "left" || value === "right" || value === "top" || value === "bottom";

const buildPrerequisiteConsequencesSummary = (prerequisites: Plan["learningPrerequisites"]) => {
  const factors = [...prerequisites.groupFactors, ...prerequisites.specialFactors];
  const blocks = factors.flatMap((factor) => {
    const label = [...learnerGroupFactors, ...specialPrerequisiteFactors].find((option) => option.key === factor)?.label;
    if (!label || factor === "other") return [];
    const selected = prerequisites.selectedConsequences[factor] ?? [];
    const custom = prerequisites.customConsequences[factor]?.trim();
    const items = [...selected, ...(custom ? [custom] : [])];
    return items.length ? [`${label}:\n${items.map((item) => `- ${item}`).join("\n")}`] : [];
  });
  const groupOther = prerequisites.groupFactors.includes("other") && prerequisites.groupOther.trim()
    ? `Sonstiges zur Lerngruppe:\n- ${prerequisites.groupOther.trim()}`
    : "";
  const specialOther = prerequisites.specialFactors.includes("other") && prerequisites.specialOther.trim()
    ? `Sonstige besondere Voraussetzungen:\n- ${prerequisites.specialOther.trim()}`
    : "";
  return [...blocks, groupOther, specialOther].filter(Boolean).join("\n\n");
};

const resizeTextareaToContent = (element: HTMLTextAreaElement) => {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
};

const parseCompetencyFieldId = (fieldId: string): { area: CompetencyArea; dimension: CompetencyDimension } | null => {
  const [area, dimension] = fieldId.split("-") as [CompetencyArea, CompetencyDimension];
  if (!areas.some((item) => item.key === area) || !dimensions.some((item) => item.key === dimension)) return null;
  return { area, dimension };
};

const competencyFieldLabel = (fieldId: CompetencyFieldId) => {
  const parsed = parseCompetencyFieldId(fieldId);
  if (!parsed) return fieldId;
  const area = areas.find((item) => item.key === parsed.area)?.label ?? parsed.area;
  const dimension = dimensions.find((item) => item.key === parsed.dimension)?.label ?? parsed.dimension;
  return `${area} - ${dimension}`;
};

const buildCompetencyNeedSummary = (analysis: CompetencyNeedAnalysis) => {
  const blocks = analysis.selectedFields.flatMap((fieldId) => {
    const entry = { ...defaultCompetencyNeedEntry(), ...(analysis.entries[fieldId] ?? {}) };
    const clarifications = [...entry.selectedClarifications, entry.customClarification.trim()].filter(Boolean);
    const consequences = [...entry.selectedConsequences, entry.customConsequence.trim()].filter(Boolean);
    const levels = (analysis.selectedLevels[fieldId] ?? []).filter((level) => level >= 1 && level <= 4);
    const level = levels[0];
    const lines = [
      `${competencyFieldLabel(fieldId)}${level ? ` - Stufe ${level}` : ""}`,
      entry.levelGoal.trim() ? entry.levelGoal.trim() : "",
      entry.levelDescription.trim() ? `Eigene Beschreibung der Stufe:\n${entry.levelDescription.trim()}` : "",
      entry.demand.trim() ? `Kompetenzbedarf: ${entry.demand.trim()}` : "",
      clarifications.length ? `Konkretisierung:\n${clarifications.map((item) => `- ${item}`).join("\n")}` : "",
      consequences.length ? `Hinweise für die spätere didaktische Reduktion:\n${consequences.map((item) => `- ${item}`).join("\n")}` : "",
    ].filter(Boolean);
    return lines.length > 1 ? [lines.join("\n")] : [];
  });
  return blocks.join("\n\n");
};

const normalizeCompetencyNeedAnalysis = (value: unknown): CompetencyNeedAnalysis => {
  const fallback = emptyCompetencyNeedAnalysis();
  if (!value || typeof value !== "object") return fallback;
  const partial = value as Partial<CompetencyNeedAnalysis>;
  const selectedFields = Array.isArray(partial.selectedFields)
    ? partial.selectedFields.filter((fieldId): fieldId is CompetencyFieldId => typeof fieldId === "string" && competencyFieldOrder.includes(fieldId as CompetencyFieldId))
    : fallback.selectedFields;
  const selectedLevels = partial.selectedLevels && typeof partial.selectedLevels === "object" && !Array.isArray(partial.selectedLevels)
    ? Object.fromEntries(Object.entries(partial.selectedLevels).flatMap(([fieldId, levels]) => {
      if (!competencyFieldOrder.includes(fieldId as CompetencyFieldId)) return [];
      const next = Array.isArray(levels)
        ? levels.map(Number).filter((level) => Number.isInteger(level) && level >= 1 && level <= 4)
        : [];
      return [[fieldId, Array.from(new Set(next)).slice(0, 1)]];
    })) as CompetencyNeedAnalysis["selectedLevels"]
    : fallback.selectedLevels;
  const entries = partial.entries && typeof partial.entries === "object" && !Array.isArray(partial.entries)
    ? Object.fromEntries(Object.entries(partial.entries).flatMap(([fieldId, rawEntry]) => {
      if (!competencyFieldOrder.includes(fieldId as CompetencyFieldId) || !rawEntry || typeof rawEntry !== "object") return [];
      const entry = rawEntry as Partial<CompetencyNeedEntry>;
      const normalizedEntry: CompetencyNeedEntry = {
        demand: typeof entry.demand === "string" ? entry.demand : "",
        levelGoal: typeof entry.levelGoal === "string" ? entry.levelGoal : typeof entry.demand === "string" ? entry.demand : "",
        levelDescription: typeof entry.levelDescription === "string" ? entry.levelDescription : "",
        selectedClarifications: Array.isArray(entry.selectedClarifications) ? entry.selectedClarifications.filter((item): item is string => typeof item === "string") : [],
        customClarification: typeof entry.customClarification === "string" ? entry.customClarification : "",
        selectedConsequences: Array.isArray(entry.selectedConsequences) ? entry.selectedConsequences.filter((item): item is string => typeof item === "string") : [],
        customConsequence: typeof entry.customConsequence === "string" ? entry.customConsequence : "",
      };
      return [[fieldId, normalizedEntry]];
    })) as CompetencyNeedAnalysis["entries"]
    : fallback.entries;
  return {
    selectedFields,
    selectedLevels,
    entries,
    summary: typeof partial.summary === "string" ? partial.summary : "",
  };
};

const normalizePlan = (candidate: unknown): Plan => {
  const fallback = initialPlan();
  if (!candidate || typeof candidate !== "object") return fallback;
  const partial = candidate as Partial<Plan>;
  if (!Array.isArray(partial.phases)) return fallback;
  const seenIds = new Set<string>();
  return {
    ...fallback,
    ...partial,
    targetAudience: (partial as { targetAudience?: string }).targetAudience === "ref-compact"
      ? "ref-advanced"
      : targetAudienceKeys.includes(partial.targetAudience as TargetAudience)
        ? partial.targetAudience as TargetAudience
        : fallback.targetAudience,
    concreteLearningSituation: typeof partial.concreteLearningSituation === "string" ? partial.concreteLearningSituation : fallback.concreteLearningSituation,
    learningPrerequisites: {
      ...fallback.learningPrerequisites,
      ...(partial.learningPrerequisites ?? {}),
      groupFactors: Array.isArray(partial.learningPrerequisites?.groupFactors) ? partial.learningPrerequisites.groupFactors.filter((value): value is string => typeof value === "string") : fallback.learningPrerequisites.groupFactors,
      specialFactors: Array.isArray(partial.learningPrerequisites?.specialFactors) ? partial.learningPrerequisites.specialFactors.filter((value): value is string => typeof value === "string") : fallback.learningPrerequisites.specialFactors,
      selectedConsequences: partial.learningPrerequisites?.selectedConsequences && typeof partial.learningPrerequisites.selectedConsequences === "object" && !Array.isArray(partial.learningPrerequisites.selectedConsequences)
        ? Object.fromEntries(Object.entries(partial.learningPrerequisites.selectedConsequences).map(([key, value]) => [key, Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []]))
        : fallback.learningPrerequisites.selectedConsequences,
      customConsequences: partial.learningPrerequisites?.customConsequences && typeof partial.learningPrerequisites.customConsequences === "object" && !Array.isArray(partial.learningPrerequisites.customConsequences)
        ? Object.fromEntries(Object.entries(partial.learningPrerequisites.customConsequences).map(([key, value]) => [key, typeof value === "string" ? value : ""]))
        : fallback.learningPrerequisites.customConsequences,
    },
    competencyNeedAnalysis: normalizeCompetencyNeedAnalysis(partial.competencyNeedAnalysis),
    contentMindmap: Array.isArray(partial.contentMindmap) ? partial.contentMindmap.map((node, index) => ({
      id: typeof node.id === "string" && node.id ? node.id : crypto.randomUUID(),
      text: typeof node.text === "string" ? node.text : "",
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : 40 + index * 18,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : 40 + index * 14,
    })).filter((node) => node.text.trim()) : fallback.contentMindmap,
    contentBubbles: Array.isArray(partial.contentBubbles) ? partial.contentBubbles.map((bubble, index) => ({
      id: typeof bubble.id === "string" && bubble.id ? bubble.id : crypto.randomUUID(),
      title: typeof bubble.title === "string" ? bubble.title : "",
      description: typeof bubble.description === "string" ? bubble.description : "",
      color: typeof bubble.color === "string" && bubble.color ? bubble.color : CONTENT_BUBBLE_COLORS[index % CONTENT_BUBBLE_COLORS.length],
      x: Number.isFinite(Number(bubble.x)) ? Number(bubble.x) : 40 + (index % 4) * 72,
      y: Number.isFinite(Number(bubble.y)) ? Number(bubble.y) : 40 + Math.floor(index / 4) * 72,
      size: Number.isFinite(Number(bubble.size)) ? Math.min(280, Math.max(118, Number(bubble.size))) : 156,
      width: Number.isFinite(Number(bubble.width)) ? Math.min(340, Math.max(120, Number(bubble.width))) : Number.isFinite(Number(bubble.size)) ? Math.min(340, Math.max(120, Number(bubble.size))) : 176,
      height: Number.isFinite(Number(bubble.height)) ? Math.min(300, Math.max(96, Number(bubble.height))) : Number.isFinite(Number(bubble.size)) ? Math.min(300, Math.max(96, Number(bubble.size) * 0.9)) : 138,
    })) : fallback.contentBubbles,
    contentConnections: Array.isArray(partial.contentConnections)
      ? partial.contentConnections.map((connection) => ({
        id: typeof connection.id === "string" && connection.id ? connection.id : crypto.randomUUID(),
        fromId: typeof connection.fromId === "string" ? connection.fromId : "",
        toId: typeof connection.toId === "string" ? connection.toId : "",
        fromSide: isBubbleSide(connection.fromSide) ? connection.fromSide : undefined,
        toSide: isBubbleSide(connection.toSide) ? connection.toSide : undefined,
      })).filter((connection) => connection.fromId && connection.toId && connection.fromId !== connection.toId)
      : fallback.contentConnections,
    goalAssistant: {
      ...fallback.goalAssistant,
      ...(partial.goalAssistant ?? {}),
      situation: typeof partial.goalAssistant?.situation === "string" ? partial.goalAssistant.situation : fallback.goalAssistant.situation,
      content: typeof partial.goalAssistant?.content === "string" ? partial.goalAssistant.content : fallback.goalAssistant.content,
      behavior: typeof partial.goalAssistant?.behavior === "string" ? partial.goalAssistant.behavior : fallback.goalAssistant.behavior,
      notes: typeof partial.goalAssistant?.notes === "string" ? partial.goalAssistant.notes : fallback.goalAssistant.notes,
    },
    learningSituationChecks: partial.learningSituationChecks && typeof partial.learningSituationChecks === "object" && !Array.isArray(partial.learningSituationChecks)
      ? Object.fromEntries(Object.entries(partial.learningSituationChecks).map(([key, entry]) => {
        const value = entry && typeof entry === "object" ? entry as { checked?: unknown; notes?: unknown } : {};
        return [key, { checked: Boolean(value.checked), notes: typeof value.notes === "string" ? value.notes : "" }];
      }))
      : fallback.learningSituationChecks,
    preparation: { ...fallback.preparation, ...(partial.preparation ?? {}) },
    criteriaChecks: { ...fallback.criteriaChecks, ...(partial.criteriaChecks ?? {}) },
    phases: partial.phases.map((phase, index) => {
      const template = phaseTemplate(index);
      const suppliedId = typeof phase.id === "string" ? phase.id.trim() : "";
      const id = suppliedId && !seenIds.has(suppliedId) ? suppliedId : crypto.randomUUID();
      seenIds.add(id);
      return {
        ...template,
        ...phase,
        id,
        color: typeof phase.color === "string" && phase.color && !LEGACY_PHASE_COLORS.has(phase.color) ? phase.color : template.color,
        content: phase.content ?? "",
        shortDescription: phase.shortDescription ?? "",
        teacherAction: phase.teacherAction ?? phase.moderation ?? "",
        studentAction: phase.studentAction ?? "",
        competencyFocus: phase.competencyFocus && typeof phase.competencyFocus === "object" && !Array.isArray(phase.competencyFocus)
          ? Object.fromEntries(Object.entries(phase.competencyFocus).filter(([key, note]) => competencyFieldOrder.includes(key as CompetencyFieldId) && typeof note === "string")) as Phase["competencyFocus"]
          : template.competencyFocus,
        differentiationDetails: {
          ...template.differentiationDetails,
          ...(phase.differentiationDetails ?? {}),
        },
      };
    }),
  };
};

const readStoredPlan = (): Plan => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const stored = value ? normalizePlan(JSON.parse(value)) : initialPlan();
    return { ...stored, targetAudience: "students" };
  } catch { return initialPlan(); }
};

function AccessGate({
  value,
  error,
  onChange,
  onSubmit,
}: {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-soft">
        <div className="bg-white px-6 pb-5 pt-7 text-center">
          <img src={SEMINAR_LOGO} alt="Seminar Metalltechnik" className="mx-auto h-24 w-auto max-w-[320px] object-contain" />
          <h1 className="sr-only">UVP Studio</h1>
          <img
            src={UVP_STUDIO_LOGO}
            alt="UVP Studio – Analysieren, Planen, Reflektieren"
            className="mx-auto mt-4 h-auto w-full max-w-[360px] object-contain"
          />
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/55">Digitale Unterrichtsplanung für die berufliche Lehrerbildung</p>
        </div>
        <form
          className="grid gap-4 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <p className="text-sm leading-relaxed text-ink/60">Bitte gib den Zugangscode ein, um UVP Studio zu öffnen.</p>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Zugangscode</span>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-ink/10 bg-paper/70 px-4 py-3 text-base font-semibold outline-none transition placeholder:text-ink/25 focus:border-moss focus:bg-white"
              placeholder="Zugangscode eingeben"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              autoFocus
            />
          </label>
          {error && (
            <div className="rounded-2xl border border-clay/15 bg-clay/5 px-4 py-3 text-sm font-semibold leading-relaxed text-clay" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="rounded-full bg-moss px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-moss/90 focus:outline-none focus:ring-2 focus:ring-moss/35">
            Zugang öffnen
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [accessGranted, setAccessGranted] = useState(() => {
    try {
      return sessionStorage.getItem(ACCESS_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessError, setAccessError] = useState("");
  const [plan, setPlan] = useState<Plan>(readStoredPlan);
  const [selectedId, setSelectedId] = useState(plan.phases[0]?.id ?? "");
  const [matrixOpen, setMatrixOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [verbCatalogOpen, setVerbCatalogOpen] = useState<CompetencyDimension | null>(null);
  const [saved, setSaved] = useState(true);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [compactDetailsOpen, setCompactDetailsOpen] = useState(false);
  const [mindmapDraft, setMindmapDraft] = useState("");
  const [serviceMethodsOpen, setServiceMethodsOpen] = useState(false);
  const [usmOpen, setUsmOpen] = useState(false);
  const [activeUsmItem, setActiveUsmItem] = useState<number | null>(null);
  const [competenceModelOpen, setCompetenceModelOpen] = useState(false);
  const [activeCompetenceItem, setActiveCompetenceItem] = useState<string | null>(null);
  const [hkmOpen, setHkmOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activePlanningSection, setActivePlanningSection] = useState("section-organization");
  const [planningOverviewOpen, setPlanningOverviewOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourRect, setTourRect] = useState<DOMRect | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const situationImageRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const manualPlanningScrollUntilRef = useRef(0);

  const totalMinutes = useMemo(() => plan.phases.reduce((sum, p) => sum + Number(p.minutes || 0), 0), [plan.phases]);
  const checkedCriteria = useMemo(() => Object.values(plan.criteriaChecks).filter(Boolean).length, [plan.criteriaChecks]);
  const selected = plan.phases.find((p) => p.id === selectedId) ?? plan.phases[0];
  const phaseCompetencyFields = useMemo(() => {
    const fieldSet = new Set<CompetencyFieldId>(plan.competencyNeedAnalysis.selectedFields);
    if (selected) {
      competencyFieldOrder.forEach((fieldId) => {
        const parsed = parseCompetencyFieldId(fieldId);
        if (parsed && selected.competencies[parsed.area][parsed.dimension] > 0) fieldSet.add(fieldId);
      });
    }
    return competencyFieldOrder.filter((fieldId) => fieldSet.has(fieldId));
  }, [plan.competencyNeedAnalysis.selectedFields, selected]);
  const isStudentMode = plan.targetAudience === "students";
  const isInServiceMode = plan.targetAudience === "in-service";
  const isAdvancedRefMode = plan.targetAudience === "ref-advanced";
  const planningConfig = planningLevelConfig[plan.targetAudience];
  const showObservationTask = isVisible(sectionVisibility(planningConfig, "observation"));
  const showCoreAnalyses = !isInServiceMode;
  const showCompactContentFrame = isAdvancedRefMode || isInServiceMode;
  const showContentBubbleBoard = isVisible(fieldVisibility(planningConfig, "contentAnalysis", "contentBubbles"));
  const contentBubbleOptional = fieldVisibility(planningConfig, "contentAnalysis", "contentBubbles") === "optional";
  const showCompactLearningContent = fieldVisibility(planningConfig, "contentAnalysis", "compactLearningContent") === "visible";
  const showContextAnalysis = !showCompactContentFrame && isVisible(sectionVisibility(planningConfig, "context"));
  const showDirectResources = isVisible(sectionVisibility(planningConfig, "directResources"));
  const showStudentCount = fieldVisibility(planningConfig, "organization", "studentCount") === "visible";
  const showLessonDuration = fieldVisibility(planningConfig, "organization", "lessonDuration") === "visible";
  const showOrganizationNotes = fieldVisibility(planningConfig, "organization", "organizationNotes") === "visible";
  const showGoalAssistant = fieldVisibility(planningConfig, "context", "goalAssistant") === "visible";
  const showProfessionalRequirement = fieldVisibility(planningConfig, "context", "professionalRequirement") === "visible";
  const showConcreteLearningSituation = fieldVisibility(planningConfig, "synthesis", "concreteLearningSituation") === "visible";
  const showLearningSituationCheck = isVisible(fieldVisibility(planningConfig, "synthesis", "learningSituationCheck"));
  const showPhaseGoal = fieldVisibility(planningConfig, "synthesis", "phaseGoal") === "visible";
  const showPhaseActions = fieldVisibility(planningConfig, "synthesis", "phaseActions") === "visible";
  const showPhaseMethods = fieldVisibility(planningConfig, "synthesis", "phaseMethods") === "visible";
  const showPhaseCompetencies = fieldVisibility(planningConfig, "synthesis", "phaseCompetencies") === "visible";
  const showPhaseModeration = isVisible(fieldVisibility(planningConfig, "synthesis", "phaseModeration"));
  const showCompetencyProfile = isVisible(sectionVisibility(planningConfig, "competencyProfile"));
  const showCompetencyNeed = isVisible(sectionVisibility(planningConfig, "competencyNeed"));
  const showPlanningHelps = planningConfig.rank < 2;
  const useCompactFlowTitle = isInServiceMode || isAdvancedRefMode;
  const renderFieldHelp = (help: { title: string; phase: string; purpose: string; importance?: string; questions: readonly string[] }) =>
    showPlanningHelps ? <FieldHelp {...help} /> : null;
  const tourSteps = useMemo<TourStep[]>(() => {
    return [
      {
        id: "planning-stand",
        targetId: "planning-stand",
        title: "Wähle deinen Planungsstand",
        description: "Der Planungsstand steuert, wie ausführlich UVP Studio dich begleitet. Ausgeblendete Inhalte werden beim Wechsel nicht gelöscht.",
        decisionHelp: true,
        allowTargetInteraction: true,
      },
      {
        id: "overview",
        targetId: "planning-overview",
        fallbackTargetId: "planning-overview-mobile",
        title: "Plane Schritt für Schritt",
        description: "Die Planungsübersicht führt dich schrittweise von den Rahmenbedingungen über Analyse und Inhaltsstrukturierung bis zur konkreten Unterrichtsplanung. Mit einem Klick springst du direkt zum jeweiligen Arbeitsbereich.",
        planningOverviewHelp: true,
        allowTargetInteraction: true,
      },
      {
        id: "exports",
        targetId: "file-menu",
        title: "Exportiere deine Planung als PDF",
        description: "Über den PDF-Export erhältst du eine übersichtliche Planungsdarstellung – für dich selbst, Hospitierende, Dozierende oder Seminarlehrkräfte.",
      },
      {
        id: "models",
        targetId: "models-menu",
        title: "Schnuppere in die Modelle",
        description: "Im Modelle-Menü kannst du Kompetenzverständnis, Handlungskompetenzmatrix und Unterrichtsstrukturmodell erkunden, wenn du fachliche Orientierung brauchst.",
        allowTargetInteraction: true,
      },
    ];
  }, []);
  const planningOverviewItems = useMemo(() => {
    const items: PlanningOverviewItem[] = [
      {
        id: "section-organization",
        label: "Rahmenbedingungen",
        hasContent: Boolean(plan.teacherName.trim() || plan.className.trim() || plan.date || plan.startTime || plan.studentCount.trim() || plan.organizationNotes.trim()),
        group: true,
      },
    ];
    if (showCompactContentFrame) {
      items.push({
        id: "section-content-frame",
        label: "Inhaltliche Rahmenbedingungen",
        hasContent: Boolean(plan.topic.trim() || plan.situationDescription.trim() || plan.globalGoal.trim()),
      });
    }
    if (!isInServiceMode) {
      items.push({
        id: "section-planning-room",
        label: "Analysen & Grobplanung",
        hasContent: Boolean(
          plan.topic.trim()
          || plan.situationDescription.trim()
          || plan.curriculumReference.trim()
          || plan.annualPlanReference.trim()
          || plan.topicPlacement.trim()
          || plan.competencyNeedAnalysis.selectedFields.length
          || plan.learningContent.trim()
          || plan.contentBubbles.length
          || plan.learningPrerequisites.priorKnowledge.trim()
          || plan.learningPrerequisites.compact.trim()
          || plan.learningPrerequisites.groupFactors.length
          || plan.learningPrerequisites.specialFactors.length
          || plan.learningPrerequisites.consequences.trim()
        ),
        group: true,
      });
      if (showContextAnalysis) {
        items.push({
          id: "section-context-analysis",
          label: "Kontextanalyse",
          hasContent: Boolean(plan.topic.trim() || plan.situationDescription.trim() || plan.curriculumReference.trim() || plan.annualPlanReference.trim() || plan.topicPlacement.trim()),
          parentId: "section-planning-room",
          level: 1,
        });
      }
      if (!showContextAnalysis && showDirectResources) {
        items.push({
          id: "section-direct-resources",
          label: "Vorgaben & Ressourcen",
          hasContent: Boolean(plan.curriculumReference.trim() || plan.annualPlanReference.trim() || plan.topicPlacement.trim()),
          parentId: "section-planning-room",
          level: 1,
        });
      }
      items.push({
        id: "section-competency-analysis",
        label: showCompetencyNeed ? "Sachanalyse" : "Lerninhalte optional",
        hasContent: Boolean(plan.competencyNeedAnalysis.selectedFields.length || plan.learningContent.trim() || plan.contentBubbles.length),
        parentId: "section-planning-room",
        level: 1,
      });
      items.push({
        id: "section-address-analysis",
        label: isAdvancedRefMode ? "Adressaten-Notizen" : "Adressatenanalyse",
        hasContent: Boolean(plan.learningPrerequisites.priorKnowledge.trim() || plan.learningPrerequisites.compact.trim() || plan.learningPrerequisites.groupFactors.length || plan.learningPrerequisites.specialFactors.length || plan.learningPrerequisites.consequences.trim()),
        parentId: "section-planning-room",
        level: 1,
      });
    }
    if (isInServiceMode && contentBubbleOptional) {
      items.push({
        id: "section-competency-analysis",
        label: "Lerninhalte optional",
        hasContent: Boolean(plan.contentBubbles.length || plan.contentConnections.length),
      });
    }
    items.push({
      id: "section-synthesis",
      label: useCompactFlowTitle ? "Unterrichtsverlauf" : "Päd.-didaktische Synthese",
      hasContent: Boolean((showConcreteLearningSituation && plan.concreteLearningSituation.trim()) || plan.phases.length),
      group: true,
    });
    if (!isInServiceMode) {
      items.push({
        id: "section-competency-profile",
        label: "Kompetenzprofil",
        hasContent: plan.phases.some((phase) => areas.some((area) => dimensions.some((dimension) => (phase.competencies?.[area.key]?.[dimension.key] ?? 0) > 0))),
        group: true,
      });
    }
    if (showObservationTask) {
      items.push({
        id: "section-observation",
        label: "Beobachtungsauftrag",
        hasContent: Boolean(plan.observationEnabled && plan.observationTask.trim()),
        group: true,
      });
    }
    return items;
  }, [contentBubbleOptional, isAdvancedRefMode, isInServiceMode, plan, showCompactContentFrame, showCompetencyNeed, showConcreteLearningSituation, showContextAnalysis, showDirectResources, showObservationTask, useCompactFlowTitle]);

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [plan]);

  useEffect(() => {
    setServiceMethodsOpen(false);
  }, [selectedId, isInServiceMode]);

  useEffect(() => {
    if (!accessGranted) return;
    const record = readOnboardingRecord();
    if (record.status !== "new" || wasOnboardingDeferredThisSession()) return;
    const timer = window.setTimeout(() => setWelcomeOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [accessGranted]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const height = headerRef.current?.getBoundingClientRect().height ?? 96;
      document.documentElement.style.setProperty("--uvp-header-height", `${height}px`);
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [mobileNav]);

  useEffect(() => {
    const elements = planningOverviewItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualPlanningScrollUntilRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
        if (visible?.target.id) setActivePlanningSection(visible.target.id);
      },
      { root: null, rootMargin: "-22% 0px -62% 0px", threshold: 0.01 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [planningOverviewItems]);

  useEffect(() => {
    if (!criteriaOpen && !verbCatalogOpen && !usmOpen && activeUsmItem == null && !competenceModelOpen && activeCompetenceItem == null && !hkmOpen && !aboutOpen && !welcomeOpen && !tourActive) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (tourActive) {
        writeOnboardingRecord("skipped");
        setTourActive(false);
        setTourIndex(0);
        setTourRect(null);
        return;
      }
      if (welcomeOpen) {
        markOnboardingLaterForSession();
        setWelcomeOpen(false);
        return;
      }
      setCriteriaOpen(false);
      setVerbCatalogOpen(null);
      setUsmOpen(false);
      setActiveUsmItem(null);
      setCompetenceModelOpen(false);
      setActiveCompetenceItem(null);
      setHkmOpen(false);
      setAboutOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [criteriaOpen, verbCatalogOpen, usmOpen, activeUsmItem, competenceModelOpen, activeCompetenceItem, hkmOpen, aboutOpen, welcomeOpen, tourActive]);

  useEffect(() => {
    if (!tourActive) return;
    const activeStep = tourSteps[tourIndex];
    if (!activeStep) {
      setTourActive(false);
      setTourIndex(0);
      setTourRect(null);
      return;
    }
    const resolveTarget = () => {
      const findVisibleTarget = (selector: string) => {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
        return candidates.find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const style = window.getComputedStyle(candidate);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        }) ?? null;
      };
      const selector = activeStep.targetId ? `[data-tour-id="${activeStep.targetId}"]` : "";
      const fallbackSelector = activeStep.fallbackTargetId ? `[data-tour-id="${activeStep.fallbackTargetId}"]` : "";
      return (selector ? findVisibleTarget(selector) : null)
        ?? (fallbackSelector ? findVisibleTarget(fallbackSelector) : null);
    };
    const updateRect = () => {
      if (!activeStep.targetId && !activeStep.fallbackTargetId) {
        setTourRect(null);
        return;
      }
      const target = resolveTarget();
      if (!target) {
        if (tourIndex < tourSteps.length - 1) setTourIndex((value) => value + 1);
        return;
      }
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const rect = target.getBoundingClientRect();
      const needsScrollUp = rect.top < headerHeight + 24;
      const needsScrollDown = rect.bottom > window.innerHeight - 32;
      if (activeStep.targetId && (needsScrollUp || needsScrollDown)) {
        const top = rect.top + window.scrollY - headerHeight - 28;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        window.setTimeout(() => {
          const nextTarget = resolveTarget();
          setTourRect(nextTarget?.getBoundingClientRect() ?? null);
        }, 260);
      } else {
        setTourRect(rect);
      }
    };
    updateRect();
    const settleTimer = window.setTimeout(updateRect, 120);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [tourActive, tourIndex, tourSteps]);

  const submitAccessCode = () => {
    if (accessCodeInput.trim() === APP_ACCESS_CODE) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
      } catch {
        // Sitzungsspeicherung ist eine Komfortfunktion; der Zugang bleibt in diesem Tab trotzdem geöffnet.
      }
      setAccessGranted(true);
      setAccessError("");
      setAccessCodeInput("");
      return;
    }
    setAccessError("Der Zugangscode stimmt noch nicht. Bitte prüfe die Eingabe und versuche es erneut.");
  };

  const lockAccess = () => {
    try {
      sessionStorage.removeItem(ACCESS_SESSION_KEY);
    } catch {
      // Ignorieren, falls sessionStorage im Browser nicht verfügbar ist.
    }
    setAccessGranted(false);
    setAccessCodeInput("");
    setAccessError("");
    setMobileNav(false);
    setCriteriaOpen(false);
    setVerbCatalogOpen(null);
    setUsmOpen(false);
    setActiveUsmItem(null);
    setCompetenceModelOpen(false);
    setActiveCompetenceItem(null);
    setHkmOpen(false);
    setAboutOpen(false);
    setWelcomeOpen(false);
    setTourActive(false);
    setTourIndex(0);
    setTourRect(null);
  };

  const startOnboardingTour = () => {
    setWelcomeOpen(false);
    setMobileNav(false);
    setCriteriaOpen(false);
    setVerbCatalogOpen(null);
    setUsmOpen(false);
    setActiveUsmItem(null);
    setCompetenceModelOpen(false);
    setActiveCompetenceItem(null);
    setHkmOpen(false);
    setAboutOpen(false);
    setPlan((old) => old.targetAudience === "students" ? old : { ...old, targetAudience: "students" });
    setTourIndex(0);
    setTourRect(null);
    window.setTimeout(() => setTourActive(true), 0);
  };

  const deferOnboarding = () => {
    markOnboardingLaterForSession();
    setWelcomeOpen(false);
  };

  const skipOnboarding = () => {
    writeOnboardingRecord("skipped");
    setWelcomeOpen(false);
    setTourActive(false);
    setTourIndex(0);
    setTourRect(null);
  };

  const completeOnboarding = () => {
    writeOnboardingRecord("completed");
    setTourActive(false);
    setTourIndex(0);
    setTourRect(null);
  };

  const changeTargetAudience = (next: TargetAudience) => {
    if (planningLevelConfig[next].rank > planningConfig.rank) {
      window.alert("Im gewählten Planungsstand werden einige Bereiche ausgeblendet. Bereits eingegebene Inhalte bleiben erhalten und werden wieder sichtbar, wenn du zu einem ausführlicheren Planungsstand zurückkehrst.");
    }
    updatePlan("targetAudience", next);
  };

  const updatePlan = <K extends keyof Plan>(key: K, value: Plan[K]) => setPlan((old) => ({ ...old, [key]: value }));
  const goToPlanSection = (sectionId: string, focusId?: string) => {
    setActivePlanningSection(sectionId);
    manualPlanningScrollUntilRef.current = Date.now() + 900;
    window.setTimeout(() => {
      const target = document.getElementById(focusId ?? sectionId);
      if (!target) return;
      const ownDetails = target instanceof HTMLDetailsElement
        ? target
        : target.querySelector(":scope > details");
      if (ownDetails instanceof HTMLDetailsElement) ownDetails.open = true;
      let parent = target.parentElement;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        target.focus({ preventScroll: true });
      }
      setPlanningOverviewOpen(false);
    }, 0);
  };
  const updateGoalAssistant = (patch: Partial<Plan["goalAssistant"]>) =>
    setPlan((old) => ({ ...old, goalAssistant: { ...old.goalAssistant, ...patch } }));
  const updateLearningSituationCheck = (id: string, patch: Partial<Plan["learningSituationChecks"][string]>) =>
    setPlan((old) => {
      const current = old.learningSituationChecks[id] ?? { checked: false, notes: "" };
      return {
        ...old,
        learningSituationChecks: {
          ...old.learningSituationChecks,
          [id]: { ...current, ...patch },
        },
      };
    });
  const applyGoalSuggestion = () => {
    const suggestion = buildGoalSuggestion(plan.goalAssistant);
    if (!suggestion) return;
    setPlan((old) => ({ ...old, globalGoal: suggestion }));
  };
  const updatePhase = (id: string, patch: Partial<Phase>) =>
    setPlan((old) => ({ ...old, phases: old.phases.map((p) => p.id === id ? { ...p, ...patch } : p) }));
  const updateLearningPrerequisite = <K extends keyof Plan["learningPrerequisites"]>(key: K, value: Plan["learningPrerequisites"][K]) =>
    setPlan((old) => ({ ...old, learningPrerequisites: { ...old.learningPrerequisites, [key]: value } }));
  const updateLearningPrerequisites = (next: Plan["learningPrerequisites"]) =>
    setPlan((old) => ({ ...old, learningPrerequisites: next }));

  const addMindmapNode = () => {
    const text = mindmapDraft.trim();
    if (!text) return;
    const next: MindmapNode = {
      id: crypto.randomUUID(),
      text,
      x: 36 + (plan.contentMindmap.length % 5) * 94,
      y: 36 + Math.floor(plan.contentMindmap.length / 5) * 58,
    };
    setPlan((old) => ({ ...old, contentMindmap: [...old.contentMindmap, next] }));
    setMindmapDraft("");
  };

  const updateMindmapNode = (id: string, patch: Partial<MindmapNode>) =>
    setPlan((old) => ({ ...old, contentMindmap: old.contentMindmap.map((node) => node.id === id ? { ...node, ...patch } : node) }));

  const deleteMindmapNode = (id: string) =>
    setPlan((old) => ({ ...old, contentMindmap: old.contentMindmap.filter((node) => node.id !== id) }));

  const addContentBubble = () => {
    const index = plan.contentBubbles.length;
    const next: ContentBubble = {
      id: crypto.randomUUID(),
      title: "Neuer Inhalt",
      description: "",
      color: CONTENT_BUBBLE_COLORS[index % CONTENT_BUBBLE_COLORS.length],
      x: 36 + (index % 5) * 74,
      y: 36 + Math.floor(index / 5) * 68,
      size: 156,
      width: 176,
      height: 138,
    };
    setPlan((old) => ({ ...old, contentBubbles: [...old.contentBubbles, next] }));
  };

  const updateContentBubble = (id: string, patch: Partial<ContentBubble>) =>
    setPlan((old) => ({ ...old, contentBubbles: old.contentBubbles.map((bubble) => bubble.id === id ? { ...bubble, ...patch } : bubble) }));

  const deleteContentBubble = (id: string) =>
    setPlan((old) => ({
      ...old,
      contentBubbles: old.contentBubbles.filter((bubble) => bubble.id !== id),
      contentConnections: old.contentConnections.filter((connection) => connection.fromId !== id && connection.toId !== id),
    }));

  const addContentConnection = (fromId: string, toId: string, fromSide?: BubbleSide, toSide?: BubbleSide) => {
    if (fromId === toId) return;
    setPlan((old) => {
      const exists = old.contentConnections.some((connection) =>
        (connection.fromId === fromId && connection.toId === toId) || (connection.fromId === toId && connection.toId === fromId)
      );
      if (exists) return old;
      const next: ContentConnection = { id: crypto.randomUUID(), fromId, toId, fromSide, toSide };
      return { ...old, contentConnections: [...old.contentConnections, next] };
    });
  };

  const deleteContentConnection = (id: string) =>
    setPlan((old) => ({ ...old, contentConnections: old.contentConnections.filter((connection) => connection.id !== id) }));

  const navigateModelStep = (step: "competence" | "hkm" | "usm" | "uvp") => {
    setCompetenceModelOpen(step === "competence");
    setHkmOpen(step === "hkm");
    setUsmOpen(step === "usm");
    if (step === "competence") setActiveCompetenceItem(null);
    if (step === "usm") setActiveUsmItem(null);
    if (step === "uvp") window.setTimeout(() => goToPlanSection("section-synthesis"), 0);
  };

  const updateCompetency = (area: CompetencyArea, dimension: CompetencyDimension, value: number) => {
    if (!selected) return;
    updatePhase(selected.id, {
      competencies: {
        ...selected.competencies,
        [area]: { ...selected.competencies[area], [dimension]: value },
      },
    });
  };

  const updatePhaseCompetencyFocus = (fieldId: CompetencyFieldId, enabled: boolean, note?: string) => {
    if (!selected) return;
    const parsed = parseCompetencyFieldId(fieldId);
    if (!parsed) return;
    const level = (plan.competencyNeedAnalysis.selectedLevels[fieldId] ?? [])[0] ?? 1;
    const currentFocus = selected.competencyFocus ?? {};
    const nextFocus = enabled
      ? { ...currentFocus, [fieldId]: note ?? currentFocus[fieldId] ?? "" }
      : Object.fromEntries(Object.entries(currentFocus).filter(([key]) => key !== fieldId)) as Phase["competencyFocus"];
    updatePhase(selected.id, {
      competencyFocus: nextFocus,
      competencies: {
        ...selected.competencies,
        [parsed.area]: {
          ...selected.competencies[parsed.area],
          [parsed.dimension]: enabled ? level : 0,
        },
      },
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `unterrichtsplanung-${plan.date || "entwurf"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result)) as Partial<Plan>;
        if (!Array.isArray(raw.phases)) throw new Error();
        const next = normalizePlan(raw);
        setPlan(next);
        setSelectedId(next.phases[0]?.id ?? "");
      } catch { window.alert("Die Datei ist keine gültige UVP-Planung."); }
    };
    reader.readAsText(file);
  };

  const uploadSituationImage = async (file?: File) => {
    if (!file) return;
    setImageBusy(true);
    setImageError("");
    try {
      const dataUrl = await prepareSituationImage(file);
      setPlan((old) => ({
        ...old,
        situationImageDataUrl: dataUrl,
        situationImageName: file.name,
      }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Das Bild konnte nicht verarbeitet werden.");
    } finally {
      setImageBusy(false);
    }
  };

  const removeSituationImage = () => {
    setPlan((old) => ({ ...old, situationImageDataUrl: "", situationImageName: "" }));
    setImageError("");
    if (situationImageRef.current) situationImageRef.current.value = "";
  };

  const addPhase = () => {
    const usedColors = new Set(plan.phases.map((phase) => phase.color));
    const availableIndex = PHASE_COLORS.findIndex((color) => !usedColors.has(color));
    const next = phaseTemplate(availableIndex >= 0 ? availableIndex : plan.phases.length);
    setPlan((old) => ({ ...old, phases: [...old.phases, next] }));
    setSelectedId(next.id);
  };

  const deletePhase = (id: string) => {
    const index = plan.phases.findIndex((p) => p.id === id);
    const next = plan.phases.filter((p) => p.id !== id);
    setPlan((old) => ({ ...old, phases: next }));
    setSelectedId(next[Math.max(0, index - 1)]?.id ?? "");
  };

  const reorderPhases = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    setPlan((old) => {
      const sourceIndex = old.phases.findIndex((phase) => phase.id === sourceId);
      const targetIndex = old.phases.findIndex((phase) => phase.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return old;
      const reordered = [...old.phases];
      const [moved] = reordered.splice(sourceIndex, 1);
      const targetAfterRemoval = reordered.findIndex((phase) => phase.id === targetId);
      const insertionIndex = sourceIndex < targetIndex ? targetAfterRemoval + 1 : targetAfterRemoval;
      reordered.splice(insertionIndex, 0, moved);
      return { ...old, phases: reordered };
    });
  };

  const resetPlan = () => {
    if (!window.confirm("Möchtest du die gesamte Planung wirklich zurücksetzen? Alle Eingaben, Phasen, Zeiten und Kompetenzzuordnungen werden gelöscht.")) return;
    const next = initialPlan();
    localStorage.removeItem(STORAGE_KEY);
    setPlan(next);
    setSelectedId("");
    setCriteriaOpen(false);
    setVerbCatalogOpen(null);
    setActiveUsmItem(null);
    setMobileNav(false);
    setImageError("");
    setCompactDetailsOpen(false);
    setMindmapDraft("");
    setActivePlanningSection("section-organization");
    setPlanningOverviewOpen(false);
    if (situationImageRef.current) situationImageRef.current.value = "";
  };

  const renderSituationFileUpload = (compact = false) => (
    <div>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Material zur Lernsituation</span>
      <input
        ref={situationImageRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
        aria-label="Material zur Lernsituation auswählen"
        onChange={(event) => uploadSituationImage(event.target.files?.[0])}
      />
      {plan.situationImageDataUrl ? (
        <div className={`group relative overflow-hidden rounded-2xl border border-ink/10 bg-paper ${compact ? "h-[116px]" : "h-[132px]"}`}>
          <img
            src={plan.situationImageDataUrl}
            alt={plan.situationImageName || "Einstiegssituation"}
            className="h-full w-full object-cover"
          />
          {/\.pdf$/i.test(plan.situationImageName) && (
            <span className="absolute left-3 top-3 rounded-full bg-clay px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">PDF · Seite 1</span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-3 pt-8">
            <span className="min-w-0 truncate text-[10px] font-semibold text-white/80">{plan.situationImageName || "Einstiegsbild"}</span>
            <span className="flex shrink-0 gap-1.5">
              <button
                type="button"
                aria-label="Material zur Lernsituation ersetzen"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition hover:bg-white"
                onClick={() => situationImageRef.current?.click()}
              >
                <ImagePlus size={15} />
              </button>
              <button
                type="button"
                aria-label="Material zur Lernsituation entfernen"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-clay transition hover:bg-white"
                onClick={removeSituationImage}
              >
                <Trash2 size={15} />
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-paper/60 px-4 text-center transition hover:border-moss hover:bg-sky/5 ${compact ? "h-[116px]" : "h-[132px]"}`}
          onClick={() => situationImageRef.current?.click()}
          disabled={imageBusy}
        >
          <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-sky/15 text-moss"><ImagePlus size={19} /></span>
          <span className="text-xs font-bold">{imageBusy ? "Datei wird vorbereitet …" : "Bild oder PDF hochladen"}</span>
          <span className="mt-1 text-[10px] leading-snug text-ink/40">JPEG, PNG, WebP oder PDF · max. 10 MB</span>
        </button>
      )}
      {imageError && <p className="mt-2 text-[10px] font-semibold leading-snug text-clay">{imageError}</p>}
    </div>
  );

  const renderCompactContentFrame = () => (
    <section id="section-content-frame" data-tour-id="compact-content-frame" className="scroll-mt-36 mt-6 rounded-[2rem] border border-moss/15 bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Inhaltliche Ausrichtung</div>
          <h2 className="font-display text-2xl font-bold">Inhaltliche Rahmenbedingungen</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/50">Kompakte Klärung von Thema, beruflichem Handlungsanlass und Ziel der Unterrichtseinheit.</p>
        </div>
      </div>
      <div className="mb-4">
        {renderFieldHelp(planningFieldHelps.contextAnalysis)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4 lg:col-span-2">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Thema / Titel der Lernsituation</span>
          <input
            aria-label="Thema / Titel der Lernsituation"
            className="w-full border-0 border-b border-ink/15 bg-transparent pb-2 font-display text-2xl font-bold outline-none placeholder:text-ink/25 focus:border-moss sm:text-3xl"
            placeholder="Thema oder Titel der Lernsituation"
            value={plan.topic}
            onChange={(event) => updatePlan("topic", event.target.value)}
          />
        </label>
        {showProfessionalRequirement && (
        <label data-tour-id="professional-requirement" className="block rounded-2xl border border-ink/10 bg-paper/60 p-4">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Berufliche Anforderung</span>
          <textarea
            id="professional-requirement-field"
            aria-label="Berufliche Anforderung"
            className="min-h-[132px] w-full rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
            placeholder="Welche berufliche Anforderung, welcher Auftrag oder welches Problem bildet den Handlungsanlass?"
            value={plan.situationDescription}
            onChange={(event) => updatePlan("situationDescription", event.target.value)}
          />
        </label>
        )}
        <div className={`rounded-2xl border border-ink/10 bg-paper/60 p-4 ${showProfessionalRequirement ? "" : "lg:col-span-2"}`}>
          {renderSituationFileUpload(true)}
        </div>
        <label className="block rounded-2xl border border-moss/15 bg-sky/10 p-4">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-moss">Globalziel der Unterrichtseinheit</span>
          <textarea
            aria-label="Globalziel der Unterrichtseinheit"
            className="min-h-[132px] w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
            placeholder="Die Lernenden können …"
            value={plan.globalGoal}
            onChange={(event) => updatePlan("globalGoal", event.target.value)}
          />
          {showGoalAssistant && (
            <div className="mt-3 grid gap-2">
              {renderFieldHelp(planningFieldHelps.globalGoal)}
              <GoalAssistantPanel
                value={plan.goalAssistant}
                globalGoal={plan.globalGoal}
                onChange={updateGoalAssistant}
                onApply={applyGoalSuggestion}
              />
            </div>
          )}
        </label>
      </div>
    </section>
  );

  if (!accessGranted) {
    return (
      <AccessGate
        value={accessCodeInput}
        error={accessError}
        onChange={(value) => {
          setAccessCodeInput(value);
          if (accessError) setAccessError("");
        }}
        onSubmit={submitAccessCode}
      />
    );
  }

  return (
    <>
      <div className="app-shell flex min-h-screen flex-col bg-paper" data-tour-id="app-shell">
        <header ref={headerRef} className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 text-ink shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth und Technikerschule" className="h-9 w-auto max-w-[145px] shrink-0 object-contain sm:h-11 sm:max-w-[175px] lg:h-12 lg:max-w-[190px]" />
                <div className="hidden h-10 w-px bg-ink/10 sm:block lg:h-12" aria-hidden="true" />
                <img
                  src={SEMINAR_LOGO}
                  alt="Seminar Metalltechnik"
                  className="h-10 w-auto max-w-[150px] shrink object-contain object-left sm:h-12 sm:max-w-[195px] lg:h-14 lg:max-w-[240px]"
                />
              </div>
              <img
                src={UVP_STUDIO_LOGO}
                alt="UVP Studio – Analysieren, Planen, Reflektieren"
                className="h-11 w-auto max-w-[145px] shrink-0 object-contain sm:h-12 sm:max-w-[180px] lg:h-14 lg:max-w-[215px]"
              />
              <div className="flex items-center justify-end gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-xs font-medium text-ink/45 sm:inline-flex">
                  {saved ? <Check size={14} /> : <Save size={14} className="animate-pulse" />}
                  {saved ? "Lokal gespeichert" : "Speichert …"}
                </span>
                <button aria-label="Menü öffnen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-paper xl:hidden" onClick={() => setMobileNav(!mobileNav)}>
                  {mobileNav ? <X /> : <Menu />}
                </button>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-[1.15rem] border border-ink/10 bg-paper/80 px-3 py-1.5 shadow-sm xl:flex">
              <label data-tour-id="planning-stand" className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/55 shadow-sm">
                Planungsstand
                <select
                  className="max-w-[260px] bg-transparent text-xs font-bold text-ink outline-none"
                  value={plan.targetAudience}
                  onChange={(event) => changeTargetAudience(event.target.value as TargetAudience)}
                >
                  {targetAudienceOptions.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
                </select>
              </label>
              <nav className="flex items-center gap-1" aria-label="Hauptmenü">
                <MenuDropdown label="Projekt">
                  <MenuInfo label="Aktueller Planungsstand" value={targetAudienceOptions.find((option) => option.key === plan.targetAudience)?.title ?? "—"} />
                  <MenuItemButton tone="danger" icon={<RotateCcw size={15} />} onClick={resetPlan}>Planung zurücksetzen</MenuItemButton>
                  <MenuItemButton icon={<X size={15} />} onClick={lockAccess}>Zugang sperren</MenuItemButton>
                  <MenuDivider />
                  <MenuComingSoon>Einstellungen vorbereitet</MenuComingSoon>
                </MenuDropdown>
                <MenuDropdown label="Datei" tourId="file-menu" forceOpen={tourActive && tourSteps[tourIndex]?.id === "exports"}>
                  <MenuItemButton icon={<Upload size={15} />} onClick={() => importRef.current?.click()}>JSON importieren</MenuItemButton>
                  <MenuItemButton icon={<Download size={15} />} onClick={exportJson}>JSON exportieren</MenuItemButton>
                  <MenuItemButton icon={<FileDown size={15} />} onClick={() => window.print()}>PDF exportieren</MenuItemButton>
                </MenuDropdown>
                <MenuDropdown label="Modelle" tourId="models-menu" forceOpen={tourActive && tourSteps[tourIndex]?.id === "models"}>
                  <MenuItemButton icon={<ClipboardCheck size={15} />} onClick={() => setCriteriaOpen(true)}>
                    Kriterien der Prüfungslehrprobe
                    {checkedCriteria > 0 && <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-[10px] text-ink">{checkedCriteria}/{EXAM_CRITERIA_COUNT}</span>}
                  </MenuItemButton>
                  <MenuItemButton icon={<BookOpen size={15} />} onClick={() => { setCompetenceModelOpen(true); setActiveCompetenceItem(null); }}>Kompetenzverständnis</MenuItemButton>
                  <MenuItemButton icon={<Grid3X3 size={15} />} onClick={() => setHkmOpen(true)}>Handlungskompetenzmatrix</MenuItemButton>
                  <MenuItemButton icon={<LibraryBig size={15} />} onClick={() => { setUsmOpen(true); setActiveUsmItem(null); }}>Unterrichtsstrukturmodell (USM)</MenuItemButton>
                  <MenuDivider />
                  <MenuComingSoon>Weitere Modelle</MenuComingSoon>
                </MenuDropdown>
                <MenuDropdown label="Hilfe" tourId="help-menu">
                  <MenuItemButton icon={<BookOpen size={15} />} onClick={() => setAboutOpen(true)}>Über UVP Studio</MenuItemButton>
                  <MenuItemButton icon={<LibraryBig size={15} />} onClick={startOnboardingTour}>App entdecken</MenuItemButton>
                  <MenuDivider />
                  <MenuComingSoon>Glossar</MenuComingSoon>
                  <MenuComingSoon>Tutorials</MenuComingSoon>
                  <MenuComingSoon>Hilfeblöcke</MenuComingSoon>
                  <MenuComingSoon>Versionshinweise</MenuComingSoon>
                </MenuDropdown>
              </nav>
            </div>
          </div>
          {mobileNav && (
            <div className="grid gap-3 border-t border-ink/10 bg-white p-4 xl:hidden">
              <label data-tour-id="planning-stand" className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-ink/45">
                Planungsstand
                <select
                  className="mt-2 w-full bg-transparent text-sm font-bold normal-case tracking-normal text-ink outline-none"
                  value={plan.targetAudience}
                  onChange={(event) => changeTargetAudience(event.target.value as TargetAudience)}
                >
                  {targetAudienceOptions.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
                  <div className="label">Projekt</div>
                  <button className="icon-btn mt-2 w-full justify-start border-clay/25 text-clay" onClick={resetPlan}><RotateCcw size={16} />Planung zurücksetzen</button>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={lockAccess}><X size={16} />Zugang sperren</button>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={startOnboardingTour}><LibraryBig size={16} />App entdecken</button>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
                  <div className="label">Datei</div>
                  <div className="mt-2 grid gap-2">
                    <button className="icon-btn justify-start" onClick={() => importRef.current?.click()}><Upload size={16} />JSON importieren</button>
                    <button className="icon-btn justify-start" onClick={exportJson}><Download size={16} />JSON exportieren</button>
                    <button className="icon-btn justify-start bg-clay text-white" onClick={() => window.print()}><Printer size={16} />PDF exportieren</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
                  <div className="label">Modelle</div>
                  <div className="mt-2 grid gap-2">
                    <button className="icon-btn justify-start" onClick={() => { setCriteriaOpen(true); setMobileNav(false); }}><ClipboardCheck size={16} />Kriterien der Prüfungslehrprobe</button>
                    <button className="icon-btn justify-start" onClick={() => { setCompetenceModelOpen(true); setActiveCompetenceItem(null); setMobileNav(false); }}><BookOpen size={16} />Kompetenzverständnis</button>
                    <button className="icon-btn justify-start" onClick={() => { setHkmOpen(true); setMobileNav(false); }}><Grid3X3 size={16} />Handlungskompetenzmatrix</button>
                    <button className="icon-btn justify-start" onClick={() => { setUsmOpen(true); setActiveUsmItem(null); setMobileNav(false); }}><LibraryBig size={16} />Unterrichtsstrukturmodell (USM)</button>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink/35">Weitere Modelle vorbereitet</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
                  <div className="label">Hilfe</div>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={() => { setAboutOpen(true); setMobileNav(false); }}><BookOpen size={16} />Über UVP Studio</button>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={() => { setMobileNav(false); startOnboardingTour(); }}><LibraryBig size={16} />App entdecken</button>
                  <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink/40">Glossar, Tutorials und Versionshinweise: demnächst verfügbar</div>
                </div>
              </div>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <button
            type="button"
            data-tour-id="planning-overview-mobile"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-bold text-ink/55 shadow-sm transition hover:border-moss hover:text-ink xl:hidden"
            onClick={() => setPlanningOverviewOpen((value) => !value)}
          >
            <BookOpen size={15} />
            Planungsübersicht
          </button>
          <div className="grid gap-6 xl:grid-cols-[245px_minmax(0,1fr)]">
            <PlanningOverview
              items={planningOverviewItems}
              activeId={activePlanningSection}
              open={planningOverviewOpen}
              onSelect={(id) => goToPlanSection(id)}
            />
            <div className="min-w-0">
          <section id="section-organization" className="scroll-mt-36 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Organisatorische Rahmenbedingungen</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/50">Kompakte Stammdaten der Unterrichtseinheit.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Unterrichtende Lehrkraft</span>
                <input
                  aria-label="Unterrichtende Lehrkraft"
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25"
                  placeholder="Vor- und Nachname"
                  value={plan.teacherName}
                  onChange={(event) => updatePlan("teacherName", event.target.value)}
                />
              </label>
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Klasse</span>
                <input
                  aria-label="Klasse"
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25"
                  placeholder="z. B. MBM 11"
                  value={plan.className}
                  onChange={(event) => updatePlan("className", event.target.value)}
                />
              </label>
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Datum</span>
                <input type="date" className="w-full bg-transparent text-sm font-semibold outline-none" value={plan.date} onChange={(event) => updatePlan("date", event.target.value)} />
              </label>
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Unterrichtsbeginn</span>
                <input type="time" className="w-full bg-transparent text-sm font-semibold outline-none" value={plan.startTime} onChange={(event) => updatePlan("startTime", event.target.value)} />
              </label>
              {showStudentCount && (
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Anzahl der Schülerinnen und Schüler</span>
                <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 24" value={plan.studentCount} onChange={(event) => updatePlan("studentCount", event.target.value)} />
              </label>
              )}
              {(showLessonDuration || showOrganizationNotes) && (
                <>
                  {showLessonDuration && (
                  <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4 lg:col-span-2">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Zeitlicher Umfang</span>
                    <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 90 Min" value={plan.lessonDuration} onChange={(e) => updatePlan("lessonDuration", e.target.value)} />
                  </label>
                  )}
                  {showOrganizationNotes && (
                  <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4 sm:col-span-2 lg:col-span-3">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Weitere organisatorische Rahmenbedingungen</span>
                    <textarea className="min-h-16 w-full bg-transparent text-sm leading-relaxed outline-none placeholder:text-ink/25" placeholder="Raum, Gruppengröße, besondere Ressourcen, Einschränkungen …" value={plan.organizationNotes} onChange={(e) => updatePlan("organizationNotes", e.target.value)} />
                  </label>
                  )}
                </>
              )}
            </div>
          </section>

          {showCompactContentFrame && renderCompactContentFrame()}

          {isInServiceMode && contentBubbleOptional && (
            <section id="section-competency-analysis" className="scroll-mt-36 mt-6 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
              <div className="mb-3">
                <div className="label">Freiwillige Vertiefung</div>
                <h2 className="font-display text-2xl font-bold">Lerninhalte strukturieren</h2>
              </div>
              <OptionalContentBubblePanel
                hasContent={Boolean(plan.contentBubbles.length || plan.contentConnections.length)}
                bubbles={plan.contentBubbles}
                connections={plan.contentConnections}
                onAdd={addContentBubble}
                onUpdate={updateContentBubble}
                onDelete={deleteContentBubble}
                onConnect={addContentConnection}
                onDeleteConnection={deleteContentConnection}
              />
            </section>
          )}

          {!isInServiceMode && (
          <section id="section-planning-room" data-tour-id="planning-room" className="scroll-mt-36 relative mt-6 overflow-hidden rounded-[2.25rem] border border-ink/10 bg-white/70 p-4 text-ink shadow-soft sm:p-6 lg:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-clay" />
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-sky/10" />
            <RedAccentCurve className="absolute -right-14 top-12 w-[330px] opacity-[.045]" />
            <div className="relative">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="label">Planungsraum</div>
                  <h1 className="font-display text-3xl font-bold sm:text-4xl">Analysen & Grobplanung</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/55">Öffne nacheinander die Analysebereiche, wenn du die jeweiligen Details bearbeiten möchtest.</p>
                </div>
                <div className="rounded-full bg-sky/15 px-3 py-1.5 text-xs font-bold text-moss">
                  {targetAudienceOptions.find((option) => option.key === plan.targetAudience)?.title ?? "Planungsstand"}
                </div>
              </div>

              <div className="grid gap-3">
                {showContextAnalysis && (
                <div id="section-context-analysis" className="scroll-mt-36">
                <PlanningAccordion title="Kontextanalyse">
                  <div className="mb-3">
                    {renderFieldHelp(planningFieldHelps.contextAnalysis)}
                  </div>
                  <PlanningSubAccordion title="Allgemeine Rahmenbedingungen klären">
                    <div className="grid gap-6">
                      <div>
                        <label className="mb-5 block">
                          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Thema / Lernsituation</span>
                          <input
                            aria-label="Thema / Lernsituation"
                            className="w-full border-0 border-b border-ink/15 bg-transparent pb-2 font-display text-2xl font-bold outline-none placeholder:text-ink/25 focus:border-moss sm:text-3xl"
                            placeholder="Thema oder Titel der Lernsituation"
                            value={plan.topic} onChange={(e) => updatePlan("topic", e.target.value)}
                          />
                        </label>
                        <div className={`mb-5 grid gap-4 ${showProfessionalRequirement ? "sm:grid-cols-[minmax(0,1fr)_220px]" : "sm:grid-cols-[minmax(0,280px)]"}`}>
                          {showProfessionalRequirement && (
                          <label data-tour-id="professional-requirement" className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Berufliche Anforderung</span>
                            <textarea
                              id="professional-requirement-field"
                              aria-label="Berufliche Anforderung"
                              className="min-h-[132px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
                              placeholder="Welche berufliche Anforderung, welcher Auftrag oder welches Problem bildet den Handlungsanlass?"
                              value={plan.situationDescription} onChange={(e) => updatePlan("situationDescription", e.target.value)}
                            />
                          </label>
                          )}
                          {!isStudentMode && renderSituationFileUpload()}
                        </div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">{isInServiceMode ? "Gesamtziel der Unterrichtseinheit" : "Globalziel der Unterrichtseinheit"}</label>
                        <textarea
                          aria-label="Globalziel"
                          className="min-h-[88px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss sm:text-xl"
                          placeholder="Die Lernenden können …"
                          value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                        />
                        <div className="mt-3 grid gap-2">
                          {renderFieldHelp(planningFieldHelps.globalGoal)}
                          {showGoalAssistant && <GoalAssistantPanel
                            value={plan.goalAssistant}
                            globalGoal={plan.globalGoal}
                            onChange={updateGoalAssistant}
                            onApply={applyGoalSuggestion}
                          />}
                        </div>
                      </div>
                    </div>
                  </PlanningSubAccordion>
                  {showDirectResources && (
                    <PlanningSubAccordion title="Direkte Vorgaben und Ressourcen berücksichtigen">
                      <div className="mb-3">
                        {renderFieldHelp(planningFieldHelps.directResources)}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block">
                          <span className="label">Bezug zum Lehrplan</span>
                          <textarea className="field min-h-24" value={plan.curriculumReference} onChange={(event) => updatePlan("curriculumReference", event.target.value)} placeholder="Kompetenzerwartungen, Lernfeld, Lehrplanbezug …" />
                        </label>
                        <label className="block">
                          <span className="label">Didaktische Jahresplanung</span>
                          <textarea className="field min-h-24" value={plan.annualPlanReference} onChange={(event) => updatePlan("annualPlanReference", event.target.value)} placeholder="Sequenz, Lernfeld, Anschluss …" />
                        </label>
                        <label className="block">
                          <span className="label">Einordnung des Themas</span>
                          <textarea className="field min-h-24" value={plan.topicPlacement} onChange={(event) => updatePlan("topicPlacement", event.target.value)} placeholder="Warum jetzt? Vorher/Nachher? Bedeutung im Bildungsgang …" />
                        </label>
                      </div>
                    </PlanningSubAccordion>
                  )}
                </PlanningAccordion>
                </div>
                )}

                {!showContextAnalysis && showDirectResources && (
                  <div id="section-direct-resources" className="scroll-mt-36">
                    <PlanningAccordion title="Direkte Vorgaben und Ressourcen berücksichtigen">
                      <div className="mb-3">
                        {renderFieldHelp(planningFieldHelps.directResources)}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block">
                          <span className="label">Bezug zum Lehrplan</span>
                          <textarea className="field min-h-24" value={plan.curriculumReference} onChange={(event) => updatePlan("curriculumReference", event.target.value)} placeholder="Kompetenzerwartungen, Lernfeld, Lehrplanbezug …" />
                        </label>
                        <label className="block">
                          <span className="label">Didaktische Jahresplanung</span>
                          <textarea className="field min-h-24" value={plan.annualPlanReference} onChange={(event) => updatePlan("annualPlanReference", event.target.value)} placeholder="Sequenz, Lernfeld, Anschluss …" />
                        </label>
                        <label className="block">
                          <span className="label">Einordnung des Themas</span>
                          <textarea className="field min-h-24" value={plan.topicPlacement} onChange={(event) => updatePlan("topicPlacement", event.target.value)} placeholder="Warum jetzt? Vorher/Nachher? Bedeutung im Bildungsgang …" />
                        </label>
                      </div>
                    </PlanningAccordion>
                  </div>
                )}

                <div id="section-competency-analysis" className="scroll-mt-36">
                <PlanningAccordion title="Kompetenzorientierte Sachanalyse">
                  <div className="mb-3">
                    {renderFieldHelp(planningFieldHelps.competencyAnalysis)}
                  </div>
                  {showCompetencyNeed && (
                    <PlanningSubAccordion title="Kompetenzbedarf ermitteln">
                      <ProfessionalRequirementReference
                        value={plan.situationDescription}
                        onEdit={() => goToPlanSection(showContextAnalysis ? "section-context-analysis" : "section-content-frame", "professional-requirement-field")}
                      />
                      {renderFieldHelp(planningFieldHelps.competencyNeed)}
                      <CompetencyNeedCoach
                        value={plan.competencyNeedAnalysis}
                        compact={isAdvancedRefMode}
                        onChange={(value) => updatePlan("competencyNeedAnalysis", value)}
                      />
                    </PlanningSubAccordion>
                  )}
                  <PlanningSubAccordion title="Lerninhalte analysieren, strukturieren und auswählen">
                    {renderFieldHelp(planningFieldHelps.learningContent)}
                    {showContentBubbleBoard && !contentBubbleOptional && (
                      <ContentBubbleBoard
                        bubbles={plan.contentBubbles}
                        connections={plan.contentConnections}
                        onAdd={addContentBubble}
                        onUpdate={updateContentBubble}
                        onDelete={deleteContentBubble}
                        onConnect={addContentConnection}
                        onDeleteConnection={deleteContentConnection}
                      />
                    )}
                    {showContentBubbleBoard && contentBubbleOptional && (
                      <OptionalContentBubblePanel
                        hasContent={Boolean(plan.contentBubbles.length || plan.contentConnections.length)}
                        bubbles={plan.contentBubbles}
                        connections={plan.contentConnections}
                        onAdd={addContentBubble}
                        onUpdate={updateContentBubble}
                        onDelete={deleteContentBubble}
                        onConnect={addContentConnection}
                        onDeleteConnection={deleteContentConnection}
                      />
                    )}
                    {showCompactLearningContent && (
                      <>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Lerninhalte</label>
                        <textarea
                          aria-label="Lerninhalte"
                          className="min-h-[104px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss"
                          placeholder="Welche fachlichen Inhalte, Begriffe, Verfahren oder Zusammenhänge werden erschlossen?"
                          value={plan.learningContent}
                          onChange={(event) => updatePlan("learningContent", event.target.value)}
                        />
                      </>
                    )}
                    {!showContentBubbleBoard && !showCompactLearningContent && (
                      <div className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/50">Dieser Bereich ist im aktuellen Planungsstand ausgeblendet.</div>
                    )}
                  </PlanningSubAccordion>
                </PlanningAccordion>
                </div>

                {showCoreAnalyses && (
                  <div id="section-address-analysis" className="scroll-mt-36">
                  <PlanningAccordion title={isAdvancedRefMode ? "Notizen zu den Adressaten" : "Adressatenanalyse"}>
                    <div className="mb-3">
                      {renderFieldHelp(planningFieldHelps.addressAnalysis)}
                    </div>
                    <PlanningSubAccordion title={isAdvancedRefMode ? "Aktuelle Beobachtungen und Hinweise" : "Lernvoraussetzungen erfassen und analysieren"}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs leading-relaxed text-ink/50">
                          {isAdvancedRefMode ? "Kurze Notizen zu Besonderheiten, Veränderungen oder aktuellen Hinweisen der Lerngruppe." : "Was bringen die Lernenden fachlich, sprachlich, methodisch und sozial mit?"}
                        </p>
                      </div>
                      {renderFieldHelp(planningFieldHelps.prerequisites)}
                      {isAdvancedRefMode ? (
                        <div className="grid gap-3">
                          {(plan.learningPrerequisites.priorKnowledge.trim()
                            || plan.learningPrerequisites.groupFactors.length
                            || plan.learningPrerequisites.specialFactors.length
                            || plan.learningPrerequisites.consequences.trim()) && (
                            <div className="rounded-2xl border border-moss/15 bg-sky/10 px-4 py-3 text-xs font-semibold leading-relaxed text-ink/55">
                              Ausführliche Angaben aus einem anderen Planungsstand sind vorhanden und bleiben gespeichert. Hier erscheint bewusst nur die kompakte Notizansicht.
                            </div>
                          )}
                          <label className="block">
                            <span className="label">Notizen zur Lerngruppe und zu den Lernvoraussetzungen</span>
                            <textarea
                              className="field min-h-28"
                              value={plan.learningPrerequisites.compact}
                              onChange={(event) => updateLearningPrerequisite("compact", event.target.value)}
                              placeholder="Halte hier nur die Voraussetzungen und Konsequenzen fest, die für die konkrete Unterrichtsplanung bedeutsam sind."
                            />
                          </label>
                        </div>
                      ) : (
                        <LearningPrerequisitesCoach
                          value={plan.learningPrerequisites}
                          onChange={updateLearningPrerequisites}
                        />
                      )}
                    </PlanningSubAccordion>
                  </PlanningAccordion>
                  </div>
                )}

              </div>
            </div>
          </section>
          )}

          <section id="section-synthesis" className="scroll-mt-36 mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">{useCompactFlowTitle ? "Schnellplanung" : "Unterrichtsgrobkonzept"}</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">{useCompactFlowTitle ? "Unterrichtsverlaufplan" : "Päd.-didaktische Synthese (Grobkonzept)"}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/50">{useCompactFlowTitle ? "Kompakter Unterrichtsverlaufplan für den Unterrichtsalltag." : "Der Unterrichtsverlaufplan als roter Faden der Stunde."}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2" data-tour-id="phase-actions">
                <button
                  className="icon-btn border-clay/25 text-clay hover:border-clay/50 hover:bg-clay/5 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/25 disabled:hover:bg-white"
                  disabled={!selected}
                  onClick={() => selected && deletePhase(selected.id)}
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Phase entfernen</span>
                  <span className="sm:hidden">Entfernen</span>
                </button>
                <button className="icon-btn" onClick={addPhase}><Plus size={17} /> <span className="hidden sm:inline">Phase</span></button>
              </div>
            </div>
            {(showPlanningHelps || renderFieldHelp(planningFieldHelps.synthesis) || renderFieldHelp(planningFieldHelps.flow)) && (
              <details className="help-panel group mb-4 text-sm">
                <summary className="help-panel-summary [&::-webkit-details-marker]:hidden">
                  <span>Optionale Hilfen und Reflexionen zur Synthese</span>
                  <ChevronDown size={16} className="text-ink/35 transition group-open:rotate-180" />
                </summary>
                <div className="grid gap-2 border-t border-[color:var(--help-border)] p-3">
                  {renderFieldHelp(planningFieldHelps.synthesis)}
                  {renderFieldHelp(planningFieldHelps.flow)}
                  {showPlanningHelps && <QualityReflectionPanel plan={plan} totalMinutes={totalMinutes} />}
                </div>
              </details>
            )}
            {showConcreteLearningSituation && (
              <section className="mb-4 rounded-[1.75rem] border border-moss/15 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3">
                  <div className="label">Ziel der Unterrichtsstunde</div>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/50">
                    Halte hier das konkrete Kompetenzziel fest, von dem aus Lernsituation und Unterrichtsphasen geplant werden.
                  </p>
                </div>
                <textarea
                  aria-label="Ziel der Unterrichtsstunde"
                  className="min-h-24 w-full resize-y rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss focus:bg-white"
                  placeholder="Die Lernenden können …"
                  value={plan.globalGoal}
                  onChange={(event) => updatePlan("globalGoal", event.target.value)}
                />
              </section>
            )}
            {showConcreteLearningSituation && (
            <section data-tour-id="concrete-learning-situation" className="mb-4 rounded-[1.75rem] border border-moss/15 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="label">Konkrete Lernsituation</div>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/50">
                    Formuliere hier die konkrete beruflich gerahmte Situation, in der die Schülerinnen und Schüler handeln und lernen.
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {renderFieldHelp(planningFieldHelps.concreteLearningSituation)}
                <textarea
                  aria-label="Konkrete Lernsituation"
                  className="min-h-28 w-full resize-y rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss focus:bg-white"
                  placeholder="Beschreibe die konkrete Situation, mit der die Lernenden im Unterricht konfrontiert werden …"
                  value={plan.concreteLearningSituation}
                  onChange={(event) => updatePlan("concreteLearningSituation", event.target.value)}
                />
                {isStudentMode && (
                  <details className="group rounded-2xl border border-ink/10 bg-paper/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-ink/60 transition hover:bg-white/60 [&::-webkit-details-marker]:hidden">
                      Material zur Lernsituation hochladen oder verwalten
                      <ChevronDown size={15} className="text-ink/35 transition group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-ink/10 p-4">
                      <div className="mb-2 text-xs leading-relaxed text-ink/45">
                        Binde hier die ausgearbeitete Lernsituation als Arbeitsgrundlage für die anschließende Planung ein.
                      </div>
                      {renderSituationFileUpload()}
                    </div>
                  </details>
                )}
              </div>
            </section>
            )}
            {showLearningSituationCheck && (
              <div className="mb-5">
                <LearningSituationReflection
                  checks={plan.learningSituationChecks}
                  onUpdate={updateLearningSituationCheck}
                />
              </div>
            )}
            {plan.phases.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-ink/15 bg-white px-6 py-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky/15 text-moss"><Plus size={22} /></div>
                <h3 className="mt-4 font-display text-xl font-bold">Noch keine Unterrichtsphase angelegt</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink/50">Die Planung startet bewusst leer. Lege deine erste Phase an und entwickle einen eigenen Unterrichtsverlauf.</p>
                <button className="icon-btn mt-5 border-moss bg-moss text-white hover:bg-ink" onClick={addPhase}><Plus size={17} />Erste Phase hinzufügen</button>
              </div>
            ) : (
              <div className="timeline-scroll overflow-x-auto pb-5 pt-2">
                <div className="relative flex min-w-max items-center gap-3 px-2 py-4">
                  <div className="absolute left-4 right-4 top-1/2 h-px bg-ink/15" />
                  {plan.phases.map((phase, index) => {
                    const before = plan.phases.slice(0, index).reduce((s, p) => s + Number(p.minutes || 0), 0);
                    const active = phase.id === selected?.id;
                    const isEntry = index === 0;
                    const dragging = phase.id === draggedId;
                    return (
                      <div
                        key={phase.id}
                        data-phase-id={phase.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", phase.id);
                          setDraggedId(phase.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          reorderPhases(event.dataTransfer.getData("text/plain"), phase.id);
                          setDraggedId(null);
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        className={`relative z-10 overflow-hidden rounded-[2rem] border bg-white text-left transition duration-300 ${isEntry ? "min-h-64 w-72" : "min-h-56 w-60"} ${active ? "scale-[1.025] shadow-soft" : "border-ink/10 hover:-translate-y-1 hover:shadow-soft"} ${dragging ? "opacity-35" : "opacity-100"}`}
                        style={active ? { borderColor: phase.color, boxShadow: `0 18px 45px ${phase.color}22` } : undefined}
                      >
                        <div className={`flex min-h-[inherit] w-full flex-col justify-between text-left ${isEntry ? "p-5" : "p-4"}`} onClick={() => setSelectedId(phase.id)}>
                          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] rounded-tr-[2rem] opacity-90" style={{ background: phase.color }} />
                          <div className="relative">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.15em] text-ink/45"><GripVertical size={12} />Phase {index + 1}</span>
                            <input
                              aria-label={`Titel von Phase ${index + 1}`}
                              className={`mt-3 w-[calc(100%-2.25rem)] border-0 bg-transparent p-0 font-display font-bold leading-tight outline-none placeholder:text-ink/25 ${isEntry ? "text-2xl" : "text-xl"}`}
                              placeholder="Titel der Phase"
                              value={phase.title}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(phase.id);
                              }}
                              onDragStart={(event) => event.preventDefault()}
                              onChange={(event) => updatePhase(phase.id, { title: event.target.value })}
                            />
                            <label className="mt-2 block">
                              <textarea
                                aria-label={`Kurzbeschreibung von Phase ${index + 1}`}
                                rows={2}
                                className="w-full resize-none overflow-hidden rounded-xl border border-ink/10 bg-paper/70 px-3 py-2 text-xs leading-relaxed text-ink/65 outline-none placeholder:text-ink/30 focus:border-moss focus:bg-white focus:text-ink"
                                placeholder="Funktion dieser Phase im Unterrichtsverlauf …"
                                value={phase.shortDescription}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(phase.id);
                                }}
                                onDragStart={(event) => event.preventDefault()}
                                onInput={(event) => resizeTextareaToContent(event.currentTarget)}
                                onChange={(event) => updatePhase(phase.id, { shortDescription: event.target.value })}
                              />
                            </label>
                          </div>
                          <div className="relative mt-4 flex items-end justify-between">
                            <div>
                              <div className="text-[10px] font-semibold text-ink/40">{addMinutes(plan.startTime, before)}–{addMinutes(plan.startTime, before + Number(phase.minutes || 0))}</div>
                              <label className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-xs font-bold shadow-sm">
                                <Clock3 size={13} />
                                <input
                                  aria-label={`Zeit von Phase ${index + 1} in Minuten`}
                                  type="number"
                                  min="1"
                                  max="240"
                                  value={phase.minutes}
                                  className="w-10 border-0 bg-transparent p-0 text-xs font-black outline-none"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedId(phase.id);
                                  }}
                                  onDragStart={(event) => event.preventDefault()}
                                  onChange={(event) => updatePhase(phase.id, { minutes: Math.max(0, Number(event.target.value)) })}
                                />
                                Min
                              </label>
                            </div>
                            <ChevronRight size={18} className={active ? "text-ink" : "text-ink/25"} />
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Phase ${index + 1} löschen`}
                          className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-clay shadow-sm transition hover:bg-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePhase(phase.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    aria-label="Neue Phase am Ende hinzufügen"
                    className="relative z-20 grid h-14 w-14 shrink-0 place-items-center rounded-full border border-moss/25 bg-white text-moss shadow-sm transition hover:-translate-y-0.5 hover:bg-moss hover:text-white focus:outline-none focus:ring-2 focus:ring-moss/25"
                    onClick={addPhase}
                  >
                    <Plus size={24} strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-clay/15 bg-white p-4 shadow-sm sm:grid-cols-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/40">Gesamtdauer</div>
                <div className="mt-1 font-display text-2xl font-bold text-clay">{totalMinutes} Min</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/40">Unterrichtsbeginn</div>
                <div className="mt-1 font-display text-2xl font-bold">{plan.startTime || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/40">Unterrichtsende</div>
                <div className="mt-1 font-display text-2xl font-bold text-moss">{addMinutes(plan.startTime, totalMinutes)}</div>
              </div>
              <p className="text-xs leading-relaxed text-ink/45 sm:col-span-3">Automatisch aus Unterrichtsbeginn und allen Zeitangaben der Phasen berechnet.</p>
            </div>
          </section>

          {selected && (
            <section className={`mt-3 grid gap-5 ${isInServiceMode ? "" : "xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.75fr)]"}`}>
              <div className="card p-5 sm:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-11 w-2 rounded-full" style={{ background: selected.color }} />
                    <div>
                      <div className="label !mb-1">Phase bearbeiten</div>
                      <h3 className="font-display text-2xl font-bold">{selected.title || "Neue Phase"}</h3>
                    </div>
                  </div>
                  <button title="Phase löschen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/35 transition hover:bg-clay/10 hover:text-clay" onClick={() => deletePhase(selected.id)}><Trash2 size={18} /></button>
                </div>
                {showPlanningHelps && (showPhaseGoal || showPhaseActions || showPhaseMethods) && (
                  <details className="help-panel group/phase-help mb-5 text-sm">
                    <summary className="help-panel-summary [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2">
                        <BookOpen size={15} className="help-icon shrink-0" />
                        <span className="truncate">Hilfen zur Phasenplanung</span>
                        <span className="hidden rounded-full border border-[color:var(--help-border)] bg-white/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.12em] help-accent sm:inline-flex">Feinplanung</span>
                      </span>
                      <ChevronDown size={15} className="shrink-0 text-ink/35 transition group-open/phase-help:rotate-180" />
                    </summary>
                    <div className="grid gap-2 border-t border-[color:var(--help-border)] p-3">
                      {showPhaseGoal && renderFieldHelp(planningFieldHelps.learningTasks)}
                      {showPhaseMethods && renderFieldHelp(planningFieldHelps.methodsMedia)}
                      {renderFieldHelp(planningFieldHelps.resultsTransfer)}
                    </div>
                  </details>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label><span className="label">Phasen-Titel</span><input className="field" value={selected.title} onChange={(e) => updatePhase(selected.id, { title: e.target.value })} /></label>
                  <label><span className="label">Zeit in Minuten</span><input className="field" min="1" max="240" type="number" value={selected.minutes} onChange={(e) => updatePhase(selected.id, { minutes: Math.max(0, Number(e.target.value)) })} /></label>
                  <label className="sm:col-span-2"><span className="label">Kurzbeschreibung der Phase</span><textarea className="field min-h-16" placeholder="Welche Funktion hat diese Phase im Unterrichtsverlauf?" value={selected.shortDescription} onChange={(e) => updatePhase(selected.id, { shortDescription: e.target.value })} /></label>
                  {showPhaseGoal && (
                  <label className="sm:col-span-2"><span className="label">Kompetenzorientiertes Teilziel</span><textarea className="field min-h-20" placeholder="Die Lernenden können …" value={selected.goal} onChange={(e) => updatePhase(selected.id, { goal: e.target.value })} /></label>
                  )}
                  <label className="sm:col-span-2"><span className="label">Unterrichtsinhalt</span><textarea className="field min-h-24" placeholder="Was wird in dieser Phase fachlich thematisiert?" value={selected.content} onChange={(e) => updatePhase(selected.id, { content: e.target.value })} /></label>
                  {showPhaseModeration && (
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        className="rounded-full border border-ink/10 bg-paper px-4 py-2 text-xs font-bold text-ink/55 transition hover:border-moss hover:bg-sky/10 hover:text-ink"
                        onClick={() => setServiceMethodsOpen((value) => !value)}
                      >
                        {serviceMethodsOpen ? "Moderationsnotizen ausblenden" : "Moderationsnotizen anzeigen"}
                      </button>
                      {serviceMethodsOpen && (
                      <label className="sm:col-span-2"><span className="label">Moderationsnotizen</span><textarea className="field min-h-28" placeholder="Welche Hinweise, Impulse oder Übergänge möchtest du dir für die Durchführung merken?" value={selected.moderation} onChange={(e) => updatePhase(selected.id, { moderation: e.target.value })} /></label>
                      )}
                    </div>
                  )}
                  {showPhaseActions && (
                    <>
                  <label><span className="label">Lehrhandlung</span><textarea className="field min-h-28" placeholder="Was tut die Lehrkraft? Impulse, Strukturierung, Begleitung …" value={selected.teacherAction} onChange={(e) => updatePhase(selected.id, { teacherAction: e.target.value, moderation: e.target.value })} /></label>
                  <label><span className="label">Lernhandlung</span><textarea className="field min-h-28" placeholder="Was tun die Schülerinnen und Schüler? Denken, handeln, kooperieren …" value={selected.studentAction} onChange={(e) => updatePhase(selected.id, { studentAction: e.target.value })} /></label>
                    </>
                  )}
                  {showPhaseMethods && (
                  <label className="sm:col-span-2"><span className="label">Methoden & Medien</span><textarea className="field min-h-28" placeholder="z. B. Think–Pair–Share, Impulskarte …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
                  )}
                  <div className="sm:col-span-2">
                    <span className="label">Differenzierung</span>
                    <div className="flex flex-wrap gap-2">
                      {(["Ja", "Nein", "Nicht vorgesehen"] as const).map((value) => (
                        <button key={value} onClick={() => updatePhase(selected.id, { differentiation: value })} className={`rounded-full px-4 py-2 text-xs font-bold transition ${selected.differentiation === value ? "bg-ink text-white" : "bg-paper text-ink/55 hover:text-ink"}`}>{value}</button>
                      ))}
                    </div>
                    {selected.differentiation === "Ja" && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-ink/10 bg-paper/60 p-4 sm:grid-cols-2">
                        {([
                          ["up", "upHow", "Nach oben", "z. B. vertiefender Transferauftrag …"],
                          ["down", "downHow", "Nach unten", "z. B. Hilfekarte, Satzstarter …"],
                        ] as const).map(([direction, how, label, placeholder]) => {
                          const active = selected.differentiationDetails[direction];
                          return (
                            <div key={direction} className="rounded-2xl bg-white p-3">
                              <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => updatePhase(selected.id, {
                                  differentiationDetails: {
                                    ...selected.differentiationDetails,
                                    [direction]: !active,
                                  },
                                })}
                                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${active ? "bg-moss text-white" : "bg-paper text-ink/60 hover:text-ink"}`}
                              >
                                <span className={`grid h-5 w-5 place-items-center rounded-md border ${active ? "border-lime bg-lime text-ink" : "border-ink/20"}`}>
                                  {active && <Check size={13} strokeWidth={3} />}
                                </span>
                                {label}
                              </button>
                              {active && (
                                <label className="mt-3 block">
                                  <span className="label">Wie / wodurch?</span>
                                  <textarea
                                    aria-label={`${label}: Wie oder wodurch?`}
                                    className="field min-h-24"
                                    placeholder={placeholder}
                                    value={selected.differentiationDetails[how]}
                                    onChange={(e) => updatePhase(selected.id, {
                                      differentiationDetails: {
                                        ...selected.differentiationDetails,
                                        [how]: e.target.value,
                                      },
                                    })}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showPhaseCompetencies && (
              <div className="card overflow-hidden">
                <button className="flex w-full items-center justify-between p-5 text-left sm:p-7" onClick={() => setMatrixOpen(!matrixOpen)}>
                  <div><div className="label !mb-1">Kompetenzen der Phase</div><h3 className="font-display text-2xl font-bold">Aus der Sachanalyse übernehmen</h3></div>
                  <Grid3X3 size={22} />
                </button>
                {matrixOpen && (
                  <div className="border-t border-ink/10 px-5 pb-6 pt-5 sm:px-7">
                    <p className="mb-4 text-xs leading-relaxed text-ink/50">
                      Hier erscheinen die Kompetenzziele, die du oben im Bereich „Kompetenzbedarf ermitteln“ ausgewählt hast. Hake nur an, was in dieser Phase tatsächlich angebahnt wird.
                    </p>
                    {phaseCompetencyFields.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-ink/15 bg-paper/70 p-4 text-sm leading-relaxed text-ink/50">
                        Noch keine Kompetenzziele aus der Sachanalyse vorhanden. Wähle sie zuerst im Bereich „Kompetenzbedarf ermitteln“ aus.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {phaseCompetencyFields.map((fieldId) => {
                          const parsed = parseCompetencyFieldId(fieldId);
                          const alreadyMarkedInPhase = parsed ? selected.competencies[parsed.area][parsed.dimension] > 0 : false;
                          const active = Object.prototype.hasOwnProperty.call(selected.competencyFocus ?? {}, fieldId) || alreadyMarkedInPhase;
                          const entry = { ...defaultCompetencyNeedEntry(), ...(plan.competencyNeedAnalysis.entries[fieldId] ?? {}) };
                          const level = (plan.competencyNeedAnalysis.selectedLevels[fieldId] ?? [])[0];
                          const isFromSachanalyse = plan.competencyNeedAnalysis.selectedFields.includes(fieldId);
                          const tone = parsed ? competencyAreaTones[parsed.area] : competencyAreaTones.fach;
                          const levelOpacity = competencyLevelOpacity(level);
                          const rememberedGoal = entry.levelGoal.trim();
                          const rememberedClarifications = [...entry.selectedClarifications, entry.customClarification.trim()].filter(Boolean).slice(0, 2);
                          const rememberedConsequences = [...entry.selectedConsequences, entry.customConsequence.trim()].filter(Boolean).slice(0, 2);
                          return (
                            <article
                              key={fieldId}
                              className="rounded-2xl border p-3 transition hover:shadow-sm"
                              style={{
                                borderColor: active ? tone.strong : tone.ring,
                                background: active
                                  ? `rgba(${hexToRgb(tone.mid)}, ${0.38 + levelOpacity * 0.45})`
                                  : `rgba(${hexToRgb(tone.soft)}, ${0.64 + levelOpacity * 0.18})`,
                              }}
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-ink/20 focus:ring-2"
                                  style={{ accentColor: tone.strong }}
                                  checked={active}
                                  onChange={(event) => updatePhaseCompetencyFocus(fieldId, event.target.checked)}
                                />
                                <span className="min-w-0">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black" style={{ color: tone.ink }}>{competencyFieldLabel(fieldId)}</span>
                                    {level && (
                                      <span
                                        className="rounded-full px-2 py-0.5 text-[10px] font-black"
                                        style={{
                                          background: `rgba(${hexToRgb(tone.strong)}, ${0.32 + levelOpacity})`,
                                          color: level >= 3 ? "#fff" : tone.ink,
                                          border: level === 4 ? "1px solid rgba(156, 27, 22, .42)" : "1px solid transparent",
                                        }}
                                      >
                                        Stufe {level}
                                      </span>
                                    )}
                                    {!isFromSachanalyse && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink/40">aus Phase übernommen</span>}
                                  </span>
                                  <span className="mt-1 block text-xs leading-relaxed text-ink/60">
                                    {rememberedGoal || "Noch kein konkretes Ziel in der Sachanalyse formuliert."}
                                  </span>
                                  {(rememberedClarifications.length > 0 || rememberedConsequences.length > 0) && (
                                    <span className="mt-2 grid gap-1 text-[11px] leading-snug text-ink/45">
                                      {rememberedClarifications.length > 0 && (
                                        <span>
                                          <span className="font-black" style={{ color: tone.ink }}>Konkretisierung: </span>
                                          {rememberedClarifications.join(" · ")}
                                        </span>
                                      )}
                                      {rememberedConsequences.length > 0 && (
                                        <span>
                                          <span className="font-black" style={{ color: tone.ink }}>Konsequenz: </span>
                                          {rememberedConsequences.join(" · ")}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </span>
                              </label>
                              {active && (
                                <label className="mt-3 block">
                                  <span className="label">Konkretisierung in dieser Phase</span>
                                  <textarea
                                    className="field min-h-20 bg-white"
                                    value={selected.competencyFocus?.[fieldId] ?? ""}
                                    onChange={(event) => updatePhaseCompetencyFocus(fieldId, true, event.target.value)}
                                    placeholder="Wie wird diese Kompetenz in dieser Phase konkret angebahnt?"
                                  />
                                </label>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </section>
          )}

          {showObservationTask && (
            <div id="section-observation" className="scroll-mt-36">
            <ObservationTaskPanel
              enabled={plan.observationEnabled}
              task={plan.observationTask}
              onEnabledChange={(value) => updatePlan("observationEnabled", value)}
              onTaskChange={(value) => updatePlan("observationTask", value)}
            />
            </div>
          )}

          {showCompetencyProfile && (
          <details id="section-competency-profile" className="group scroll-mt-36 mb-8 mt-8 overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-paper/60 sm:px-7 [&::-webkit-details-marker]:hidden">
              <div>
                <div className="label">Kompetenzprofil</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Handlungskompetenzmatrix</h2>
                <p className="mt-1 text-xs text-ink/45">Handlungskompetenzmatrix nach Prof. Dr. Manfred Müller</p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/40 transition group-open:rotate-180 group-open:bg-sky/15 group-open:text-moss">
                <ChevronDown size={19} />
              </span>
            </summary>
            <div className="grid gap-4 border-t border-ink/10 bg-paper/25 p-4 sm:p-5 lg:p-6">
              <CompetencyProfileTargetSummary plan={plan} />
              <details className="group/landscape overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <div className="text-sm font-black text-ink">Gesamtbild der Handlungskompetenzmatrix anzeigen</div>
                    <div className="text-xs text-ink/45">Optionale Übersicht mit Phasenpunkten und Niveaustufen.</div>
                  </div>
                  <ChevronDown size={17} className="text-ink/35 transition group-open/landscape:rotate-180" />
                </summary>
                <div className="border-t border-ink/10 p-2 sm:p-3">
                  <CompetencyLandscape phases={plan.phases} />
                </div>
              </details>
            </div>
          </details>
          )}

          <section className="mb-8 mt-8 rounded-[2rem] border border-clay/15 bg-white p-5 text-center shadow-soft sm:p-7">
            <div className="mx-auto max-w-2xl">
              <div className="label text-clay">Planung fertig?</div>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">Unterrichtsplanung abschließen</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/50">
                Erzeuge jetzt den PDF-Export deiner Planung für dich selbst, Hospitierende, Seminarlehrkräfte oder Dozierende.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center gap-3 rounded-full bg-clay px-6 py-3 text-sm font-black text-white shadow-soft transition hover:bg-clay/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/30 focus-visible:ring-offset-2 sm:text-base"
                onClick={() => window.print()}
              >
                <FileDown size={19} />
                Planung abschließen und als PDF ausgeben
              </button>
            </div>
          </section>
            </div>
          </div>
        </main>
        <footer className="border-t border-ink/10 bg-white px-4 py-6 text-ink sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-moss">Seminar Metalltechnik · UVP Studio</span>
            <span className="max-w-4xl text-ink/45">{APP_FOOTER_TEXT}</span>
          </div>
        </footer>
      </div>
      {criteriaOpen && (
        <ExamCriteriaModal
          checked={plan.criteriaChecks}
          onClose={() => setCriteriaOpen(false)}
          onToggle={(id) => updatePlan("criteriaChecks", { ...plan.criteriaChecks, [id]: !plan.criteriaChecks[id] })}
          onReset={() => updatePlan("criteriaChecks", {})}
        />
      )}
      {verbCatalogOpen && (
        <VerbCatalogModal
          initialDimension={verbCatalogOpen}
          onClose={() => setVerbCatalogOpen(null)}
        />
      )}
      {usmOpen && (
        <UsmModal
          activeId={activeUsmItem}
          onSelect={setActiveUsmItem}
          onNavigate={navigateModelStep}
          onClose={() => {
            setUsmOpen(false);
            setActiveUsmItem(null);
          }}
        />
      )}
      {competenceModelOpen && (
        <CompetenceModelModal
          activeKey={activeCompetenceItem}
          onSelect={setActiveCompetenceItem}
          onNavigate={navigateModelStep}
          onClose={() => {
            setCompetenceModelOpen(false);
            setActiveCompetenceItem(null);
          }}
        />
      )}
      {hkmOpen && (
        <HkmModelModal onNavigate={navigateModelStep} onClose={() => setHkmOpen(false)} />
      )}
      {aboutOpen && (
        <AboutModal onClose={() => setAboutOpen(false)} />
      )}
      {welcomeOpen && (
        <OnboardingWelcome
          onStart={startOnboardingTour}
          onLater={deferOnboarding}
          onSkip={skipOnboarding}
        />
      )}
      {tourActive && (
        <OnboardingTour
          steps={tourSteps}
          index={tourIndex}
          targetRect={tourRect}
          onBack={() => setTourIndex((value) => Math.max(0, value - 1))}
          onNext={() => {
            if (tourIndex >= tourSteps.length - 1) completeOnboarding();
            else setTourIndex((value) => Math.min(tourSteps.length - 1, value + 1));
          }}
          onSkip={skipOnboarding}
          onComplete={completeOnboarding}
        />
      )}
      <PrintDocument plan={plan} totalMinutes={totalMinutes} />
    </>
  );
}

function OnboardingWelcome({
  onStart,
  onLater,
  onSkip,
}: {
  onStart: () => void;
  onLater: () => void;
  onSkip: () => void;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startRef.current?.focus();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
    >
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-soft">
        <div className="bg-white px-6 pb-5 pt-7 text-center sm:px-8">
          <img src={SEMINAR_LOGO} alt="Seminar Metalltechnik" className="mx-auto h-20 w-auto max-w-[280px] object-contain" />
          <div className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-moss">App entdecken</div>
          <h2 id="onboarding-welcome-title" className="sr-only">Willkommen im UVP Studio</h2>
          <img
            src={UVP_STUDIO_LOGO}
            alt="UVP Studio – Analysieren, Planen, Reflektieren"
            className="mx-auto mt-2 h-auto w-full max-w-[430px] object-contain"
          />
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            Das UVP Studio unterstützt dich dabei, kompetenzorientierten Unterricht strukturiert zu analysieren, zu planen und als Unterrichtsverlauf auszuarbeiten. Der Umfang passt sich deinem Planungsstand an – vom Studium bis zum schnellen Einsatz im Schuldienst.
          </p>
        </div>
        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 sm:px-8">
          {[
            ["Für wen?", "Für Studierende mit wenig Erfahrung in der Unterrichtsentwicklung, Referendarinnen und Referendare sowie Lehrkräfte im Dienst, die sich ein übersichtliches und einfaches Planungstool wünschen."],
            ["Was bietet die App?", "Rahmenbedingungen, kompetenzorientierte Sachanalyse, Lernsituation, Inhaltsstrukturierung, Unterrichtsphasen, Reflexionshilfen und PDF-Export in einem ruhigen Arbeitsfluss."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-ink/10 bg-paper/70 p-4 text-center">
              <h3 className="text-sm font-black text-ink">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/55">{body}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 border-t border-ink/10 px-6 py-5 text-center sm:flex-row sm:px-8">
          <button type="button" className="rounded-full px-4 py-2 text-sm font-bold text-ink/45 transition hover:bg-paper hover:text-ink" onClick={onSkip}>
            Nicht erneut automatisch anzeigen
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="rounded-full border border-ink/10 bg-white px-5 py-2.5 text-sm font-bold text-ink/60 transition hover:bg-paper" onClick={onLater}>
              Später
            </button>
            <button ref={startRef} type="button" className="rounded-full bg-moss px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-moss/90 focus:outline-none focus:ring-2 focus:ring-moss/30" onClick={onStart}>
              App entdecken
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function OnboardingTour({
  steps,
  index,
  targetRect,
  onBack,
  onNext,
  onSkip,
  onComplete,
}: {
  steps: TourStep[];
  index: number;
  targetRect: DOMRect | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const current = steps[index] ?? steps[0];
  const titleId = `tour-step-title-${current?.id ?? "unknown"}`;
  const descId = `tour-step-desc-${current?.id ?? "unknown"}`;
  const nextRef = useRef<HTMLButtonElement>(null);
  const [planningPreview, setPlanningPreview] = useState<"frames" | "mindmap" | "uvp">("frames");
  useEffect(() => {
    nextRef.current?.focus();
    setPlanningPreview("frames");
  }, [index]);
  if (!current) return null;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 14;
  const rect = targetRect
    ? {
      left: Math.max(10, Math.min(viewportWidth - 24, targetRect.left - pad)),
      top: Math.max(10, Math.min(viewportHeight - 24, targetRect.top - pad)),
      right: Math.max(24, Math.min(viewportWidth - 10, targetRect.right + pad)),
      bottom: Math.max(24, Math.min(viewportHeight - 10, targetRect.bottom + pad)),
      width: Math.max(1, Math.min(viewportWidth - 20, targetRect.width + pad * 2)),
      height: Math.max(1, Math.min(viewportHeight - 20, targetRect.height + pad * 2)),
    }
    : null;
  const isSmall = viewportWidth < 760;
  const bubbleWidth = Math.min(390, viewportWidth - 32);
  const targetIsCanvas = Boolean(rect && (rect.width > viewportWidth * 0.78 || rect.height > viewportHeight * 0.62));
  const constrainedHeight = (top: number) => Math.max(280, viewportHeight - top - 16);
  const bubbleStyle = (() => {
    if (isSmall) return { left: 16, right: 16, bottom: 16, maxHeight: "calc(100dvh - 32px)" };
    if (!rect || targetIsCanvas) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxHeight: "calc(100dvh - 48px)",
      };
    }
    const spaceRight = viewportWidth - (rect.left + rect.width);
    const spaceLeft = rect.left;
    const besideTop = Math.max(16, Math.min(rect.top, viewportHeight - 360));
    if (spaceRight >= bubbleWidth + 28) {
      return { left: rect.left + rect.width + 18, top: besideTop, maxHeight: constrainedHeight(besideTop) };
    }
    if (spaceLeft >= bubbleWidth + 28) {
      return { left: rect.left - bubbleWidth - 18, top: besideTop, maxHeight: constrainedHeight(besideTop) };
    }
    const below = rect.top + rect.height + 18;
    if (below + 320 < viewportHeight) {
      return {
        left: Math.max(16, Math.min(rect.left, viewportWidth - bubbleWidth - 16)),
        top: below,
        maxHeight: constrainedHeight(below),
      };
    }
    const aboveTop = Math.max(16, Math.min(rect.top - 338, viewportHeight - 360));
    return {
      left: Math.max(16, Math.min(rect.left, viewportWidth - bubbleWidth - 16)),
      top: aboveTop,
      maxHeight: constrainedHeight(aboveTop),
    };
  })();
  const isLast = index >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      {rect && !targetIsCanvas ? (
        <>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <mask id="uvp-tour-spotlight-mask">
                <rect x="0" y="0" width={viewportWidth} height={viewportHeight} fill="white" />
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={Math.max(1, rect.right - rect.left)}
                  height={Math.max(1, rect.bottom - rect.top)}
                  rx="24"
                  ry="24"
                  fill="black"
                />
              </mask>
            </defs>
            <rect x="0" y="0" width={viewportWidth} height={viewportHeight} fill="rgba(12,35,64,0.45)" mask="url(#uvp-tour-spotlight-mask)" />
          </svg>
          <div
            className="pointer-events-none absolute rounded-[1.5rem] border-2 border-white/90 shadow-[0_18px_50px_rgba(12,35,64,0.26)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
            style={{ left: rect.left, top: rect.top, width: Math.max(1, rect.right - rect.left), height: Math.max(1, rect.bottom - rect.top) }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" aria-hidden="true" />
      )}
      <section
        className="pointer-events-auto fixed flex flex-col overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white/95 p-4 text-ink shadow-soft backdrop-blur-xl sm:p-5"
        style={{ width: isSmall ? undefined : bubbleWidth, ...bubbleStyle }}
      >
        <div className="shrink-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-moss">Schritt {index + 1} von {steps.length}</div>
            <button type="button" className="rounded-full px-2 py-1 text-xs font-bold text-ink/45 transition hover:bg-paper hover:text-ink" onClick={onSkip}>
              Tour überspringen
            </button>
          </div>
          <h2 id={titleId} className="font-display text-2xl font-bold">{current.title}</h2>
          <p id={descId} className="mt-2 text-sm leading-relaxed text-ink/60">{current.description}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {current.decisionHelp && (
          <div className="mt-4 grid gap-2 rounded-2xl bg-paper/70 p-3 text-xs leading-relaxed text-ink/60">
            <p><span className="font-black text-ink">Studium:</span> vollständiger Umfang mit Analysen, Modellen, Leitfragen und Formulierungshilfen.</p>
            <p><span className="font-black text-ink">Am Anfang des Referendariats:</span> angeleitet, aber stärker praxisbezogen.</p>
            <p><span className="font-black text-ink">Im fortgeschrittenen Referendariat:</span> kompakter, ohne Hilfebausteine und mit reduzierten Analysen.</p>
            <p><span className="font-black text-ink">Im Dienst:</span> maximale Reduktion für schnelle Unterrichtsplanung.</p>
            <p className="font-semibold text-moss">Wenn du unsicher bist, beginne ausführlicher. Beim Wechsel bleiben Eingaben erhalten.</p>
          </div>
        )}
        {current.planningOverviewHelp && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-paper/70 p-3 text-xs leading-relaxed text-ink/60">
            <p>
              UVP Studio zerlegt Unterrichtsentwicklung in überschaubare Schritte: erst klärst du den Kontext, dann strukturierst du Inhalte und Kompetenzen, anschließend entwickelst du den Unterrichtsverlauf.
            </p>
            <div className="grid gap-2">
              {[
                ["frames", "1. Rahmenbedingungen", "Klasse, Datum und Organisation"],
                ["mindmap", "2. Kompetenzorientierte Sachanalyse", "Inhalte frei als Bubbles anordnen"],
                ["uvp", "3. Unterrichtsphasen / UVP", "Zeit automatisch umlegen"],
              ].map(([key, label, hint]) => {
                const active = planningPreview === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-moss/25 ${active ? "border-moss/30 bg-white text-ink shadow-sm" : "border-ink/10 bg-white/45 text-ink/60 hover:bg-white/75"}`}
                    onClick={() => setPlanningPreview(key as "frames" | "mindmap" | "uvp")}
                  >
                    <span className="block font-black">{label}</span>
                    <span className="mt-0.5 block text-[11px] text-ink/45">{hint}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-3">
              {planningPreview === "frames" && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-moss">Preview · Rahmenbedingungen</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {["Klasse", "Datum", "Beginn", "Lerngruppe"].map((item) => (
                      <div key={item} className="rounded-xl bg-paper/80 px-3 py-2">
                        <div className="text-[9px] font-black uppercase tracking-[.12em] text-ink/35">{item}</div>
                        <div className="mt-1 h-2 rounded-full bg-ink/10" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3">Hier sammelst du die wichtigsten Infos zu Klasse, Datum, Unterrichtsbeginn und organisatorischen Bedingungen.</p>
                </div>
              )}
              {planningPreview === "mindmap" && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-moss">Preview · Inhalts-Mindmap</div>
                  <div className="relative mt-3 h-36 overflow-hidden rounded-2xl border border-dashed border-ink/10 bg-gradient-to-br from-white to-sky/10">
                    <div className="absolute left-5 top-5 rounded-2xl bg-[#f8d9a6] px-4 py-3 text-[11px] font-bold text-ink shadow-sm">Kerninhalt</div>
                    <div className="absolute right-5 top-8 rounded-2xl bg-[#bfe3df] px-4 py-3 text-[11px] font-bold text-ink shadow-sm">Vorwissen</div>
                    <div className="absolute bottom-5 left-20 rounded-2xl bg-[#c8d9f0] px-4 py-3 text-[11px] font-bold text-ink shadow-sm">Vertiefung</div>
                    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                      <path d="M94 56 C130 34 176 44 224 62" fill="none" stroke="#a20d05" strokeOpacity=".18" strokeWidth="2" />
                      <path d="M126 103 C158 88 184 82 220 72" fill="none" stroke="#a20d05" strokeOpacity=".16" strokeWidth="2" />
                    </svg>
                  </div>
                  <p className="mt-3">In der kompetenzorientierten Sachanalyse kannst du Inhalte als Bubbles anordnen, verschieben und strukturieren.</p>
                </div>
              )}
              {planningPreview === "uvp" && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-moss">Preview · UVP-Zeitplanung</div>
                  <div className="mt-3 rounded-2xl border border-ink/10 bg-white p-3">
                    <div className="mb-3 grid grid-cols-[10fr_25fr_10fr] gap-1" aria-label="Beispielhafte Phasenzeiten: 10 Minuten Einstieg, 25 Minuten Erarbeitung, 10 Minuten Schluss">
                      {[
                        ["10 Min", "Einstieg", "#009E73"],
                        ["25 Min", "Erarbeitung", "#E69F00"],
                        ["10 Min", "Schluss", "#0072B2"],
                      ].map(([minutes, label, color], itemIndex) => (
                        <div
                          key={label}
                          className={`flex h-8 min-w-0 items-center justify-center px-1 text-center text-[9px] font-black leading-tight text-white shadow-sm ${itemIndex === 0 ? "rounded-l-full" : ""} ${itemIndex === 2 ? "rounded-r-full" : ""}`}
                          style={{ backgroundColor: color }}
                          title={`${minutes} ${label}`}
                        >
                          <span className="truncate">{minutes}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mb-3 rounded-xl bg-clay/10 px-3 py-2 text-center text-[11px] font-black text-clay">
                      Automatisch berechnet: 45 Minuten Unterrichtszeit
                    </div>
                    <div className="grid gap-2">
                    {[
                      ["08:00–08:10", "Einstieg", "#009E73"],
                      ["08:10–08:35", "Erarbeiten", "#E69F00"],
                      ["08:35–08:45", "Sichern", "#0072B2"],
                    ].map(([time, label, color]) => (
                      <div key={label} className="flex items-center gap-2 rounded-xl bg-paper/80 px-3 py-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="w-20 shrink-0 text-[10px] font-black text-ink/45">{time}</span>
                        <span className="min-w-0 font-bold text-ink">{label}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                  <p className="mt-3">Du trägst nur Minuten pro Phase ein; UVP Studio legt diese automatisch auf die Unterrichtszeit um.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {current.id === "exports" && (
          <div className="mt-4 rounded-2xl border border-ink/10 bg-paper/70 p-3 text-xs leading-relaxed text-ink/60">
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-moss">Preview · PDF-Export</div>
            <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="mx-auto aspect-[1/1.38] w-32 rounded-lg border border-ink/10 bg-white p-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-ink/10 pb-1">
                  <div className="h-2 w-12 rounded-full bg-moss/25" />
                  <div className="h-4 w-4 rounded-full bg-clay/15" />
                </div>
                <div className="mt-2 h-2 w-20 rounded-full bg-ink/20" />
                <div className="mt-1 h-1.5 w-16 rounded-full bg-ink/10" />
                <div className="mt-3 grid gap-1.5">
                  <div className="h-5 rounded bg-sky/10" />
                  <div className="h-5 rounded bg-paper" />
                  <div className="h-5 rounded bg-clay/10" />
                </div>
                <div className="mt-3 h-12 rounded border border-dashed border-ink/10 bg-paper/60" />
              </div>
              <p className="mt-3 text-center text-[11px] font-semibold text-ink/50">Titelseite, Unterrichtsverlauf und Kompetenzprofil werden als übersichtliches PDF ausgegeben.</p>
            </div>
          </div>
        )}
        {current.id === "models" && (
          <div className="mt-4 rounded-2xl border border-ink/10 bg-paper/70 p-3 text-xs leading-relaxed text-ink/60">
            <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="grid gap-2">
                <div className="rounded-2xl border border-moss/15 bg-sky/10 px-3 py-3" aria-label="Abstrakte grafische Vorschau eines Modells">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-9 w-9 rounded-full bg-white shadow-sm" />
                    <span className="h-12 w-12 rounded-full bg-white shadow-sm" />
                    <span className="h-9 w-9 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <div className="relative h-28 overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-br from-white to-sky/10" aria-label="Abstrakte grafische Vorschau eines Dreiecksmodells">
                  <div className="absolute left-1/2 top-4 h-9 w-20 -translate-x-1/2 rounded-full bg-clay/10 shadow-sm" />
                  <div className="absolute bottom-4 left-5 h-9 w-20 rounded-full bg-sky/15 shadow-sm" />
                  <div className="absolute bottom-4 right-5 h-9 w-20 rounded-full bg-sky/15 shadow-sm" />
                  <div className="absolute left-1/2 top-1/2 h-9 w-20 -translate-x-1/2 rounded-full bg-white shadow-sm" />
                  <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <path d="M48 92 L150 18 L252 92 Z" fill="none" stroke="#174a87" strokeOpacity=".18" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-ink/10 bg-white/90 pt-3">
          <button type="button" className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-bold text-ink/55 transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-35" disabled={index === 0} onClick={onBack}>
            Zurück
          </button>
          <button
            ref={nextRef}
            type="button"
            className="rounded-full bg-moss px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-moss/90 focus:outline-none focus:ring-2 focus:ring-moss/30"
            onClick={isLast ? onComplete : onNext}
          >
            {isLast ? "Tour abschließen" : "Weiter"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label">Über UVP Studio</div>
            <h2 id="about-title" className="font-display text-2xl font-bold text-ink">UVP Studio</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">Digitale Unterrichtsplanung für die berufliche Lehrerbildung.</p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/60 transition hover:bg-clay/10 hover:text-clay" onClick={onClose} aria-label="Über UVP Studio schließen">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 rounded-2xl border border-ink/10 bg-paper/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Version</div>
          <div className="mt-1 font-display text-xl font-bold text-moss">Version {APP_VERSION}</div>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink/45">{APP_FOOTER_TEXT}</p>
      </div>
    </div>
  );
}

function RedAccentCurve({ className = "" }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 640 220" aria-hidden="true">
      <path
        d="M18 152C134 18 266 34 396 116C482 170 548 174 622 86"
        fill="none"
        stroke="#9f140c"
        strokeOpacity=".35"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function PlanningAccordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-[1.7rem] border border-ink/10 bg-white shadow-sm [&:not([open])>.accordion-content]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-paper/70 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-xl font-bold text-ink sm:text-2xl">{title}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink/45 transition group-open:rotate-90 group-open:bg-sky/15 group-open:text-moss">
          <ChevronRight size={18} />
        </span>
      </summary>
      <div className="accordion-content border-t border-ink/10 bg-paper/35 p-4 sm:p-5">
        <div className="grid gap-3">{children}</div>
      </div>
    </details>
  );
}

function PlanningSubAccordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group/sub overflow-hidden rounded-[1.35rem] border border-ink/10 bg-white [&:not([open])>.accordion-content]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-bold text-ink">{title}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-paper text-ink/35 transition group-open/sub:rotate-90 group-open/sub:bg-moss group-open/sub:text-white">
          <ChevronRight size={15} />
        </span>
      </summary>
      <div className="accordion-content border-t border-ink/10 p-4">
        {children}
      </div>
    </details>
  );
}

function CompetencyNeedCoach({
  value,
  compact,
  onChange,
}: {
  value: CompetencyNeedAnalysis;
  compact: boolean;
  onChange: (value: CompetencyNeedAnalysis) => void;
}) {
  const orderedSelectedFields = competencyFieldOrder.filter((fieldId) => value.selectedFields.includes(fieldId));
  const [activeFieldId, setActiveFieldId] = useState<CompetencyFieldId | null>(null);
  const focusedFieldId = activeFieldId && orderedSelectedFields.includes(activeFieldId) ? activeFieldId : orderedSelectedFields[0] ?? null;

  useEffect(() => {
    if (orderedSelectedFields.length === 0) {
      if (activeFieldId !== null) setActiveFieldId(null);
      return;
    }
    if (!activeFieldId || !orderedSelectedFields.includes(activeFieldId)) {
      setActiveFieldId(orderedSelectedFields[0]);
    }
  }, [activeFieldId, orderedSelectedFields]);

  const commit = (next: CompetencyNeedAnalysis, refreshSummary = true) => {
    onChange(refreshSummary ? { ...next, summary: buildCompetencyNeedSummary(next) } : next);
  };

  const toggleField = (fieldId: CompetencyFieldId) => {
    const selected = value.selectedFields.includes(fieldId);
    const selectedFields = selected
      ? value.selectedFields.filter((item) => item !== fieldId)
      : competencyFieldOrder.filter((item) => [...value.selectedFields, fieldId].includes(item));
    const entries = selected
      ? Object.fromEntries(Object.entries(value.entries).filter(([key]) => key !== fieldId)) as CompetencyNeedAnalysis["entries"]
      : { ...value.entries, [fieldId]: value.entries[fieldId] ?? defaultCompetencyNeedEntry() };
    const selectedLevels = selected
      ? Object.fromEntries(Object.entries(value.selectedLevels).filter(([key]) => key !== fieldId)) as CompetencyNeedAnalysis["selectedLevels"]
      : value.selectedLevels;
    if (!selected) setActiveFieldId(fieldId);
    commit({ ...value, selectedFields, entries, selectedLevels });
  };

  const updateEntry = (fieldId: CompetencyFieldId, patch: Partial<CompetencyNeedEntry>) => {
    commit({
      ...value,
      entries: {
        ...value.entries,
        [fieldId]: { ...defaultCompetencyNeedEntry(), ...(value.entries[fieldId] ?? {}), ...patch },
      },
    });
  };

  const toggleEntryListItem = (fieldId: CompetencyFieldId, key: "selectedClarifications" | "selectedConsequences", item: string) => {
    const entry = { ...defaultCompetencyNeedEntry(), ...(value.entries[fieldId] ?? {}) };
    const current = entry[key];
    const next = current.includes(item) ? current.filter((existing) => existing !== item) : [...current, item];
    updateEntry(fieldId, { [key]: next });
  };

  const setLevel = (fieldId: CompetencyFieldId, level: number) => {
    commit({ ...value, selectedLevels: { ...value.selectedLevels, [fieldId]: [level] } });
  };

  const focusedParsed = focusedFieldId ? parseCompetencyFieldId(focusedFieldId) : null;
  const focusedEntry = focusedFieldId ? { ...defaultCompetencyNeedEntry(), ...(value.entries[focusedFieldId] ?? {}) } : null;
  const focusedLevel = focusedFieldId ? (value.selectedLevels[focusedFieldId] ?? [])[0] : undefined;
  const focusedClarificationSuggestions = focusedFieldId ? competencyClarificationSuggestions[focusedFieldId] : [];
  const focusedConsequences = focusedParsed ? Array.from(new Set([
    ...dimensionConsequenceSuggestions[focusedParsed.dimension],
    ...areaConsequenceSuggestions[focusedParsed.area],
  ])) : [];

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 rounded-[1.35rem] border border-ink/10 bg-paper/50 p-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="label">Handlungskompetenzmatrix</div>
              <h3 className="font-display text-2xl font-bold text-ink">Wissen · Können · Wollen</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink/45">nach Prof. Dr. Manfred Müller</span>
          </div>
          {!compact && (
            <p className="mb-4 text-sm leading-relaxed text-ink/55">
              Wähle die Kompetenzfelder aus, die aus der beruflichen Anforderung besonders wichtig werden. Die Markierungen in der Matrix dienen später als Grundlage für das Kompetenzprofil.
            </p>
          )}
          <div className="mx-auto max-w-6xl">
            <CompetencyNeedMatrix selectedFields={value.selectedFields} selectedLevels={value.selectedLevels} />
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <div className="mb-3">
            <div className="label">1 · Handlungskompetenzbereich und 2 · Handlungsdimension</div>
            <p className="text-xs leading-relaxed text-ink/50">Wähle zuerst den Kompetenzbereich und darin die passende Handlungsdimension. Die Matrix bleibt dabei vollständig sichtbar.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {areas.map((area) => (
              <section
                key={area.key}
                className="rounded-2xl border p-3"
                style={{
                  background: `linear-gradient(180deg, ${competencyAreaTones[area.key].soft}, rgba(255,255,255,.72))`,
                  borderColor: competencyAreaTones[area.key].ring,
                }}
              >
                <div
                  className="mb-3 rounded-xl bg-white px-3 py-2 font-display text-lg font-bold shadow-sm"
                  style={{ color: competencyAreaTones[area.key].ink }}
                >
                  {area.label}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {dimensions.map((dimension) => {
                    const fieldId = `${area.key}-${dimension.key}` as CompetencyFieldId;
                    const active = value.selectedFields.includes(fieldId);
                    return (
                      <button
                        key={fieldId}
                        type="button"
                        onClick={() => toggleField(fieldId)}
                        className="flex min-h-14 flex-col items-start justify-between rounded-2xl border px-3 py-2 text-left transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                          borderColor: active ? competencyAreaTones[area.key].strong : "rgba(12,35,64,.1)",
                          background: active ? `rgba(${hexToRgb(competencyAreaTones[area.key].mid)}, .8)` : "rgba(255,255,255,.88)",
                          color: active ? competencyAreaTones[area.key].ink : "rgba(12,35,64,.65)",
                          boxShadow: active ? `0 10px 24px rgba(${hexToRgb(competencyAreaTones[area.key].strong)}, .12)` : undefined,
                        }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[.13em] text-ink/40">Dimension</span>
                        <span className="flex w-full items-center justify-between gap-2 text-base font-black">
                          {dimension.label}
                          <span
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                            style={{
                              background: active ? competencyAreaTones[area.key].strong : "rgba(12,35,64,.06)",
                              color: active ? "#fff" : "rgba(12,35,64,.25)",
                            }}
                          >
                            {active ? <Check size={14} /> : <Plus size={14} />}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {orderedSelectedFields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-4 py-5 text-sm text-ink/50">Wähle mindestens ein Feld in der Matrix oder über die Chips aus, um die Kompetenzanalyse zu starten.</div>
      ) : (
        <div className="grid gap-4 rounded-[1.35rem] border border-ink/10 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="label">Gewählte Kompetenzziele</div>
              <p className="text-sm leading-relaxed text-ink/50">
                Bearbeite jeweils ein Ziel im Fokus. Die übrigen Ziele bleiben als kompakte Übersicht sichtbar.
              </p>
            </div>
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-black text-ink/45">{orderedSelectedFields.length} ausgewählt</span>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {orderedSelectedFields.map((fieldId) => {
              const parsed = parseCompetencyFieldId(fieldId);
              const entry = { ...defaultCompetencyNeedEntry(), ...(value.entries[fieldId] ?? {}) };
              const selectedLevel = (value.selectedLevels[fieldId] ?? [])[0];
              const active = focusedFieldId === fieldId;
              const tone = parsed ? competencyAreaTones[parsed.area] : competencyAreaTones.fach;
              return (
                <button
                  key={fieldId}
                  type="button"
                  onClick={() => setActiveFieldId(fieldId)}
                  className="rounded-2xl border px-3 py-3 text-left transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{
                    borderColor: active ? tone.strong : tone.ring,
                    background: active
                      ? `rgba(${hexToRgb(tone.mid)}, ${0.35 + competencyLevelOpacity(selectedLevel) * 0.65})`
                      : `rgba(${hexToRgb(tone.soft)}, ${0.72 + competencyLevelOpacity(selectedLevel) * 0.22})`,
                    boxShadow: active ? `0 12px 28px rgba(${hexToRgb(tone.strong)}, .13)` : undefined,
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black" style={{ color: tone.ink }}>{competencyFieldLabel(fieldId)}</span>
                    {selectedLevel ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{
                          background: `rgba(${hexToRgb(tone.strong)}, ${0.32 + competencyLevelOpacity(selectedLevel)})`,
                          color: selectedLevel >= 3 ? "#fff" : tone.ink,
                        }}
                      >
                        Stufe {selectedLevel}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink/35">Stufe offen</span>
                    )}
                  </span>
                  <span className="mt-2 block text-xs leading-snug text-ink/50">
                    {entry.levelGoal.trim() || (parsed ? `${areas.find((area) => area.key === parsed.area)?.label} · ${dimensions.find((dimension) => dimension.key === parsed.dimension)?.label}` : "Kompetenzfeld")}
                  </span>
                </button>
              );
            })}
          </div>

          {focusedFieldId && focusedParsed && focusedEntry ? (
            <section
              className="grid gap-4 rounded-[1.35rem] border p-4"
              style={{
                borderColor: competencyAreaTones[focusedParsed.area].ring,
                background: `linear-gradient(180deg, rgba(${hexToRgb(competencyAreaTones[focusedParsed.area].soft)}, .75), rgba(255,255,255,.82))`,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: competencyAreaTones[focusedParsed.area].strong }}>Im Fokus bearbeiten</div>
                  <h3 className="mt-1 font-display text-2xl font-bold text-ink">{competencyFieldLabel(focusedFieldId)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/50">Stufe wählen und beschreiben, welche Kompetenz eine Fachkraft zur Bewältigung der beruflichen Anforderung benötigt.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-clay/20 bg-white px-3 py-1.5 text-xs font-bold text-clay transition hover:bg-clay/10"
                  onClick={() => toggleField(focusedFieldId)}
                >
                  Auswahl entfernen
                </button>
              </div>

              <CompetencyFormulationHint area={focusedParsed.area} dimension={focusedParsed.dimension} level={focusedLevel} />

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
                <section className="flex flex-col self-start rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="label">3 · Kompetenzstufe</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                    {[1, 2, 3, 4].map((level) => {
                      const active = focusedLevel === level;
                      const levelOpacity = competencyLevelOpacity(level);
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setLevel(focusedFieldId, level)}
                          className="min-h-12 rounded-2xl border px-3 py-2.5 text-base font-black transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 xl:min-h-[3.35rem] xl:text-base"
                          style={{
                            borderColor: active ? "#4f9d6d" : level === 4 ? "#9c1b16" : `rgba(${hexToRgb(competencyAreaTones[focusedParsed.area].strong)}, .22)`,
                            background: active
                              ? `rgba(${hexToRgb(competencyAreaTones[focusedParsed.area].strong)}, ${0.24 + levelOpacity})`
                              : `rgba(${hexToRgb(competencyAreaTones[focusedParsed.area].strong)}, ${levelOpacity * 0.35})`,
                            color: active && level >= 3 ? "#fff" : competencyAreaTones[focusedParsed.area].ink,
                            boxShadow: active
                              ? "0 0 0 4px rgba(82, 163, 112, .16), 0 10px 22px rgba(82, 163, 112, .16), inset 0 0 0 1px rgba(255,255,255,.38)"
                              : level === 4
                                ? "inset 0 0 0 1px rgba(156, 27, 22, .22)"
                                : undefined,
                          }}
                        >
                          Stufe {level}
                        </button>
                      );
                    })}
                  </div>
                  <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold leading-relaxed ${focusedLevel ? "border-ink/10 bg-paper/50 text-ink/55" : "border-dashed border-ink/15 bg-paper/60 text-ink/45"}`}>
                    {focusedLevel ? levelFocusHints[focusedLevel] : "Erst nach der Stufenwahl erscheinen Kompetenzanforderung und Hinweise zur späteren didaktischen Reduktion."}
                  </p>
                </section>

                <section className="grid self-start content-start gap-3 rounded-2xl border border-ink/10 bg-white p-4">
                  <label className="block">
                    <span className="label">4 · Kompetenzanforderung zur gewählten Stufe</span>
                    <span className="mb-2 block text-sm font-semibold leading-relaxed text-ink/70">Was muss eine Fachkraft auf dieser Kompetenzstufe konkret bewältigen können?</span>
                    <textarea
                      className="field min-h-24 bg-white"
                      value={focusedEntry.levelGoal}
                      onChange={(event) => updateEntry(focusedFieldId, { levelGoal: event.target.value })}
                      placeholder="Eine Fachkraft kann …"
                    />
                  </label>
                  <details className="group/need-extra rounded-2xl border border-ink/10 bg-paper/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-black uppercase tracking-[.12em] text-ink/45 transition hover:bg-white [&::-webkit-details-marker]:hidden">
                      Optionale Vertiefung zur Stufe
                      <ChevronDown size={14} className="transition group-open/need-extra:rotate-180" />
                    </summary>
                    <div className="border-t border-ink/10 p-3">
                      <textarea
                        className="field min-h-16 bg-white"
                        value={focusedEntry.levelDescription}
                        onChange={(event) => updateEntry(focusedFieldId, { levelDescription: event.target.value })}
                        placeholder="Optional: Was bedeutet diese Stufe in deiner konkreten beruflichen Handlungssituation?"
                      />
                    </div>
                  </details>
                </section>
              </div>

              {focusedLevel && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="label">Zusätzliche Konkretisierung</div>
                    <div className="grid gap-2">
                      {focusedClarificationSuggestions.map((suggestion) => (
                        <DiagnosticCheckbox
                          key={suggestion}
                          label={suggestion}
                          checked={focusedEntry.selectedClarifications.includes(suggestion)}
                          onChange={() => toggleEntryListItem(focusedFieldId, "selectedClarifications", suggestion)}
                        />
                      ))}
                    </div>
                    <details className="group/own-clarification mt-3 rounded-2xl border border-ink/10 bg-paper/60">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-black uppercase tracking-[.12em] text-ink/45 transition hover:bg-white [&::-webkit-details-marker]:hidden">
                        Eigene Formulierung ergänzen
                        <ChevronDown size={14} className="transition group-open/own-clarification:rotate-180" />
                      </summary>
                      <div className="border-t border-ink/10 p-3">
                        <textarea
                          className="field min-h-20 bg-white"
                          value={focusedEntry.customClarification}
                          onChange={(event) => updateEntry(focusedFieldId, { customClarification: event.target.value })}
                          placeholder="Welche konkrete Formulierung beschreibt die berufliche Anforderung?"
                        />
                      </div>
                    </details>
                  </section>

                  <section className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="label">5 · Hinweise für die spätere didaktische Reduktion</div>
                    <div className="grid gap-2">
                      {focusedConsequences.map((suggestion) => (
                        <DiagnosticCheckbox
                          key={suggestion}
                          label={suggestion}
                          checked={focusedEntry.selectedConsequences.includes(suggestion)}
                          onChange={() => toggleEntryListItem(focusedFieldId, "selectedConsequences", suggestion)}
                        />
                      ))}
                    </div>
                    <details className="group/own-consequence mt-3 rounded-2xl border border-ink/10 bg-paper/60">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-black uppercase tracking-[.12em] text-ink/45 transition hover:bg-white [&::-webkit-details-marker]:hidden">
                        Eigenen Hinweis ergänzen
                        <ChevronDown size={14} className="transition group-open/own-consequence:rotate-180" />
                      </summary>
                      <div className="border-t border-ink/10 p-3">
                        <textarea
                          className="field min-h-20 bg-white"
                          value={focusedEntry.customConsequence}
                          onChange={(event) => updateEntry(focusedFieldId, { customConsequence: event.target.value })}
                          placeholder="Was sollte später bei der didaktischen Reduktion berücksichtigt werden?"
                        />
                      </div>
                    </details>
                  </section>
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}

      <label className="block rounded-[1.35rem] border border-moss/15 bg-sky/5 p-4">
        <span className="label">Beruflicher Kompetenzbedarf</span>
        <textarea
          className="field min-h-40 bg-white"
          value={value.summary}
          onChange={(event) => commit({ ...value, summary: event.target.value }, false)}
          placeholder="Ausgewählte Kompetenzfelder, Kompetenzanforderungen, Konkretisierungen und Hinweise zur späteren didaktischen Reduktion werden hier automatisch zusammengeführt und bleiben bearbeitbar."
        />
      </label>
    </div>
  );
}

function CompetencyNeedMatrix({
  selectedFields,
  selectedLevels,
}: {
  selectedFields: CompetencyFieldId[];
  selectedLevels: CompetencyNeedAnalysis["selectedLevels"];
}) {
  const cellWidth = 148;
  const cellHeight = 74;
  const columnGap = 16;
  const rowGap = 18;
  const startX = 260;
  const startY = 172;
  const depthX = 78;
  const depthY = 34;
  const levelOffsets = [0, 1, 2, 3];
  const fieldIsSelected = (fieldId: CompetencyFieldId) => selectedFields.includes(fieldId);
  const selectedLevelFor = (fieldId: CompetencyFieldId) => (selectedLevels[fieldId] ?? [])[0];
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-inner sm:p-6">
      <svg viewBox="0 0 940 500" className="mx-auto h-auto w-full max-w-[1120px]" role="img" aria-label="Handlungskompetenzmatrix nach Prof. Dr. Manfred Müller mit markierten Kompetenzfeldern">
        <defs>
          <filter id="competencyNeedSoftShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0c2340" floodOpacity=".08" />
          </filter>
        </defs>

        <rect x="310" y="18" width="340" height="40" rx="10" fill="#fff" stroke="#174a87" strokeOpacity=".25" />
        <text x="480" y="44" textAnchor="middle" fill="#174a87" fontSize="18" fontWeight="850">Handlungsdimensionen</text>
        <rect x="50" y="156" width="30" height="272" rx="8" fill="#fff" stroke="#174a87" strokeOpacity=".22" />
        <text x="69" y="293" transform="rotate(-90 69 293)" textAnchor="middle" fill="#174a87" fontSize="13" fontWeight="850">Handlungskompetenzbereiche</text>

        {/* Hintergrundebene: Kompetenzstufen nach hinten. Diese Ebene bleibt bewusst blass. */}
        {areas.map((area, rowIndex) => {
          const tone = competencyAreaTones[area.key];
          return landscapeDimensions.map((dimension, columnIndex) => {
            const fieldId = `${area.key}-${dimension.key}` as CompetencyFieldId;
            const selected = fieldIsSelected(fieldId);
            const selectedLevel = selectedLevelFor(fieldId);
            const baseX = startX + columnIndex * (cellWidth + columnGap);
            const baseY = startY + rowIndex * (cellHeight + rowGap);
            return (
              <g key={`${fieldId}-depth`}>
                {[4, 3, 2].map((level) => {
                  const offset = level - 1;
                  const levelActive = selected && selectedLevel === level;
                  return (
                    <rect
                      key={level}
                      x={baseX + depthX * (offset / 3)}
                      y={baseY - depthY * (offset / 3)}
                      width={cellWidth}
                      height={cellHeight}
                      rx="10"
                      fill={selected ? tone.strong : "#edf2f7"}
                      fillOpacity={levelActive ? competencyLevelOpacity(level) : selected ? ".12" : ".34"}
                      stroke={levelActive ? tone.strong : "#0c2340"}
                      strokeOpacity={levelActive ? ".42" : ".08"}
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>
            );
          });
        })}

        {/* Vordergrundebene: die neun eigentlichen Kompetenzfelder. */}
        {areas.map((area, rowIndex) => {
          const tone = competencyAreaTones[area.key];
          return (
            <g key={area.key}>
              <rect
                x="104"
                y={startY + rowIndex * (cellHeight + rowGap)}
                width="132"
                height={cellHeight}
                rx="12"
                fill={tone.soft}
                stroke={tone.ring}
                filter="url(#competencyNeedSoftShadow)"
              />
              <text x="170" y={startY + rowIndex * (cellHeight + rowGap) + 39} textAnchor="middle" fill={tone.ink} fontSize="14" fontWeight="850">{area.label}</text>
              {landscapeDimensions.map((dimension, columnIndex) => {
                const fieldId = `${area.key}-${dimension.key}` as CompetencyFieldId;
                const selected = fieldIsSelected(fieldId);
                const selectedLevel = selectedLevelFor(fieldId);
                const baseX = startX + columnIndex * (cellWidth + columnGap);
                const baseY = startY + rowIndex * (cellHeight + rowGap);
                const selectedOpacity = competencyLevelOpacity(selectedLevel);
                return (
                  <g key={fieldId}>
                    <rect
                      x={baseX}
                      y={baseY}
                      width={cellWidth}
                      height={cellHeight}
                      rx="12"
                      fill={selected ? tone.strong : "#ffffff"}
                      fillOpacity={selected ? selectedOpacity : ".92"}
                      stroke={selected ? tone.strong : "#0c2340"}
                      strokeOpacity={selected ? ".75" : ".13"}
                      strokeWidth={selected ? "2" : "1.2"}
                      filter="url(#competencyNeedSoftShadow)"
                    />
                    <text x={baseX + cellWidth / 2} y={baseY + 32} textAnchor="middle" fill={selected && selectedLevel && selectedLevel >= 3 ? "#fff" : tone.ink} fontSize="13" fontWeight="850">
                      {dimension.label}
                    </text>
                    <text x={baseX + cellWidth / 2} y={baseY + 52} textAnchor="middle" fill={selected && selectedLevel && selectedLevel >= 3 ? "#fff" : "#6f7e8f"} fontSize="11" fontWeight="700">
                      {selected ? (selectedLevel ? `Stufe ${selectedLevel}` : "Stufe offen") : "nicht ausgewählt"}
                    </text>
                    {selected && (
                      <circle cx={baseX + cellWidth - 18} cy={baseY + 18} r="8" fill={selectedLevel && selectedLevel >= 3 ? "#fff" : tone.strong} fillOpacity={selectedLevel && selectedLevel >= 3 ? ".95" : ".9"} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Beschriftungsebene: Achsen und Dimensionsköpfe liegen immer ganz oben. */}
        {landscapeDimensions.map((dimension, index) => (
          <g key={dimension.key}>
            <rect x={startX + index * (cellWidth + columnGap)} y="84" width={cellWidth} height="58" rx="11" fill="#fff" stroke="#0c2340" strokeOpacity=".16" filter="url(#competencyNeedSoftShadow)" />
            <text x={startX + index * (cellWidth + columnGap) + cellWidth / 2} y="108" textAnchor="middle" fill="#6f7e8f" fontSize="11" fontWeight="800">{dimension.label.split(":")[0]}</text>
            <text x={startX + index * (cellWidth + columnGap) + cellWidth / 2} y="130" textAnchor="middle" fill="#0c2340" fontSize="20" fontWeight="900">{dimension.label.split(": ")[1]}</text>
          </g>
        ))}

        {[1, 2, 3, 4].map((level, index) => (
          <g key={level}>
            <rect
              x={710 + index * 38}
              y={430 - index * 13}
              width="30"
              height="34"
              rx="7"
              fill="#fff"
              stroke="#0c2340"
              strokeOpacity=".2"
              filter="url(#competencyNeedSoftShadow)"
            />
            <text x={725 + index * 38} y={452 - index * 13} textAnchor="middle" fill="#0c2340" fontSize="15" fontWeight="850">{level}</text>
          </g>
        ))}
        <text x="794" y="486" textAnchor="middle" fill="#174a87" fontSize="14" fontWeight="850">Kompetenzstufen</text>
      </svg>
    </div>
  );
}

function LearningPrerequisitesCoach({
  value,
  onChange,
}: {
  value: Plan["learningPrerequisites"];
  onChange: (value: Plan["learningPrerequisites"]) => void;
}) {
  const allSelectedFactors = [...value.groupFactors, ...value.specialFactors].filter((factor) => factor !== "other");
  const activeSuggestionFactors = allSelectedFactors.filter((factor) => consequenceSuggestions[factor]?.length);

  const commit = (next: Plan["learningPrerequisites"], refreshSummary = true) => {
    onChange(refreshSummary ? { ...next, consequences: buildPrerequisiteConsequencesSummary(next) } : next);
  };

  const toggleFactor = (field: "groupFactors" | "specialFactors", factor: string) => {
    const selected = value[field].includes(factor);
    const nextFactors = selected ? value[field].filter((item) => item !== factor) : [...value[field], factor];
    const nextSelectedConsequences = selected
      ? Object.fromEntries(Object.entries(value.selectedConsequences).filter(([key]) => key !== factor))
      : value.selectedConsequences;
    const nextCustomConsequences = selected
      ? Object.fromEntries(Object.entries(value.customConsequences).filter(([key]) => key !== factor))
      : value.customConsequences;
    commit({
      ...value,
      [field]: nextFactors,
      selectedConsequences: nextSelectedConsequences,
      customConsequences: nextCustomConsequences,
      ...(factor === "other" && selected && field === "groupFactors" ? { groupOther: "" } : {}),
      ...(factor === "other" && selected && field === "specialFactors" ? { specialOther: "" } : {}),
    });
  };

  const toggleConsequence = (factor: string, suggestion: string) => {
    const current = value.selectedConsequences[factor] ?? [];
    const next = current.includes(suggestion) ? current.filter((item) => item !== suggestion) : [...current, suggestion];
    commit({
      ...value,
      selectedConsequences: {
        ...value.selectedConsequences,
        [factor]: next,
      },
    });
  };

  const updateCustomConsequence = (factor: string, text: string) => {
    commit({
      ...value,
      customConsequences: {
        ...value.customConsequences,
        [factor]: text,
      },
    });
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.35rem] border border-ink/10 bg-white p-4">
        <label className="block">
          <span className="label">1 · Vorwissen</span>
          <span className="mb-2 block text-sm font-semibold text-ink/70">Welches Vorwissen bringen die Lernenden bereits mit?</span>
          <textarea
            className="field min-h-24"
            value={value.priorKnowledge}
            onChange={(event) => commit({ ...value, priorKnowledge: event.target.value }, false)}
            placeholder="Fachliche Erfahrungen, bekannte Begriffe, bisherige Lernfelder, betriebliche Vorerfahrungen …"
          />
        </label>
      </section>

      <section className="rounded-[1.35rem] border border-ink/10 bg-white p-4">
        <div className="label">2 · Lerngruppe analysieren</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {learnerGroupFactors.map((option) => (
            <DiagnosticCheckbox
              key={option.key}
              label={option.label}
              checked={value.groupFactors.includes(option.key)}
              onChange={() => toggleFactor("groupFactors", option.key)}
            />
          ))}
        </div>
        {value.groupFactors.includes("other") && (
          <label className="mt-3 block">
            <span className="label">Sonstiges zur Lerngruppe</span>
            <input className="field" value={value.groupOther} onChange={(event) => commit({ ...value, groupOther: event.target.value })} placeholder="Weitere Besonderheiten der Lerngruppe …" />
          </label>
        )}
      </section>

      <section className="rounded-[1.35rem] border border-ink/10 bg-white p-4">
        <div className="label">3 · Besondere Voraussetzungen</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {specialPrerequisiteFactors.map((option) => (
            <DiagnosticCheckbox
              key={option.key}
              label={option.label}
              checked={value.specialFactors.includes(option.key)}
              onChange={() => toggleFactor("specialFactors", option.key)}
            />
          ))}
        </div>
        {value.specialFactors.includes("other") && (
          <label className="mt-3 block">
            <span className="label">Sonstige besondere Voraussetzungen</span>
            <input className="field" value={value.specialOther} onChange={(event) => commit({ ...value, specialOther: event.target.value })} placeholder="Weitere besondere Voraussetzungen …" />
          </label>
        )}
      </section>

      <section className="rounded-[1.35rem] border border-moss/15 bg-sky/5 p-4">
        <div className="label">4 · Didaktische Konsequenzen</div>
        <p className="mb-4 text-sm leading-relaxed text-ink/55">UVP Studio schlägt passend zu deinen ausgewählten Voraussetzungen mögliche Planungsentscheidungen vor. Wähle nur aus, was für deine Stunde wirklich sinnvoll ist.</p>
        {activeSuggestionFactors.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/50">Wähle oben Merkmale der Lerngruppe oder besondere Voraussetzungen aus, um passende didaktische Vorschläge zu erhalten.</div>
        ) : (
          <div className="grid gap-3">
            {activeSuggestionFactors.map((factor) => {
              const label = [...learnerGroupFactors, ...specialPrerequisiteFactors].find((option) => option.key === factor)?.label ?? factor;
              return (
                <div key={factor} className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-3 font-display text-lg font-bold text-ink">{label}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {consequenceSuggestions[factor].map((suggestion) => (
                      <DiagnosticCheckbox
                        key={suggestion}
                        label={suggestion}
                        checked={(value.selectedConsequences[factor] ?? []).includes(suggestion)}
                        onChange={() => toggleConsequence(factor, suggestion)}
                      />
                    ))}
                  </div>
                  <label className="mt-3 block">
                    <span className="label">Eigene Konsequenzen ergänzen</span>
                    <textarea
                      className="field min-h-20"
                      value={value.customConsequences[factor] ?? ""}
                      onChange={(event) => updateCustomConsequence(factor, event.target.value)}
                      placeholder="Welche zusätzliche Konsequenz ergibt sich für deine konkrete Lerngruppe?"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
        <label className="mt-5 block rounded-2xl border border-ink/10 bg-white p-4">
          <span className="label">Konsequenzen für die Unterrichtsplanung</span>
          <textarea
            className="field min-h-32 bg-paper/50"
            value={value.consequences}
            onChange={(event) => commit({ ...value, consequences: event.target.value }, false)}
            placeholder="Ausgewählte und ergänzte Konsequenzen werden hier automatisch zusammengeführt und können anschließend bearbeitet werden."
          />
        </label>
      </section>
    </div>
  );
}

function DiagnosticCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${checked ? "border-moss/25 bg-sky/15 text-ink" : "border-ink/10 bg-paper/60 text-ink/65 hover:border-moss/30 hover:bg-white"}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink/20 accent-[#0c2340]" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

type PlanningOverviewItem = {
  id: string;
  label: string;
  hasContent: boolean;
  group?: boolean;
  level?: 0 | 1;
  parentId?: string;
};

function PlanningOverview({
  items,
  activeId,
  open,
  onSelect,
}: {
  items: PlanningOverviewItem[];
  activeId: string;
  open: boolean;
  onSelect: (id: string) => void;
}) {
  let groupIndex = 0;
  return (
    <aside className={`${open ? "block" : "hidden"} xl:block`}>
      <div data-tour-id="planning-overview" className="sticky top-40 rounded-[1.75rem] border border-ink/10 bg-white/90 p-3 shadow-soft backdrop-blur">
        <div className="px-2 pb-2">
          <div className="label !mb-1">Planungsübersicht</div>
          <p className="text-[11px] leading-relaxed text-ink/40">Springt zu den zentralen Abschnitten, ohne Eingaben zu verändern.</p>
        </div>
        <nav className="grid gap-1" aria-label="Planungsübersicht">
          {items.map((item) => {
            const isGroup = Boolean(item.group);
            const childActive = isGroup && items.some((child) => child.parentId === item.id && child.id === activeId);
            const active = item.id === activeId || childActive;
            const currentGroupIndex = isGroup ? ++groupIndex : groupIndex;
            return (
              <button
                key={item.id}
                type="button"
                className={`flex items-center gap-2 text-left transition focus:outline-none focus:ring-2 focus:ring-moss/30 ${
                  isGroup
                    ? `rounded-2xl px-3 py-2.5 text-xs font-black ${active ? "bg-moss text-white shadow-sm" : "text-ink/70 hover:bg-sky/10 hover:text-ink"}`
                    : `ml-5 rounded-xl border-l border-ink/10 px-3 py-2 text-[11px] font-bold ${item.id === activeId ? "bg-moss/10 text-moss" : "text-ink/48 hover:bg-sky/10 hover:text-ink/70"}`
                }`}
                onClick={() => onSelect(item.id)}
              >
                <span className={`grid shrink-0 place-items-center rounded-full ${
                  isGroup
                    ? `h-5 w-5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-paper text-ink/35"}`
                    : `h-2 w-2 ${item.id === activeId ? "bg-moss" : "bg-ink/15"}`
                }`}>
                  {isGroup ? currentGroupIndex : ""}
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${item.hasContent ? isGroup && active ? "bg-lime" : "bg-moss/45" : isGroup && active ? "bg-white/35" : "bg-ink/10"}`} aria-label={item.hasContent ? "Inhalt vorhanden" : "noch leer"} />
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function ProfessionalRequirementReference({ value, onEdit }: { value: string; onEdit: () => void }) {
  const text = value.trim();
  return (
    <aside className="help-panel mb-4 p-4 text-sm leading-relaxed">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label !mb-1 help-accent">Ausgangspunkt: berufliche Anforderung</div>
          {text ? (
            <p className="whitespace-pre-wrap text-ink/70">{text}</p>
          ) : (
            <p className="text-ink/40">Formuliere zunächst die berufliche Anforderung im vorherigen Planungsbereich.</p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-[color:var(--help-border)] bg-white px-3 py-2 text-xs font-bold help-accent transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/20"
          onClick={onEdit}
        >
          Berufliche Anforderung bearbeiten
        </button>
      </div>
    </aside>
  );
}

function OptionalContentBubblePanel({
  hasContent,
  bubbles,
  connections,
  onAdd,
  onUpdate,
  onDelete,
  onConnect,
  onDeleteConnection,
}: {
  hasContent: boolean;
  bubbles: ContentBubble[];
  connections: ContentConnection[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ContentBubble>) => void;
  onDelete: (id: string) => void;
  onConnect: (fromId: string, toId: string, fromSide?: BubbleSide, toSide?: BubbleSide) => void;
  onDeleteConnection: (id: string) => void;
}) {
  return (
    <details className="group/optional-content overflow-hidden rounded-2xl border border-ink/10 bg-white/80 shadow-sm" open={hasContent || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="text-sm font-black text-ink">Inhaltsmindmap mit Inhaltskarten optional</div>
          <div className="text-xs leading-relaxed text-ink/45">
            Freiwillige Vertiefung für die Inhaltsstrukturierung. {hasContent ? "Inhalte vorhanden." : "Standardmäßig zurückhaltend ausgeblendet."}
          </div>
        </div>
        <ChevronDown size={16} className="shrink-0 text-ink/35 transition group-open/optional-content:rotate-180" />
      </summary>
      <div className="border-t border-ink/10 p-4">
        <ContentBubbleBoard
          bubbles={bubbles}
          connections={connections}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onConnect={onConnect}
          onDeleteConnection={onDeleteConnection}
        />
      </div>
    </details>
  );
}

function MenuDropdown({ label, children, tourId, forceOpen = false }: { label: string; children: ReactNode; tourId?: TourTargetId; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const visible = open || forceOpen;

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    if (!visible) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (forceOpen) return;
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (forceOpen) return;
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [forceOpen, visible]);

  return (
    <div ref={rootRef} className={`relative ${forceOpen ? "z-[95]" : ""}`} onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition focus:outline-none ${visible ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:bg-white hover:text-ink"}`}
        aria-haspopup="menu"
        aria-expanded={visible}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      <div
        data-tour-id={tourId}
        className={`absolute left-0 top-[calc(100%+.5rem)] z-50 min-w-[260px] rounded-[1.25rem] border border-ink/10 bg-white p-2 shadow-soft transition ${visible ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div className="grid gap-1" role="menu" aria-label={label}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MenuItemButton({
  children,
  icon,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${tone === "danger" ? "text-clay hover:bg-clay/10" : "text-ink/70 hover:bg-paper hover:text-ink"}`}
      onClick={onClick}
    >
      {icon && <span className="grid h-5 w-5 place-items-center text-current">{icon}</span>}
      <span className="flex flex-1 items-center gap-2">{children}</span>
    </button>
  );
}

function MenuInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">{label}</div>
      <div className="mt-1 text-sm font-bold text-moss">{value}</div>
    </div>
  );
}

function MenuComingSoon({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl px-3 py-2 text-sm font-semibold text-ink/35">
      {children}
    </div>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-ink/10" aria-hidden="true" />;
}

function ObservationTaskPanel({
  enabled,
  task,
  onEnabledChange,
  onTaskChange,
}: {
  enabled: boolean;
  task: string;
  onEnabledChange: (value: boolean) => void;
  onTaskChange: (value: string) => void;
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label">Nach dem Unterrichtsverlaufplan</div>
          <p className="mt-1 text-sm leading-relaxed text-ink/50">Optionaler Fokus für Hospitation, Zielgespräch oder Unterrichtsnachbesprechung.</p>
        </div>
        <div className="flex rounded-full bg-ink/5 p-1" aria-label="Beobachtungsauftrag auswählen">
          <button
            type="button"
            aria-pressed={enabled}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${enabled ? "bg-clay text-white" : "text-ink/45 hover:text-ink"}`}
            onClick={() => onEnabledChange(true)}
          >
            Ja
          </button>
          <button
            type="button"
            aria-pressed={!enabled}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${!enabled ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink"}`}
            onClick={() => onEnabledChange(false)}
          >
            Nein
          </button>
        </div>
      </div>
      {enabled && (
        <label className="mt-5 block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Beobachtungsauftrag formulieren</span>
          <textarea
            aria-label="Beobachtungsauftrag formulieren"
            className="min-h-24 w-full rounded-xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss"
            placeholder="Beobachtet bitte besonders, wie …"
            value={task}
            onChange={(event) => onTaskChange(event.target.value)}
          />
        </label>
      )}
    </section>
  );
}

function TeachingStructureModel({ activeId, onSelect }: { activeId: number | null; onSelect: (id: number | null) => void }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const itemById = new Map<number, (typeof USM_ITEMS)[number]>(USM_ITEMS.map((item) => [item.id, item]));
  const activeItem = activeId ? itemById.get(activeId) : null;
  const toneColors: Record<string, { fill: string; hoverFill: string; activeFill: string; stroke: string; text: string; ring: string }> = {
    foundation: { fill: "#e8f1f3", hoverFill: "#dfecef", activeFill: "#d1e4e9", stroke: "#416f7a", text: "#173f49", ring: "#8fb1b9" },
    communication: { fill: "#f8e5df", hoverFill: "#f3d8cf", activeFill: "#edc6bb", stroke: "#a85a46", text: "#7b3426", ring: "#c98d7e" },
    planning: { fill: "#edf4fb", hoverFill: "#e1edf8", activeFill: "#d4e5f4", stroke: "#2f6395", text: "#153e65", ring: "#7fa5c8" },
    success: { fill: "#e8f3ec", hoverFill: "#dcebe3", activeFill: "#cde2d5", stroke: "#3e7a58", text: "#25523b", ring: "#87b59a" },
    maturity: { fill: "#f5e4f0", hoverFill: "#efd5e8", activeFill: "#e8c6df", stroke: "#9c4f83", text: "#6d2e59", ring: "#c58caf" },
  };
  const activate = (id: number) => onSelect(activeId === id ? null : id);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)] xl:items-start">
      <div className="rounded-[2rem] border border-ink/10 bg-white/85 p-3 shadow-sm sm:p-5">
        <div className="rounded-[1.6rem] bg-gradient-to-br from-paper via-white to-sky/10 p-4 sm:p-6">
          <svg className="block h-auto w-full" viewBox="0 0 980 680" role="img" aria-label="Interaktives Unterrichtsstrukturmodell">
            <defs>
              <linearGradient id="usm-arrangement" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
                <stop offset="100%" stopColor="#d8e7f7" stopOpacity=".72" />
              </linearGradient>
              <filter id="usm-soft-shadow" x="-20%" y="-20%" width="140%" height="160%">
                <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#0c2340" floodOpacity=".12" />
              </filter>
              <filter id="usm-node-shadow" x="-35%" y="-35%" width="170%" height="190%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0c2340" floodOpacity=".12" />
              </filter>
            </defs>

            <text x="28" y="40" fill="#0c2340" fontSize="19" fontWeight="900">Schulorganisation und -klima</text>
            <text x="930" y="470" fill="#0c2340" fontSize="14" fontWeight="800" opacity=".4" transform="rotate(-90 930 470)">Unterrichtsorganisation und -klima</text>
            <text x="78" y="628" fill="#0c2340" fontSize="20" fontWeight="900" opacity=".72">Pädagogisch-didaktisches Dreieck</text>
            <text x="700" y="218" fill="#0c2340" fontSize="18" fontWeight="900" opacity=".7">Didaktisches Siebeneck</text>

            <path d="M505 68 L894 616 L112 616 Z" fill="rgba(255,255,255,.54)" stroke="#416f7a" strokeOpacity=".24" strokeWidth="2.2" />
            <path d="M505 68 L505 616" fill="none" stroke="#416f7a" strokeOpacity=".1" strokeWidth="1.5" />
            <path d="M505 68 C486 245 486 435 505 616" fill="none" stroke="#416f7a" strokeOpacity=".13" strokeDasharray="5 8" strokeWidth="1.5" />
            <path d="M240 574 L505 506 L770 574 Z" fill="#e8f1f3" fillOpacity=".22" stroke="#416f7a" strokeOpacity=".38" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M240 574 L505 506 M505 506 L770 574 M240 574 L770 574" fill="none" stroke="#416f7a" strokeOpacity=".2" strokeWidth="1.6" />

            <path d="M240 600 C365 520 507 505 770 600 L894 616 L112 616 Z" fill="#0c2340" fillOpacity=".045" />
            <path d="M320 566 C415 518 548 512 682 566" fill="none" stroke="#a85a46" strokeOpacity=".2" strokeWidth="8" strokeLinecap="round" />
            <path d="M332 552 C420 514 548 508 668 550" fill="none" stroke="#416f7a" strokeOpacity=".1" strokeWidth="2" strokeDasharray="5 7" />

            <path d="M312 354 C424 312 562 310 704 354 L762 404 C592 460 410 460 252 404 Z" fill="url(#usm-arrangement)" stroke="#174a87" strokeOpacity=".18" filter="url(#usm-soft-shadow)" />
            <path d="M304 352 L412 410 L574 414 L704 352" fill="none" stroke="#2f6395" strokeOpacity=".24" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

            {USM_ITEMS.map((item) => {
              const color = toneColors[item.tone] ?? toneColors.ink;
              const focused = item.id === activeId;
              const hovered = item.id === hoveredId;
              const width = item.id === 1 ? 190 : item.id === 2 ? 182 : item.id === 10 ? 186 : item.id === 14 ? 162 : item.id === 3 ? 170 : 136;
              const height = item.id === 1 ? 62 : item.id === 2 ? 58 : item.id === 10 ? 54 : item.id === 14 ? 54 : 48;
              const x = item.x * 9.8 - width / 2;
              const y = item.y * 6.8 - height / 2;
              return (
                <g
                  key={item.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={focused}
                  aria-label={`${item.title} erläutern`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(item.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => activate(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      activate(item.id);
                    }
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={item.id === 10 || item.id === 14 ? 24 : item.id === 1 || item.id === 2 ? 24 : 20}
                    fill={focused ? color.activeFill : hovered ? color.hoverFill : color.fill}
                    stroke={focused ? color.stroke : hovered ? color.ring : "#ffffff"}
                    strokeWidth={focused ? "3" : "2"}
                    filter="url(#usm-node-shadow)"
                    className="transition-colors duration-200"
                  />
                  <text x={x + width / 2} y={y + (height / 2) + 5} textAnchor="middle" fill={color.text} fontSize={item.id === 1 ? "16" : item.id === 2 ? "15" : item.id === 10 || item.id === 14 ? "13" : "13"} fontWeight="900">
                    {item.short}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="min-h-[620px] rounded-[2rem] border border-ink/10 bg-white p-5 shadow-sm">
        <div className="label">Interaktive Orientierung</div>
        <h3 className="font-display text-2xl font-bold">{activeItem ? activeItem.title : "Unterricht als Gesamtsystem"}</h3>
        <p className="mt-3 min-h-[116px] text-sm leading-relaxed text-ink/60">
          {activeItem ? activeItem.description : "Wähle einen Baustein aus, um seine Bedeutung für Planung, Durchführung und Reflexion von Unterricht zu erkunden."}
        </p>
        {activeItem && (
          <div className="mt-6 min-h-[260px] rounded-2xl bg-paper/70 px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">Planungsfrage</div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/75">{activeItem.question}</p>
            <div className="mt-6 border-t border-ink/10 pt-4 text-xs leading-relaxed text-ink/45">
              Ebene: {activeItem.layer}
            </div>
          </div>
        )}
        {!activeItem && (
          <div className="mt-5 min-h-[310px] rounded-2xl border border-ink/10 bg-paper/60 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">Legende</div>
            <div className="mt-3 grid gap-2 text-sm leading-relaxed text-ink/60">
              <p><span className="font-black text-ink">Fundament:</span> Lehrende, Lernende, Gegenstand und Kommunikation.</p>
              <p><span className="font-black text-ink">Planungsebene:</span> Ziele, Inhalte, Methoden, Medien, Raum und Zeit im Lehr-Lern-Arrangement.</p>
              <p><span className="font-black text-ink">Ergebnisebene:</span> Lernergebnisse, Bildungserfolg und Mündigkeit.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsmModal({
  activeId,
  onSelect,
  onNavigate,
  onClose,
}: {
  activeId: number | null;
  onSelect: (id: number | null) => void;
  onNavigate: (step: "competence" | "hkm" | "usm" | "uvp") => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-7">
          <div>
            <div className="label">Brainstorming & Nachbesprechung</div>
            <h2 id="usm-title" className="font-display text-2xl font-bold sm:text-3xl">Unterrichtsstrukturmodell (USM)</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/55">Nutze die anklickbaren Bausteine als Denkanker, ohne den eigentlichen Unterrichtsverlauf zu verlassen.</p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/60 transition hover:bg-clay/10 hover:text-clay" onClick={onClose} aria-label="Unterrichtsstrukturmodell schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto bg-paper/35 p-5 sm:p-7">
          <ModelOrientationStrip active="usm" onNavigate={onNavigate} />
          <div className="mt-5">
          <TeachingStructureModel activeId={activeId} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetenceModelExplorer({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const itemByKey = useMemo(() => new Map<string, (typeof competenceModelItems)[number]>(competenceModelItems.map((item) => [item.key, item])), []);
  const selectedItem = activeKey ? itemByKey.get(activeKey) : null;

  const renderBlock = (key: string, className = "") => {
    const item = itemByKey.get(key);
    if (!item) return null;
    const isActive = activeKey === key;
    const isHovered = hoveredKey === key;
    return (
      <button
        key={item.key}
        type="button"
        aria-pressed={isActive}
        aria-label={`${item.title}: ${item.description}`}
        className={`box-border min-h-[6.2rem] rounded-[1.35rem] border px-4 py-3 text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-clay/35 ${
          isActive
            ? "border-clay/55 bg-clay/10 shadow-[0_18px_44px_rgba(159,20,12,.10)]"
            : isHovered
              ? "border-primary/25 bg-white shadow-sm"
              : "border-ink/10 bg-white/82 shadow-sm"
        } ${className}`}
        onClick={() => onSelect(isActive ? null : key)}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey(null)}
        onFocus={() => setHoveredKey(key)}
        onBlur={() => setHoveredKey(null)}
      >
        <span className="text-[10px] font-bold uppercase tracking-[.16em] text-primary/70">{item.subtitle}</span>
        <span className="mt-1 block font-display text-lg font-bold text-ink">{item.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-ink/55">{item.description}</span>
      </button>
    );
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.36fr)]">
      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-4 shadow-sm sm:p-6">
        <div className="mb-5 max-w-3xl">
          <div className="label">Interaktives Denkmodell</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-ink">Kompetenzorientierung als Grundlage</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Kompetentes Handeln entsteht im Zusammenspiel fachlicher, sozialer und selbstbezogener Kompetenz sowie durch die Verbindung von Wissen, Können und Wollen.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-white via-primary/5 to-clay/5 p-4 sm:p-6">
          <div className="mx-auto grid max-w-5xl gap-4">
            <div className="grid justify-items-center">
              {renderBlock("muendigkeit", "w-full max-w-md text-center")}
            </div>

            <div className="flex justify-center text-primary/35" aria-hidden="true">
              <ChevronDown size={24} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] lg:items-center">
              <div className="grid gap-3">
                <div className="text-center text-[11px] font-bold uppercase tracking-[.18em] text-ink/45 lg:text-left">Kompetenzbereiche</div>
                {renderBlock("fach")}
                {renderBlock("sozial")}
                {renderBlock("selbst")}
              </div>

              <div className="grid gap-3">
                {renderBlock("competence", "min-h-[11rem] border-primary/20 bg-white text-center")}
                <div className="rounded-2xl border border-primary/10 bg-white/60 px-4 py-3 text-center text-xs leading-relaxed text-ink/55">
                  Nicht nur wissen. Nicht nur ausführen. Sondern verstehen, anwenden und verantworten.
                </div>
              </div>

              <div className="grid gap-3">
                <div className="text-center text-[11px] font-bold uppercase tracking-[.18em] text-ink/45 lg:text-left">Handlungsdimensionen</div>
                {renderBlock("wissen")}
                {renderBlock("koennen")}
                {renderBlock("wollen")}
              </div>
            </div>

            <div className="flex justify-center text-primary/35" aria-hidden="true">
              <ChevronDown size={24} />
            </div>

            <div className="grid justify-items-center">
              {renderBlock("situation", "w-full max-w-2xl text-center")}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-primary/5 p-4 text-sm leading-relaxed text-ink/65">
          Im nächsten Modell zeigt die Handlungskompetenzmatrix, wie Kompetenzbereiche, Handlungsdimensionen und Zielniveaus systematisch miteinander verbunden werden.
        </div>
      </section>

      <aside className="min-h-[30rem] rounded-[2rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        {selectedItem ? (
          <div>
            <div className="label">Ausgewählter Baustein</div>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">{selectedItem.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/68">{selectedItem.description}</p>

            <div className="mt-5 rounded-2xl bg-paper p-4">
              <div className="text-[11px] font-bold uppercase tracking-[.14em] text-primary/70">Bedeutung für Unterricht</div>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{selectedItem.meaning}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-clay/12 bg-clay/5 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[.14em] text-clay/75">Praxisbeispiel</div>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{selectedItem.example}</p>
            </div>

            <div className="mt-5">
              <div className="text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Reflexionsfragen</div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/65">
                {selectedItem.questions.map((question) => (
                  <li key={question} className="rounded-xl bg-paper/75 px-3 py-2">• {question}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <div className="label">Orientierung</div>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">Kompetenzorientierung als Grundlage</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/68">
              Kompetenzorientierter Unterricht bereitet Lernende darauf vor, berufliche, gesellschaftliche und private Anforderungen selbstständig, sachgerecht, reflektiert und verantwortlich zu bewältigen.
            </p>
            <p className="mt-4 rounded-2xl bg-paper p-4 text-sm font-semibold leading-relaxed text-ink/70">
              Wähle einen Baustein aus, um das zugrunde liegende Kompetenzverständnis zu erkunden.
            </p>
            <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm leading-relaxed text-ink/60">
              Merkhilfe: Nicht nur wissen. Nicht nur ausführen. Sondern verstehen, anwenden und verantworten.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function CompetenceModelModal({
  activeKey,
  onSelect,
  onNavigate,
  onClose,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
  onNavigate: (step: "competence" | "hkm" | "usm" | "uvp") => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="competence-model-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-7">
          <div>
            <div className="label">Modelle → Kompetenzverständnis</div>
            <h2 id="competence-model-title" className="font-display text-2xl font-bold sm:text-3xl">Kompetenzverständnis</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/55">
              Eine kompakte Einführung in die Grundidee kompetenzorientierten Unterrichts: Anforderungen bewältigen, Wissen, Können und Wollen verbinden, Mündigkeit anbahnen.
            </p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/60 transition hover:bg-clay/10 hover:text-clay" onClick={onClose} aria-label="Kompetenzverständnis schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto bg-paper/35 p-5 sm:p-7">
          <ModelOrientationStrip active="competence" onNavigate={onNavigate} />
          <div className="mt-5">
            <CompetenceModelExplorer activeKey={activeKey} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HkmModelModal({ onNavigate, onClose }: { onNavigate: (step: "competence" | "hkm" | "usm" | "uvp") => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hkm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-7">
          <div>
            <div className="label">Modelle → Handlungskompetenzmatrix</div>
            <h2 id="hkm-title" className="font-display text-2xl font-bold sm:text-3xl">Handlungskompetenzmatrix</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/55">
              Ein kompakter Blick auf die Handlungskompetenzmatrix: berufliche Anforderung, Kompetenzbereiche, Handlungsdimensionen und Stufen.
            </p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/60 transition hover:bg-clay/10 hover:text-clay" onClick={onClose} aria-label="Handlungskompetenzmatrix schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto bg-paper/35 p-5 sm:p-7">
          <ModelOrientationStrip active="hkm" onNavigate={onNavigate} />
          <div className="mt-5">
          <LayeredHkmModelExplorer />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelOrientationStrip({
  active,
  onNavigate,
}: {
  active: "competence" | "hkm" | "usm" | "uvp";
  onNavigate?: (step: "competence" | "hkm" | "usm" | "uvp") => void;
}) {
  const steps = [
    { key: "competence", title: "Kompetenzverständnis", subtitle: "Wissen · Können · Wollen" },
    { key: "hkm", title: "Handlungskompetenzmatrix", subtitle: "Ziele und Niveaus klären" },
    { key: "usm", title: "Unterrichtsstrukturmodell", subtitle: "Planungsentscheidungen vernetzen" },
    { key: "uvp", title: "Lernsituation & UVP", subtitle: "konkret planen und reflektieren" },
  ] as const;
  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl">
      <div className="grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = step.key === active;
          return (
            <button
              key={step.key}
              type="button"
              aria-current={isActive ? "step" : undefined}
              className={`relative rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-clay/35 ${
                isActive ? "border-clay/30 bg-clay/5 shadow-sm" : "border-ink/10 bg-white/70 hover:border-moss/25 hover:bg-sky/5"
              }`}
              onClick={() => onNavigate?.(step.key)}
            >
              {index > 0 && <span className="absolute -left-3 top-1/2 hidden -translate-y-1/2 text-ink/20 md:block">→</span>}
              <div className={`text-[10px] font-black uppercase tracking-[.14em] ${isActive ? "text-clay" : "text-ink/35"}`}>Schritt {index + 1}</div>
              <div className="mt-1 text-sm font-black text-ink">{step.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-ink/45">{step.subtitle}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HkmModelExplorer() {
  const [activeKey, setActiveKey] = useState<string>("requirement");
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const currentKey = hoverKey ?? activeKey;
  const makeCellKey = (area: CompetencyArea, dimension: CompetencyDimension, level: number) => `cell:${area}:${dimension}:${level}`;
  const makeAreaKey = (area: CompetencyArea) => `area:${area}`;
  const makeDimensionKey = (dimension: CompetencyDimension) => `dimension:${dimension}`;
  const makeLevelKey = (level: number) => `level:${level}`;
  const parseCell = (key: string) => {
    const [, area, dimension, level] = key.split(":");
    return { area: area as CompetencyArea, dimension: dimension as CompetencyDimension, level: Number(level) };
  };
  const modelInfo = (() => {
    if (currentKey === "requirement") {
      return {
        title: "Berufliche Anforderung",
        kicker: "Ausgangspunkt",
        body: "Die Anforderungssituation gibt der Kompetenzentwicklung Sinn: Was müssen Lernende in einer beruflichen Situation verstehen, können und verantworten?",
        hint: "Von hier aus werden Kompetenzbereich, Handlungsdimension und Zielniveau abgeleitet.",
      };
    }
    if (currentKey.startsWith("area:")) {
      const area = hkmModelAreas.find((item) => item.key === currentKey.split(":")[1]) ?? hkmModelAreas[0];
      return { title: area.title, kicker: area.subtitle, body: area.description, hint: "Passende Lernziele beschreiben, worauf sich das Handeln richtet." };
    }
    if (currentKey.startsWith("dimension:")) {
      const dimension = hkmModelDimensions.find((item) => item.key === currentKey.split(":")[1]) ?? hkmModelDimensions[0];
      return { title: `${dimension.code} · ${dimension.title}`, kicker: "Handlungsdimension", body: dimension.description, hint: "Die Dimension klärt, welche Art von Ziel formuliert wird." };
    }
    if (currentKey.startsWith("level:")) {
      const level = hkmModelLevels.find((item) => item.value === Number(currentKey.split(":")[1])) ?? hkmModelLevels[0];
      return { title: level.title, kicker: "Kompetenzstufe", body: level.description, hint: "Die Stufe beschreibt Tiefe, Komplexität und Selbstständigkeit des Zielniveaus." };
    }
    const cell = parseCell(currentKey);
    const area = hkmModelAreas.find((item) => item.key === cell.area) ?? hkmModelAreas[0];
    const dimension = hkmModelDimensions.find((item) => item.key === cell.dimension) ?? hkmModelDimensions[0];
    const level = hkmModelLevels.find((item) => item.value === cell.level) ?? hkmModelLevels[0];
    return {
      title: `${area.title} · ${dimension.title} · ${level.title}`,
      kicker: "Zielformulierungsfeld",
      body: `${area.description} ${dimension.description}`,
      hint: level.description,
    };
  })();
  const isCellHighlighted = (area: CompetencyArea, dimension: CompetencyDimension, level: number) => {
    if (currentKey === "requirement") return false;
    if (currentKey === makeAreaKey(area)) return true;
    if (currentKey === makeDimensionKey(dimension)) return true;
    if (currentKey === makeLevelKey(level)) return true;
    return currentKey === makeCellKey(area, dimension, level);
  };
  const isCellDimmed = (area: CompetencyArea, dimension: CompetencyDimension, level: number) => currentKey !== "requirement" && !isCellHighlighted(area, dimension, level);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur-xl sm:p-5">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-white via-paper to-sky/10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-sky/10" />
        <div className="overflow-x-auto p-3 sm:p-5">
          <svg viewBox="0 0 1180 760" className="min-w-[1040px]" role="img" aria-label="Interaktive dreidimensionale Handlungskompetenzmatrix">
            <defs>
              <linearGradient id="hkm-card" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e8f2fb" />
              </linearGradient>
              <linearGradient id="hkm-active" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#174a87" />
                <stop offset="100%" stopColor="#5687b9" />
              </linearGradient>
              <filter id="hkm-soft-shadow" x="-25%" y="-25%" width="150%" height="170%">
                <feDropShadow dx="0" dy="14" stdDeviation="11" floodColor="#0c2340" floodOpacity=".13" />
              </filter>
              <filter id="hkm-cell-shadow" x="-20%" y="-20%" width="140%" height="160%">
                <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#0c2340" floodOpacity=".12" />
              </filter>
            </defs>

            <rect x="18" y="18" width="1144" height="704" rx="34" fill="#ffffff" fillOpacity=".68" stroke="#174a87" strokeOpacity=".08" />
            <path d="M174 612 C390 690 744 694 990 564" fill="none" stroke="#a20d05" strokeOpacity=".08" strokeWidth="10" strokeLinecap="round" />

            <g tabIndex={0} role="button" className="cursor-pointer outline-none" onMouseEnter={() => setHoverKey("requirement")} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey("requirement")} onBlur={() => setHoverKey(null)} onClick={() => setActiveKey("requirement")}>
              <rect x="462" y="30" width="310" height="42" rx="14" fill={currentKey === "requirement" ? "#174a87" : "#ffffff"} stroke="#174a87" strokeOpacity=".25" filter="url(#hkm-soft-shadow)" />
              <text x="617" y="56" textAnchor="middle" fill={currentKey === "requirement" ? "#ffffff" : "#174a87"} fontSize="18" fontWeight="900">Berufliche Anforderung</text>
            </g>

            <text x="578" y="118" textAnchor="middle" fill="#1383bd" fontSize="22" fontWeight="900">Handlungsdimensionen</text>
            {hkmModelDimensions.map((dimension, index) => {
              const x = 380 + index * 205;
              const active = currentKey === makeDimensionKey(dimension.key);
              const related = currentKey.startsWith("cell:") && parseCell(currentKey).dimension === dimension.key;
              return (
                <g key={dimension.key} tabIndex={0} role="button" className="cursor-pointer outline-none" onMouseEnter={() => setHoverKey(makeDimensionKey(dimension.key))} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey(makeDimensionKey(dimension.key))} onBlur={() => setHoverKey(null)} onClick={() => setActiveKey(makeDimensionKey(dimension.key))}>
                  <rect x={x} y="136" width="160" height="74" rx="12" fill={active || related ? "#174a87" : "#ffffff"} stroke={active || related ? "#a20d05" : "#174a87"} strokeOpacity={active || related ? ".65" : ".16"} strokeWidth={active ? "2.5" : "1.3"} filter="url(#hkm-cell-shadow)" />
                  <text x={x + 80} y="160" textAnchor="middle" fill={active || related ? "#ffffff" : "#0c2340"} opacity=".65" fontSize="11" fontWeight="900">{dimension.code}</text>
                  <text x={x + 80} y="184" textAnchor="middle" fill={active || related ? "#ffffff" : "#0c2340"} fontSize="20" fontWeight="900">{dimension.title}</text>
                </g>
              );
            })}

            <text x="72" y="456" transform="rotate(-90 72 456)" fill="#1383bd" fontSize="16" fontWeight="900">Handlungskompetenzbereiche</text>
            {hkmModelAreas.map((area, areaIndex) => {
              const y = 258 + areaIndex * 136;
              const active = currentKey === makeAreaKey(area.key);
              const related = currentKey.startsWith("cell:") && parseCell(currentKey).area === area.key;
              return (
                <g key={area.key}>
                  <text x="132" y={y - 15} fill="#0c2340" opacity=".55" fontSize="13" fontStyle="italic">{area.subtitle}</text>
                  <g tabIndex={0} role="button" className="cursor-pointer outline-none" onMouseEnter={() => setHoverKey(makeAreaKey(area.key))} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey(makeAreaKey(area.key))} onBlur={() => setHoverKey(null)} onClick={() => setActiveKey(makeAreaKey(area.key))}>
                    <rect x="128" y={y} width="190" height="72" rx="12" fill={active || related ? "#174a87" : "#ffffff"} stroke={active || related ? "#a20d05" : "#174a87"} strokeOpacity={active || related ? ".65" : ".16"} strokeWidth={active ? "2.5" : "1.3"} filter="url(#hkm-cell-shadow)" />
                    <text x="223" y={y + 42} textAnchor="middle" fill={active || related ? "#ffffff" : "#0c2340"} fontSize="17" fontWeight="900">{area.title}</text>
                  </g>
                </g>
              );
            })}

            {hkmModelAreas.map((area, areaIndex) => {
              const baseY = 258 + areaIndex * 136;
              const baseX = 376;
              const cellWidth = 182;
              const cellHeight = 92;
              const depthX = 70;
              const depthY = -34;
              return hkmModelDimensions.map((dimension, dimensionIndex) => (
                <g key={`${area.key}-${dimension.key}`}>
                  {[4, 3, 2, 1].map((level) => {
                    const x = baseX + dimensionIndex * cellWidth + (level - 1) * depthX;
                    const y = baseY + (level - 1) * depthY;
                    const highlighted = isCellHighlighted(area.key, dimension.key, level);
                    const dimmed = isCellDimmed(area.key, dimension.key, level);
                    const activeCell = currentKey === makeCellKey(area.key, dimension.key, level);
                    return (
                      <g key={`${area.key}-${dimension.key}-${level}`} tabIndex={0} role="button" className="cursor-pointer outline-none" opacity={dimmed ? .33 : 1} onMouseEnter={() => setHoverKey(makeCellKey(area.key, dimension.key, level))} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey(makeCellKey(area.key, dimension.key, level))} onBlur={() => setHoverKey(null)} onClick={() => setActiveKey(makeCellKey(area.key, dimension.key, level))}>
                        <rect x={x} y={y} width={cellWidth - 18} height={cellHeight} rx="10" fill={highlighted ? "url(#hkm-active)" : "url(#hkm-card)"} stroke={activeCell ? "#a20d05" : highlighted ? "#174a87" : "#174a87"} strokeOpacity={activeCell ? ".9" : highlighted ? ".38" : ".15"} strokeWidth={activeCell ? "3" : highlighted ? "2" : "1"} filter="url(#hkm-cell-shadow)" />
                        <text x={x + (cellWidth - 18) / 2} y={y + 48} textAnchor="middle" fill={highlighted ? "#ffffff" : "#0c2340"} fontSize="14" fontWeight="900">{dimension.code}: {dimension.title}</text>
                      </g>
                    );
                  })}
                </g>
              ));
            })}

            <text x="868" y="654" fill="#1383bd" fontSize="19" fontWeight="900" transform="rotate(-26 868 654)">Kompetenzstufen</text>
            {hkmModelLevels.map((level, index) => {
              const active = currentKey === makeLevelKey(level.value) || (currentKey.startsWith("cell:") && parseCell(currentKey).level === level.value);
              const x = 810 + index * 64;
              const y = 602 - index * 28;
              return (
                <g key={level.value} tabIndex={0} role="button" className="cursor-pointer outline-none" onMouseEnter={() => setHoverKey(makeLevelKey(level.value))} onMouseLeave={() => setHoverKey(null)} onFocus={() => setHoverKey(makeLevelKey(level.value))} onBlur={() => setHoverKey(null)} onClick={() => setActiveKey(makeLevelKey(level.value))}>
                  <rect x={x} y={y} width="42" height="54" rx="8" fill={active ? "#a20d05" : "#ffffff"} stroke="#174a87" strokeOpacity=".18" filter="url(#hkm-cell-shadow)" />
                  <text x={x + 21} y={y + 35} textAnchor="middle" fill={active ? "#ffffff" : "#0c2340"} fontSize="18" fontWeight="900">{level.value}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="border-t border-ink/10 bg-white/75 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.42fr)] lg:items-start">
            <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-clay">{modelInfo.kicker}</div>
              <h3 className="mt-1 font-display text-xl font-bold text-ink">{modelInfo.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{modelInfo.body}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-ink/45">{modelInfo.hint}</p>
            </div>
            <div className="rounded-2xl border border-moss/15 bg-sky/5 px-4 py-3 text-xs font-semibold leading-relaxed text-ink/55">
              Die Matrix unterstützt Zielformulierung, Planung und Reflexion. Sie bewertet keine Lernenden und schreibt keine Methode vor.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayeredHkmModelExplorer() {
  const [selectedArea, setSelectedArea] = useState<CompetencyArea>("fach");
  const [selectedCell, setSelectedCell] = useState<{ area: CompetencyArea; dimension: CompetencyDimension; level: number }>({ area: "fach", dimension: "wissen", level: 2 });
  const selectedAreaMeta = hkmModelAreas.find((area) => area.key === selectedArea) ?? hkmModelAreas[0];
  const selectedDimension = hkmModelDimensions.find((dimension) => dimension.key === selectedCell.dimension) ?? hkmModelDimensions[0];
  const selectedLevel = hkmModelLevels.find((level) => level.value === selectedCell.level) ?? hkmModelLevels[0];
  const selectedCellArea = hkmModelAreas.find((area) => area.key === selectedCell.area) ?? hkmModelAreas[0];
  const exampleVerb = selectedCell.dimension === "wissen" ? "erklären" : selectedCell.dimension === "koennen" ? "anwenden und begründen" : "verantwortlich entscheiden";
  const previousLevel = hkmModelLevels.find((level) => level.value === selectedCell.level - 1);
  const nextLevel = hkmModelLevels.find((level) => level.value === selectedCell.level + 1);

  return (
    <section className="grid gap-5">
      <div className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label">Ebene 1 · Gesamtübersicht</div>
            <h3 className="font-display text-2xl font-bold text-ink">Handlungskompetenzmatrix</h3>
          </div>
          <span className="rounded-full bg-sky/10 px-3 py-1.5 text-xs font-bold text-moss">Orientierung ohne Interaktionsdruck</span>
        </div>
        <div className="rounded-[1.5rem] bg-white p-3 shadow-inner sm:p-5">
          <img
            src={HKM_REFERENCE_IMAGE}
            alt="Übersicht der Handlungskompetenzmatrix mit Kompetenzbereichen, Handlungsdimensionen und Kompetenzstufen"
            className="mx-auto block h-auto max-h-[58vh] w-full max-w-5xl rounded-xl object-contain"
            draggable={false}
          />
          <div className="mx-auto mt-3 max-w-5xl rounded-2xl bg-paper/70 px-4 py-3 text-center text-sm font-bold text-ink/60">
            Handlungskompetenzmatrix der gewerblich-technischen Universitätsberufsschule Bayreuth nach Müller
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4">
          <div className="label">Ebene 2 · Schichtweise Exploration</div>
          <h3 className="font-display text-2xl font-bold text-ink">Kompetenzbereiche einzeln erkunden</h3>
        </div>
        <div className="mb-4 grid gap-2 md:grid-cols-3" role="tablist" aria-label="Kompetenzbereich auswählen">
          {hkmModelAreas.map((area) => {
            const active = selectedArea === area.key;
            return (
              <button
                key={area.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`min-h-20 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-clay/30 bg-clay/5 shadow-sm" : "border-ink/10 bg-paper/70 hover:border-moss/25 hover:bg-sky/5"}`}
                onClick={() => {
                  setSelectedArea(area.key);
                  setSelectedCell((old) => ({ ...old, area: area.key }));
                }}
              >
                <span className={`block text-[10px] font-black uppercase tracking-[.14em] ${active ? "text-clay" : "text-ink/35"}`}>{area.subtitle}</span>
                <span className="mt-1 block text-base font-black text-ink">{area.title}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.42fr)]">
          <div className="rounded-[1.5rem] border border-ink/10 bg-paper/60 p-3 sm:p-4">
            <div className="mb-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-sm font-black text-ink">{selectedAreaMeta.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink/50">{selectedAreaMeta.description}</p>
            </div>
            <div className="grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-2 text-sm">
              <div />
              {hkmModelDimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-xl bg-white px-3 py-2 text-center font-black text-ink shadow-sm">{dimension.code}: {dimension.title}</div>
              ))}
              {hkmModelLevels.map((level) => (
                <Fragment key={level.value}>
                  <div className="flex min-h-20 items-center justify-center rounded-xl bg-white px-2 text-center text-xs font-black text-ink/55 shadow-sm">Stufe {level.value}</div>
                  {hkmModelDimensions.map((dimension) => {
                    const active = selectedCell.area === selectedArea && selectedCell.dimension === dimension.key && selectedCell.level === level.value;
                    return (
                      <button
                        key={`${selectedArea}-${dimension.key}-${level.value}`}
                        type="button"
                        className={`min-h-20 rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-clay/30 ${active ? "border-clay bg-white shadow-md" : "border-ink/10 bg-white/70 hover:border-moss/25 hover:bg-white"}`}
                        onClick={() => setSelectedCell({ area: selectedArea, dimension: dimension.key, level: level.value })}
                      >
                        <span className={`block text-[10px] font-black uppercase tracking-[.13em] ${active ? "text-clay" : "text-ink/35"}`}>{dimension.code} · Stufe {level.value}</span>
                        <span className="mt-1 block text-sm font-bold leading-snug text-ink">{dimension.title}</span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <aside className="min-h-[420px] rounded-[1.5rem] border border-moss/15 bg-sky/5 p-5">
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-clay">Ausgewählter Kompetenzblock</div>
            <h4 className="mt-2 font-display text-2xl font-bold text-ink">{selectedCellArea.title} × {selectedDimension.title} × Stufe {selectedLevel.value}</h4>
            <div className="mt-4 grid gap-3 text-sm leading-relaxed text-ink/65">
              <p><span className="font-black text-ink">Bedeutung: </span>{selectedCellArea.description} {selectedDimension.description}</p>
              <p><span className="font-black text-ink">Zielniveau: </span>{selectedLevel.description}</p>
              <p><span className="font-black text-ink">Mögliche Zielformulierung: </span>Die Lernenden können in einer beruflichen Anforderungssituation fachlich passend {exampleVerb}.</p>
              <p><span className="font-black text-ink">Beobachtbar wird das etwa daran, dass </span>die Lernenden ihr Vorgehen sichtbar machen, begründen und auf die Situation beziehen.</p>
            </div>
            <div className="mt-4 grid gap-2 rounded-2xl bg-white/85 p-4 text-xs leading-relaxed text-ink/55">
              <p><span className="font-black text-ink/70">Abgrenzung: </span>{previousLevel ? `Gegenüber Stufe ${previousLevel.value} steigt Selbstständigkeit, Transfer oder Begründungstiefe.` : "Stufe 1 beschreibt einen ersten, noch stark angeleiteten Zugang."}</p>
              <p>{nextLevel ? `Stufe ${nextLevel.value} würde stärker auf komplexere, selbstständigere oder verantwortungsvollere Bewältigung zielen.` : "Stufe 4 beschreibt das höchste Zielniveau innerhalb dieser Matrixlogik."}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function InfoHint({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-ink/35">
      {title}
    </span>
  );
}

function FieldHelp({
  title,
  phase,
  purpose,
  importance,
  questions,
}: {
  title: string;
  phase: string;
  purpose: string;
  importance?: string;
  questions: readonly string[];
}) {
  return (
    <details className="help-panel group/help text-sm">
      <summary className="help-panel-summary [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <BookOpen size={15} className="help-icon shrink-0" />
          <span className="truncate">{title}</span>
          <span className="hidden rounded-full border border-[color:var(--help-border)] bg-white/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.12em] help-accent sm:inline-flex">{phase}</span>
        </span>
        <ChevronDown size={15} className="shrink-0 text-ink/35 transition group-open/help:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-[color:var(--help-border)] px-4 py-3 text-xs leading-relaxed text-ink/60 md:grid-cols-3">
        <div className="help-panel-surface">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.12em] help-accent">Worum geht es?</div>
          <p>{purpose}</p>
        </div>
        <div className="help-panel-surface md:col-span-2">
          <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.12em] help-accent">Warum ist das wichtig?</div>
          <p>{importance ?? "Dieser Schritt hilft, die Planung stimmig, nachvollziehbar und auf das Lernen der Schülerinnen und Schüler bezogen zu halten."}</p>
        </div>
        <div className="md:col-span-3">
          <MiniHelpList title="Leitfragen" items={questions} />
        </div>
      </div>
    </details>
  );
}

function MiniHelpList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="help-panel-surface">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.12em] help-accent">{title}</div>
      <ul className="space-y-1.5">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function GoalAssistantPanel({
  value,
  globalGoal,
  onChange,
  onApply,
}: {
  value: Plan["goalAssistant"];
  globalGoal: string;
  onChange: (patch: Partial<Plan["goalAssistant"]>) => void;
  onApply: () => void;
}) {
  const suggestion = buildGoalSuggestion(value);
  const inferredLevel = inferGoalLevel(`${globalGoal} ${suggestion} ${value.behavior}`);
  const checks = [
    { label: "Situation erkennbar", ok: Boolean(value.situation.trim()) || /\b(in|bei|angesichts|ausgehend von)\b/i.test(globalGoal) },
    { label: "Inhalt benannt", ok: Boolean(value.content.trim()) || globalGoal.trim().length > 45 },
    { label: "Beobachtbares Verhalten", ok: Boolean(value.behavior.trim()) || hasObservableVerb(globalGoal) },
    { label: inferredLevel ? `Niveau ${inferredLevel.level} erkennbar` : "Niveau erkennbar", ok: Boolean(inferredLevel) },
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-moss/15 bg-white shadow-sm">
      <div className="border-b border-ink/10 px-4 py-3">
        <div className="text-sm font-black text-ink">Situation, Inhalt und beobachtbares Verhalten</div>
        <div className="text-xs text-ink/45">Bausteine für eine kompetenzorientierte Zielformulierung.</div>
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="label">Situation</span>
            <textarea className="field min-h-24" value={value.situation} onChange={(event) => onChange({ situation: event.target.value })} placeholder="In welcher beruflichen Situation handeln die Lernenden?" />
          </label>
          <label className="block">
            <span className="label">Inhalt</span>
            <textarea className="field min-h-24" value={value.content} onChange={(event) => onChange({ content: event.target.value })} placeholder="Welcher Inhalt, Gegenstand oder Prozess steht im Mittelpunkt?" />
          </label>
          <label className="block">
            <span className="label">Beobachtbares Verhalten</span>
            <textarea className="field min-h-24" value={value.behavior} onChange={(event) => onChange({ behavior: event.target.value })} placeholder="Was tun, erklären, entscheiden, prüfen oder bewerten die Lernenden sichtbar?" />
          </label>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)]">
          <div className="help-panel p-4">
            <div className="label help-accent">Formulierungshilfe</div>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-ink">{suggestion || "Fülle einen oder mehrere Bausteine aus, um eine mögliche Formulierung zu sehen."}</p>
            <details className="help-panel group/examples mt-3 text-sm">
              <summary className="help-panel-summary px-3 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
                Aufbau kompetenzorientierter Zielformulierungen
                <ChevronDown size={14} className="shrink-0 text-ink/35 transition group-open/examples:rotate-180" />
              </summary>
              <div className="grid gap-2 border-t border-[color:var(--help-border)] p-3 text-xs leading-relaxed text-ink/65">
                <p>
                  <span className="font-black text-ink">Grundstruktur: </span>
                  Ein kompetenzorientiertes Ziel verbindet eine berufliche Anforderung oder Handlungssituation, einen fachlichen Inhalt bzw. Gegenstand, ein beobachtbares Verhalten und bei Bedarf Qualitätsanforderungen oder Rahmenbedingungen.
                </p>
                {[
                  ["Metalltechnik", "Die Schülerinnen und Schüler können für eine vorgegebene Dachfläche den erforderlichen Materialbedarf ermitteln und ihre Auswahl fachlich begründen."],
                  ["Elektrotechnik", "Die Schülerinnen und Schüler können eine einfache elektrische Schaltung anhand eines Schaltplans aufbauen, prüfen und auftretende Fehler systematisch eingrenzen."],
                ].map(([area, example]) => (
                  <div key={area} className="help-panel-surface px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-[.12em] help-accent">{area}</div>
                    <p className="mt-1">{example}</p>
                  </div>
                ))}
              </div>
            </details>
            <button type="button" className="mt-3 rounded-full bg-moss px-4 py-2 text-xs font-bold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-ink/20" disabled={!suggestion} onClick={onApply}>
              Vorschlag ins Globalziel übernehmen
            </button>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-paper/70 p-4">
            <div className="label">Freiwillige Qualitätsprüfung</div>
            <div className="mt-2 grid gap-2">
              {checks.map((check) => (
                <span key={check.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${check.ok ? "bg-moss/10 text-moss" : "bg-white text-ink/45"}`}>
                  <Check size={13} className={check.ok ? "" : "opacity-25"} />
                  {check.label}
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-ink/10 bg-white px-3 py-2 text-xs leading-relaxed text-ink/55">
              <div className="font-black text-ink">{inferredLevel ? `Zielniveau: Niveau ${inferredLevel.level} · ${inferredLevel.title}` : "Zielniveau noch offen"}</div>
              <p className="mt-1">{inferredLevel ? inferredLevel.hint : "Nutze ein beobachtbares Verb, damit sichtbar wird, ob das Ziel eher auf Wiedergeben, Erklären, Anwenden oder Bewerten zielt."}</p>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="label">Eigene Notizen zum Lernziel</span>
          <textarea className="field min-h-20" value={value.notes} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Optional: Was soll beim Ziel später noch geprüft oder geschärft werden?" />
        </label>
      </div>
    </section>
  );
}

function QualityReflectionPanel({ plan, totalMinutes }: { plan: Plan; totalMinutes: number }) {
  const hasCompetencyLevel = plan.competencyNeedAnalysis.selectedFields.some((fieldId) => (plan.competencyNeedAnalysis.selectedLevels[fieldId] ?? []).length > 0);
  const hasLevelGoal = plan.competencyNeedAnalysis.selectedFields.some((fieldId) => Boolean(plan.competencyNeedAnalysis.entries[fieldId]?.levelGoal?.trim()));
  const phaseGoals = plan.phases.filter((phase) => phase.goal.trim()).length;
  const phasesWithActions = plan.phases.filter((phase) => phase.teacherAction.trim() || phase.studentAction.trim()).length;
  const phasesWithMethods = plan.phases.filter((phase) => phase.methods.trim()).length;
  const prereqConsidered = Boolean(
    plan.learningPrerequisites.priorKnowledge.trim()
    || plan.learningPrerequisites.compact.trim()
    || plan.learningPrerequisites.groupFactors.length
    || plan.learningPrerequisites.specialFactors.length
    || plan.learningPrerequisites.consequences.trim()
  );
  const checks = [
    { label: "Lernziel plausibel", ok: plan.globalGoal.trim().length > 25 && hasObservableVerb(plan.globalGoal), hint: "Situation, Inhalt und beobachtbares Verhalten prüfen." },
    { label: "Kompetenzniveau passend", ok: hasCompetencyLevel && hasLevelGoal, hint: "Kompetenzfeld, Stufe und konkretes Ziel verbinden." },
    { label: "Lernaufgaben stimmig", ok: plan.phases.length > 0 && phaseGoals > 0, hint: "Phasenziele mit dem Globalziel abgleichen." },
    { label: "Methoden unterstützen Ziele", ok: plan.phases.length > 0 && phasesWithMethods > 0 && phasesWithActions > 0, hint: "Lehr-/Lernhandlung, Methode und Medien zusammendenken." },
    { label: "Adressatenanalyse berücksichtigt", ok: prereqConsidered || plan.targetAudience === "in-service", hint: "Lernvoraussetzungen in Konsequenzen übersetzen." },
    { label: "Zeitplanung sichtbar", ok: totalMinutes > 0, hint: "Phasenzeiten prüfen und realistische Übergänge einplanen." },
  ];
  return (
    <details className="group/quality rounded-2xl border border-ink/10 bg-white/80 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="text-sm font-black text-ink">Reflexionscheck</div>
          <div className="text-xs text-ink/45">Nicht verpflichtend – nur ein kurzer Blick auf mögliche Passungen im Sinne kompetenzorientierter Unterrichtsplanung.</div>
        </div>
        <ChevronDown size={16} className="text-ink/35 transition group-open/quality:rotate-180" />
      </summary>
      <div className="grid gap-2 border-t border-ink/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className={`rounded-2xl border p-3 ${check.ok ? "border-moss/15 bg-moss/5" : "border-ink/10 bg-paper/70"}`}>
            <div className={`flex items-center gap-2 text-sm font-black ${check.ok ? "text-moss" : "text-ink/60"}`}>
              <Check size={15} className={check.ok ? "" : "opacity-25"} />
              {check.label}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink/45">{check.ok ? "wirkt bereits angelegt" : check.hint}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function CompetencyFormulationHint({ area, dimension, level }: { area: CompetencyArea; dimension: CompetencyDimension; level?: number }) {
  const dimensionHint = dimensionFormulationHints[dimension];
  return (
    <details className="help-panel group/competency-hint text-sm leading-relaxed text-ink/70">
      <summary className="help-panel-summary [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--help-border)] bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] help-accent">Formulierungshilfe</span>
          {level && <span className="rounded-full border border-[color:var(--help-border)] bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] help-accent">Stufe {level}</span>}
        </span>
        <ChevronDown size={15} className="shrink-0 text-ink/35 transition group-open/competency-hint:rotate-180" />
      </summary>
      <div className="border-t border-[color:var(--help-border)] p-4">
        <p><span className="font-bold text-ink">{areaFormulationHints[area]}</span></p>
        <p className="mt-1">{dimensionHint.focus}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {dimensionHint.starters.map((starter) => (
            <span key={starter} className="rounded-full border border-[color:var(--help-border)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink/60">{starter}</span>
          ))}
        </div>
        {level && <p className="mt-3 text-xs font-semibold text-ink/50">{levelFocusHints[level]}</p>}
      </div>
    </details>
  );
}

function LearningSituationReflection({
  checks,
  onUpdate,
}: {
  checks: Plan["learningSituationChecks"];
  onUpdate: (id: string, patch: Partial<Plan["learningSituationChecks"][string]>) => void;
}) {
  return (
    <details className="group/ls overflow-hidden rounded-2xl border border-ink/10 bg-white/85 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
          <div>
            <div className="text-sm font-black text-ink">Qualitätscheck Lernsituation</div>
          <div className="text-xs leading-relaxed text-ink/45">Optionaler Blick auf das Grobkonzept - keine Bewertung, keine Punktzahl.</div>
        </div>
        <ChevronDown size={16} className="shrink-0 text-ink/35 transition group-open/ls:rotate-180" />
      </summary>
      <div className="border-t border-ink/10 p-4">
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-ink/50">
          Prüfe bei Bedarf, ob die konkrete Lernsituation als Ausgangspunkt des Grobkonzepts tragfähig ist. Der Check bewertet nicht die fertige Unterrichtsplanung; du kannst einzelne Punkte abhaken oder einfach überspringen.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {learningSituationReflectionItems.map((item) => {
            const entry = checks[item.id] ?? { checked: false, notes: "" };
            return (
              <article key={item.id} className={`rounded-2xl border p-4 transition ${entry.checked ? "border-moss/20 bg-moss/5" : "border-ink/10 bg-paper/60"}`}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-ink/20 text-moss focus:ring-moss"
                    checked={entry.checked}
                    onChange={(event) => onUpdate(item.id, { checked: event.target.checked })}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-ink">{item.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/70">{item.prompt}</span>
                  </span>
                </label>
                <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs leading-relaxed text-ink/50">{item.hint}</p>
              </article>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function ContentBubbleBoard({
  bubbles,
  connections,
  onAdd,
  onUpdate,
  onDelete,
  onConnect,
  onDeleteConnection,
}: {
  bubbles: ContentBubble[];
  connections: ContentConnection[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ContentBubble>) => void;
  onDelete: (id: string) => void;
  onConnect: (fromId: string, toId: string, fromSide?: BubbleSide, toSide?: BubbleSide) => void;
  onDeleteConnection: (id: string) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState<string | null>(null);
  const [linking, setLinking] = useState<{ fromId: string; fromSide: BubbleSide } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number; width: number; height: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.min(Math.max(12, event.clientX - rect.left - dragging.dx), Math.max(12, rect.width - dragging.width - 12));
      const y = Math.min(Math.max(12, event.clientY - rect.top - dragging.dy), Math.max(12, rect.height - dragging.height - 12));
      onUpdate(dragging.id, { x, y });
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, onUpdate]);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: PointerEvent | MouseEvent) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const current = bubbles.find((bubble) => bubble.id === resizing.id);
      const maxWidth = rect && current ? rect.width - current.x - 12 : 340;
      const maxHeight = rect && current ? rect.height - current.y - 12 : 300;
      const width = Math.min(Math.max(120, resizing.startWidth + event.clientX - resizing.startX), Math.max(120, Math.min(420, maxWidth)));
      const height = Math.min(Math.max(88, resizing.startHeight + event.clientY - resizing.startY), Math.max(88, Math.min(340, maxHeight)));
      onUpdate(resizing.id, { width, height, size: Math.max(width, height) });
    };
    const up = () => setResizing(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [bubbles, resizing, onUpdate]);

  useEffect(() => {
    setSelectedConnectionId((current) => current && connections.some((connection) => connection.id === current) ? current : null);
  }, [connections]);

  const bubbleById = useMemo(() => new Map(bubbles.map((bubble) => [bubble.id, bubble])), [bubbles]);

  const sidePoint = (bubble: ContentBubble, side?: BubbleSide) => {
    const width = bubble.width || bubble.size || 176;
    const height = bubble.height || Math.max(96, (bubble.size || 156) * 0.9);
    switch (side) {
      case "left": return { x: bubble.x, y: bubble.y + height / 2 };
      case "right": return { x: bubble.x + width, y: bubble.y + height / 2 };
      case "top": return { x: bubble.x + width / 2, y: bubble.y };
      case "bottom": return { x: bubble.x + width / 2, y: bubble.y + height };
      default: return { x: bubble.x + width / 2, y: bubble.y + height / 2 };
    }
  };

  const oppositeSide = (from: ContentBubble, to: ContentBubble): BubbleSide => {
    const fromCenter = sidePoint(from);
    const toCenter = sidePoint(to);
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "left" : "right";
    return dy > 0 ? "top" : "bottom";
  };

  const connectionPath = (connection: ContentConnection) => {
    const from = bubbleById.get(connection.fromId);
    const to = bubbleById.get(connection.toId);
    if (!from || !to) return null;
    const toSide = connection.toSide ?? oppositeSide(from, to);
    const start = sidePoint(from, connection.fromSide);
    const end = sidePoint(to, toSide);
    const curve = Math.max(42, Math.min(150, Math.hypot(end.x - start.x, end.y - start.y) * 0.28));
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    const c1 = horizontal ? { x: start.x + (end.x >= start.x ? curve : -curve), y: start.y } : { x: start.x, y: start.y + (end.y >= start.y ? curve : -curve) };
    const c2 = horizontal ? { x: end.x - (end.x >= start.x ? curve : -curve), y: end.y } : { x: end.x, y: end.y - (end.y >= start.y ? curve : -curve) };
    return {
      d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
      mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    };
  };

  return (
    <section className="mt-7 rounded-[1.75rem] border border-ink/10 bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-clay">4 · Inhalte analysieren, strukturieren und auswählen</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-ink">Inhalte analysieren, strukturieren und auswählen</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/50">
            Sammle fachliche Inhalte als frei verschiebbare Karten. Farben, Größe und Position helfen beim kreativen Strukturieren und Auswählen.
          </p>
        </div>
        <button type="button" className="icon-btn shrink-0" onClick={onAdd}>
          <Plus size={16} /> Inhaltskarte hinzufügen
        </button>
      </div>

      <div
        ref={boardRef}
        className="relative min-h-[560px] overflow-hidden rounded-[1.6rem] border border-dashed border-ink/15 bg-[radial-gradient(circle_at_1px_1px,rgba(12,35,64,.075)_1px,transparent_0)] [background-size:22px_22px]"
        aria-label="Freier Arbeitsbereich für Lerninhalte"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            setActiveId(null);
            setPaletteOpen(null);
            setLinking(null);
          }
        }}
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-sky/10" />
        <div className="pointer-events-none absolute -bottom-28 left-16 h-64 w-64 rounded-full bg-clay/5" />
        <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" aria-hidden="true">
          {connections.map((connection) => {
            const path = connectionPath(connection);
            if (!path) return null;
            const selected = selectedConnectionId === connection.id;
            return (
              <path
                key={connection.id}
                d={path.d}
                fill="none"
                stroke={selected ? "#9d140d" : "#9d140d"}
                strokeLinecap="round"
                strokeWidth={selected ? 2.2 : 1.25}
                strokeOpacity={selected ? 0.55 : 0.28}
                className="pointer-events-auto cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedConnectionId(connection.id);
                  setActiveId(null);
                  setPaletteOpen(null);
                }}
              />
            );
          })}
        </svg>
        {connections.map((connection) => {
          if (selectedConnectionId !== connection.id) return null;
          const path = connectionPath(connection);
          if (!path) return null;
          return (
            <button
              key={`delete-${connection.id}`}
              type="button"
              className="absolute z-30 rounded-full border border-clay/20 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-clay shadow-soft transition hover:bg-clay hover:text-white"
              style={{ left: path.mid.x, top: path.mid.y, transform: "translate(-50%, -50%)" }}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteConnection(connection.id);
                setSelectedConnectionId(null);
              }}
            >
              Faden löschen
            </button>
          );
        })}
        {bubbles.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <button
              type="button"
              className="max-w-md rounded-[1.5rem] border border-ink/10 bg-white/80 px-6 py-5 text-center shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-moss/30 hover:bg-white focus:outline-none focus:ring-2 focus:ring-moss/25"
              onClick={onAdd}
              aria-label="Erste Inhaltskarte hinzufügen"
            >
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-sky/15 text-moss"><Plus size={20} /></div>
              <p className="font-display text-lg font-bold text-ink">Noch keine Inhaltskarten angelegt.</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/45">Starte mit einer Karte und ordne die Lerninhalte anschließend frei auf der Fläche an.</p>
            </button>
          </div>
        )}
        {bubbles.map((bubble, index) => (
          <ContentBubbleCard
            key={bubble.id}
            bubble={bubble}
            index={index}
            active={activeId === bubble.id}
            linking={linking}
            paletteOpen={paletteOpen === bubble.id}
            onActivate={() => {
              setActiveId(bubble.id);
              setSelectedConnectionId(null);
              if (linking && linking.fromId !== bubble.id) {
                const from = bubbleById.get(linking.fromId);
                onConnect(linking.fromId, bubble.id, linking.fromSide, from ? oppositeSide(from, bubble) : undefined);
                setLinking(null);
              }
            }}
            onOpenPalette={() => setPaletteOpen(paletteOpen === bubble.id ? null : bubble.id)}
            onColor={(color) => {
              onUpdate(bubble.id, { color });
              setPaletteOpen(null);
            }}
            onDelete={() => {
              onDelete(bubble.id);
              setActiveId(null);
              setPaletteOpen(null);
              setLinking(null);
            }}
            onUpdate={(patch) => onUpdate(bubble.id, patch)}
            onStartDrag={(event) => {
              if (linking) return;
              setActiveId(bubble.id);
              setSelectedConnectionId(null);
              const rect = event.currentTarget.getBoundingClientRect();
              setDragging({
                id: bubble.id,
                dx: event.clientX - rect.left,
                dy: event.clientY - rect.top,
                width: bubble.width || bubble.size || 176,
                height: bubble.height || Math.max(96, (bubble.size || 156) * 0.9),
              });
            }}
            onStartResize={(event) => {
              event.currentTarget.setPointerCapture?.(event.pointerId);
              setResizing({
                id: bubble.id,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: bubble.width || bubble.size || 176,
                startHeight: bubble.height || Math.max(96, (bubble.size || 156) * 0.9),
              });
            }}
            onStartLink={(side) => {
              setActiveId(bubble.id);
              setLinking({ fromId: bubble.id, fromSide: side });
              setPaletteOpen(null);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function ContentBubbleCard({
  bubble,
  index,
  active,
  linking,
  paletteOpen,
  onActivate,
  onOpenPalette,
  onColor,
  onDelete,
  onUpdate,
  onStartDrag,
  onStartResize,
  onStartLink,
}: {
  bubble: ContentBubble;
  index: number;
  active: boolean;
  linking: { fromId: string; fromSide: BubbleSide } | null;
  paletteOpen: boolean;
  onActivate: () => void;
  onOpenPalette: () => void;
  onColor: (color: string) => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ContentBubble>) => void;
  onStartDrag: (event: ReactPointerEvent<HTMLElement>) => void;
  onStartResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onStartLink: (side: BubbleSide) => void;
}) {
  const width = bubble.width || bubble.size || 176;
  const height = bubble.height || Math.max(96, (bubble.size || 156) * 0.9);
  const canReceiveLink = Boolean(linking && linking.fromId !== bubble.id);
  const sides: BubbleSide[] = ["left", "right", "top", "bottom"];

  return (
    <article
      className={`absolute z-10 flex flex-col rounded-[1.35rem] border p-4 shadow-soft ring-1 transition ${active ? "border-clay/25 bg-white/80 ring-clay/20" : "border-white/80 ring-ink/5 hover:shadow-lg"} ${canReceiveLink ? "outline outline-2 outline-clay/35" : ""}`}
      style={{
        left: bubble.x,
        top: bubble.y,
        width,
        height,
        backgroundColor: bubble.color,
        zIndex: 10 + index,
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button,input,textarea")) return;
        event.preventDefault();
        onStartDrag(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
    >
      {active ? (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">Bearbeiten</span>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button type="button" className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-ink/55 transition hover:bg-white" onClick={onOpenPalette}>Farbe</button>
                {paletteOpen && (
                  <div className="absolute right-0 top-[calc(100%+.35rem)] z-40 grid w-[128px] grid-cols-4 gap-1.5 rounded-2xl border border-ink/10 bg-white p-2 shadow-soft">
                    {CONTENT_BUBBLE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Farbe ${color} wählen`}
                        className={`h-6 w-6 rounded-full border transition hover:scale-110 ${bubble.color === color ? "border-ink/50 ring-2 ring-sky/40" : "border-ink/10"}`}
                        style={{ backgroundColor: color }}
                        onClick={() => onColor(color)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button type="button" aria-label="Inhaltskarte löschen" className="grid h-7 w-7 place-items-center rounded-full bg-white/55 text-clay transition hover:bg-white" onClick={onDelete}><X size={14} /></button>
            </div>
          </div>
          <input
            aria-label="Titel der Inhaltskarte"
            className="mb-2 w-full border-0 bg-transparent font-display text-lg font-bold leading-tight text-ink outline-none placeholder:text-ink/30"
            value={bubble.title}
            placeholder="Titel"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
          <textarea
            aria-label="Beschreibung der Inhaltskarte"
            className="min-h-0 flex-1 resize-none overflow-auto rounded-2xl border-0 bg-white/35 px-3 py-2 text-sm leading-relaxed text-ink/75 outline-none placeholder:text-ink/30"
            value={bubble.description}
            placeholder="Kurze Beschreibung …"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => onUpdate({ description: event.target.value })}
          />
          {sides.map((side) => (
            <button
              key={side}
              type="button"
              aria-label={`Verknüpfung ${side} starten`}
              className={`absolute grid h-6 w-6 place-items-center rounded-full border border-clay/20 bg-white text-clay shadow-soft transition hover:bg-clay hover:text-white ${side === "left" ? "-left-3 top-1/2 -translate-y-1/2" : ""} ${side === "right" ? "-right-3 top-1/2 -translate-y-1/2" : ""} ${side === "top" ? "left-1/2 -top-3 -translate-x-1/2" : ""} ${side === "bottom" ? "bottom-[-.75rem] left-1/2 -translate-x-1/2" : ""}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onStartLink(side);
              }}
            >
              <Plus size={13} />
            </button>
          ))}
          <button
            type="button"
            aria-label="Inhaltskarte frei skalieren"
            className="absolute bottom-2 right-2 h-7 w-7 cursor-nwse-resize touch-none rounded-br-[1rem] rounded-tl-xl border-b-2 border-r-2 border-ink/35 bg-white/30 transition hover:bg-white/60"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartResize(event);
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none flex h-full flex-col overflow-hidden">
          <h4 className="font-display text-lg font-bold leading-tight text-ink">{bubble.title || "Unbenannter Inhalt"}</h4>
          <p className="mt-2 overflow-hidden whitespace-pre-wrap text-sm leading-relaxed text-ink/65">{bubble.description || "Kurze Beschreibung ergänzen …"}</p>
        </div>
      )}
    </article>
  );
}

function MindmapCanvas({
  nodes,
  draft,
  onDraftChange,
  onAdd,
  onUpdate,
  onDelete,
}: {
  nodes: MindmapNode[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<MindmapNode>) => void;
  onDelete: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.min(Math.max(8, event.clientX - rect.left - dragging.dx), Math.max(8, rect.width - 130));
      const y = Math.min(Math.max(8, event.clientY - rect.top - dragging.dy), Math.max(8, rect.height - 52));
      onUpdate(dragging.id, { x, y });
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, onUpdate]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          className="field"
          value={draft}
          placeholder="Schlagwort ergänzen …"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
        />
        <button type="button" className="icon-btn shrink-0" onClick={onAdd}><Plus size={16} />Begriff</button>
      </div>
      <div ref={canvasRef} className="relative h-[310px] overflow-hidden rounded-3xl border border-dashed border-ink/15 bg-[radial-gradient(circle_at_1px_1px,rgba(12,35,64,.08)_1px,transparent_0)] [background-size:18px_18px]">
        {nodes.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink/35">Noch keine Begriffskarten angelegt.</div>
        )}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute w-[130px] rounded-2xl border border-moss/20 bg-white p-2 shadow-soft"
            style={{ left: node.x, top: node.y }}
          >
            <div
              className="mb-1 flex cursor-grab items-center justify-between gap-1 active:cursor-grabbing"
              onPointerDown={(event) => {
                const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                setDragging({ id: node.id, dx: event.clientX - rect.left, dy: event.clientY - rect.top });
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-[.14em] text-moss">Inhalt</span>
              <button type="button" className="grid h-6 w-6 place-items-center rounded-full text-clay hover:bg-clay/10" onClick={() => onDelete(node.id)}><X size={13} /></button>
            </div>
            <textarea
              aria-label="Mindmap-Begriff bearbeiten"
              className="min-h-12 w-full resize-none border-0 bg-transparent text-sm font-bold leading-tight text-ink outline-none"
              value={node.text}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => onUpdate(node.id, { text: event.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VerbCatalogModal({
  initialDimension,
  onClose,
}: {
  initialDimension: CompetencyDimension;
  onClose: () => void;
}) {
  const [activeDimension, setActiveDimension] = useState(initialDimension);
  const [copiedVerb, setCopiedVerb] = useState("");
  const dimension = VERB_CATALOG.find((entry) => entry.key === activeDimension) ?? VERB_CATALOG[0];

  const copyVerb = async (verb: string) => {
    try {
      await navigator.clipboard.writeText(verb);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = verb;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiedVerb(verb);
    window.setTimeout(() => setCopiedVerb(""), 1600);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="verb-catalog-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-paper shadow-2xl">
        <div className="border-b border-ink/10 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-lime"><LibraryBig size={21} /></div>
              <div>
                <div className="label !mb-1">Lernziele formulieren</div>
                <h2 id="verb-catalog-title" className="font-display text-2xl font-bold sm:text-3xl">Verben-Katalog</h2>
              </div>
            </div>
            <button aria-label="Verben-Katalog schließen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 hover:bg-paper" onClick={onClose}><X size={19} /></button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {VERB_CATALOG.map((entry) => (
              <button
                key={entry.key}
                onClick={() => { setActiveDimension(entry.key); setCopiedVerb(""); }}
                className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${entry.key === activeDimension ? "bg-ink text-white" : "bg-paper text-ink/55 hover:text-ink"}`}
              >
                {entry.code} · {entry.title}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/50">{dimension.subtitle}. Klicke ein Verb an, um es zu kopieren.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {dimension.levels.map((level) => (
              <section key={level.code} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <div className="flex items-start gap-3 bg-ink px-4 py-3 text-white">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-xs font-bold text-ink">{level.level}</span>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">{level.code}</div>
                    <h3 className="text-sm font-bold">{level.title}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {level.verbs.map((verb) => (
                      <button
                        key={verb}
                        onClick={() => copyVerb(verb)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${copiedVerb === verb ? "border-moss bg-moss text-white" : "border-ink/10 bg-paper text-ink/70 hover:border-moss hover:text-moss"}`}
                      >
                        {copiedVerb === verb ? "Kopiert ✓" : verb}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink/45">{level.hint}</p>
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-4 sm:px-7">
          <span className="text-[10px] font-semibold text-ink/35">Handlungsdimensionen und Kompetenzstufen nach Müller</span>
          <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-moss" onClick={onClose}>Katalog schließen</button>
        </div>
      </div>
    </div>
  );
}

function ExamCriteriaModal({
  checked,
  onClose,
  onToggle,
  onReset,
}: {
  checked: Record<string, boolean>;
  onClose: () => void;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const count = Object.values(checked).filter(Boolean).length;
  const percent = Math.round((count / EXAM_CRITERIA_COUNT) * 100);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="criteria-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-paper shadow-2xl">
        <div className="border-b border-ink/10 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-lime"><ClipboardCheck size={21} /></div>
              <div>
                <div className="label !mb-1">Planungs-Gegencheck</div>
                <h2 id="criteria-title" className="font-display text-2xl font-bold sm:text-3xl">Kriterien der Prüfungslehrprobe</h2>
              </div>
            </div>
            <button aria-label="Kriterien schließen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 hover:bg-paper" onClick={onClose}><X size={19} /></button>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-moss transition-all" style={{ width: `${percent}%` }} /></div>
            <strong className="whitespace-nowrap text-xs">{count} von {EXAM_CRITERIA_COUNT}</strong>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink/50">Nutze die Liste nach deiner Planung als Selbstcheck. Einige Kriterien zeigen sich erst in der tatsächlichen Durchführung der Stunde.</p>
          <p className="mt-1 text-[10px] font-semibold text-ink/35">Quelle: Niederschrift der Prüfungslehrprobe · Stand 13.04.2021</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {EXAM_CRITERIA.map((group) => {
              const groupCount = group.items.filter((item) => checked[item.id]).length;
              return (
                <section key={group.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                  <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
                    <h3 className="text-sm font-bold"><span className="mr-2 text-lime">{group.id}</span>{group.title}</h3>
                    <span className="text-[10px] font-bold text-white/55">{groupCount}/{group.items.length}</span>
                  </div>
                  <div className="divide-y divide-ink/8">
                    {group.items.map((item) => (
                      <label key={item.id} className={`flex cursor-pointer items-start gap-3 p-4 text-left transition hover:bg-paper/70 ${checked[item.id] ? "bg-lime/10" : ""}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#174a87]"
                          checked={Boolean(checked[item.id])}
                          onChange={() => onToggle(item.id)}
                        />
                        <span className="text-xs font-bold text-ink/40">{item.id}</span>
                        <span className={`text-sm leading-relaxed ${checked[item.id] ? "text-ink/45 line-through" : "text-ink/80"}`}>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-5 py-4 sm:px-7">
          <button className="inline-flex items-center gap-2 text-xs font-bold text-ink/45 hover:text-clay disabled:opacity-30" disabled={count === 0} onClick={onReset}><RotateCcw size={14} />Häkchen zurücksetzen</button>
          <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-moss" onClick={onClose}>Check abschließen</button>
        </div>
      </div>
    </div>
  );
}

function CompetencyLandscape({ phases, compact = false }: { phases: Phase[]; compact?: boolean }) {
  const visualAreas: { key: CompetencyArea; title: string; subtitle: string }[] = [
    { key: "fach", title: "I. Sach-/Fachkompetenz", subtitle: "Umgang mit der Sache" },
    { key: "selbst", title: "II.1 Selbstkompetenz", subtitle: "Umgang mit sich selbst" },
    { key: "sozial", title: "II.2 Sozialkompetenz", subtitle: "Umgang mit anderen" },
  ];
  const frontX = 270;
  const cellWidth = 142;
  const cellHeight = 34;
  const depthX = 120;
  const depthY = 92;
  const dotOffsets = [[0, 0], [-9, 2], [9, 2], [0, -9], [-9, -8], [9, -8]];
  const svgHeight = 545 + Math.max(1, Math.ceil(phases.length / 4)) * 20;

  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-inner">
      <svg
        viewBox={`0 0 980 ${svgHeight}`}
        className={compact ? "min-w-[720px]" : "min-w-[900px]"}
        role="img"
        aria-label="Dreidimensionale Handlungskompetenzmatrix mit Niveaustufen und Phasenpunkten"
      >
        <defs>
          <filter id="landscapeSoftShadow" x="-10%" y="-15%" width="125%" height="145%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0c2340" floodOpacity=".075" />
          </filter>
        </defs>
        {visualAreas.map((area, areaIndex) => {
          const baseY = 140 + areaIndex * 162;
          const tone = competencyAreaTones[area.key];
          const dots = phases.flatMap((phase, phaseIndex) =>
            landscapeDimensions.flatMap((dimension, dimensionIndex) => {
              const level = phase.competencies?.[area.key]?.[dimension.key] ?? 0;
              return level > 0 ? [{ phase, phaseIndex, dimensionIndex, level }] : [];
            }),
          );
          return (
            <g key={area.key}>
              <rect x="20" y={baseY - 42} width="890" height="132" rx="22" fill={tone.soft} fillOpacity=".34" />
              <text x="42" y={baseY - 15} fill={tone.ink} opacity=".62" fontSize="13" fontStyle="italic">{area.subtitle}</text>
              <rect x="40" y={baseY + 6} width="205" height="38" rx="10" fill="#fff" stroke={tone.ring} filter="url(#landscapeSoftShadow)" />
              <text x="142" y={baseY + 30} textAnchor="middle" fill={tone.ink} fontSize="13" fontWeight="850">{area.title}</text>

              {[4, 3, 2, 1].map((level) => {
                const t = (level - 1) / 3;
                const x = frontX + depthX * t;
                const y = baseY - depthY * t;
                const layerOpacity = ({ 4: 0.07, 3: 0.11, 2: 0.16, 1: 0.22 } as Record<number, number>)[level];
                const strokeOpacity = ({ 4: 0.1, 3: 0.15, 2: 0.21, 1: 0.28 } as Record<number, number>)[level];
                return (
                  <g key={`depth-${level}`}>
                    {[0, 1, 2].map((column) => (
                      <rect
                        key={column}
                        x={x + column * cellWidth}
                        y={y}
                        width={cellWidth}
                        height={cellHeight}
                        rx="8"
                        fill={tone.strong}
                        fillOpacity={layerOpacity}
                        stroke={tone.strong}
                        strokeOpacity={strokeOpacity}
                      />
                    ))}
                    <path
                      d={`M ${x} ${y} L ${x + cellWidth * 3} ${y} L ${x + cellWidth * 3 + 16} ${y - 14} L ${x + 16} ${y - 14} Z`}
                      fill={tone.strong}
                      fillOpacity={layerOpacity * 0.35}
                      stroke={tone.strong}
                      strokeOpacity={strokeOpacity * 0.75}
                    />
                  </g>
                );
              })}
              {[0, 1, 2, 3].map((column) => (
                <line
                  key={`v-${column}`}
                  x1={frontX + column * cellWidth}
                  y1={baseY}
                  x2={frontX + column * cellWidth + depthX}
                  y2={baseY - depthY}
                  stroke={tone.strong}
                  strokeOpacity=".26"
                  strokeWidth="1.4"
                />
              ))}
              {[0, 1, 2].map((column) => (
                <g key={`label-${column}`}>
                  <rect x={frontX + column * cellWidth} y={baseY} width={cellWidth} height="38" rx="8" fill="#fff" stroke={tone.ring} filter="url(#landscapeSoftShadow)" />
                  <text x={frontX + column * cellWidth + cellWidth / 2} y={baseY + 24} textAnchor="middle" fill={tone.ink} fontSize="12" fontWeight="850">{landscapeDimensions[column].label}</text>
                </g>
              ))}
              {[1, 2, 3, 4].map((level) => {
                const t = (level - .5) / 4;
                return (
                  <g key={`n-${level}`}>
                    <rect x={frontX + cellWidth * 3 + depthX * t + 8} y={baseY - depthY * t - 11} width="24" height="24" rx="7" fill="#fff" stroke={tone.ring} />
                    <text x={frontX + cellWidth * 3 + depthX * t + 20} y={baseY - depthY * t + 5} textAnchor="middle" fill={tone.ink} fontSize="12" fontWeight="850">{level}</text>
                  </g>
                );
              })}
              {dots.map((dot, dotIndex) => {
                const sameBefore = dots.slice(0, dotIndex).filter((other) => other.dimensionIndex === dot.dimensionIndex && other.level === dot.level).length;
                const offset = dotOffsets[sameBefore % dotOffsets.length];
                const normalizedLevel = Math.min(4, Math.max(1, dot.level));
                const t = (normalizedLevel - .5) / 4;
                const x = frontX + dot.dimensionIndex * cellWidth + cellWidth / 2 + depthX * t + 14 + offset[0];
                const y = baseY + cellHeight / 2 - depthY * t - 9 + offset[1];
                return (
                  <circle key={`${dot.phase.id}-${area.key}-${dot.dimensionIndex}`} cx={x} cy={y} r={compact ? 6 : 7.5} fill={dot.phase.color} stroke="#fff" strokeWidth="2.5" filter="url(#landscapeSoftShadow)">
                    <title>{`${dot.phase.title}: ${area.title}, ${landscapeDimensions[dot.dimensionIndex].label}, Niveau ${dot.level}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
        <g transform="translate(22 538)">
          {phases.map((phase, index) => (
            <g key={phase.id} transform={`translate(${(index % 4) * 210} ${Math.floor(index / 4) * 20})`}>
              <circle cx="7" cy="0" r="6" fill={phase.color} />
              <text x="18" y="4" fill="#0c2340" fontSize="10" fontWeight="600">{phase.title.length > 15 ? `${phase.title.slice(0, 14)}…` : phase.title}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function CompetencyProfileTargetSummary({ plan }: { plan: Plan }) {
  const selectedTargets = competencyFieldOrder.filter((fieldId) => {
    if (plan.competencyNeedAnalysis.selectedFields.includes(fieldId)) return true;
    const parsed = parseCompetencyFieldId(fieldId);
    return parsed ? plan.phases.some((phase) => (phase.competencies?.[parsed.area]?.[parsed.dimension] ?? 0) > 0 || Object.prototype.hasOwnProperty.call(phase.competencyFocus ?? {}, fieldId)) : false;
  });

  if (selectedTargets.length === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-ink/15 bg-paper/60 p-4">
        <div className="label">Gewählte Ziele</div>
        <p className="mt-2 text-sm leading-relaxed text-ink/50">
          Noch keine Kompetenzziele ausgewählt. Sobald du in der Sachanalyse Ziele markierst, erscheinen sie hier als kompakte Leshilfe zur Matrix.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-ink/10 bg-paper/45 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="label">Gewählte Kompetenzziele</div>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">Kompakte Zuordnung der Punkte in der Matrix zu den anvisierten Zielen und Phasen.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-ink/40">{selectedTargets.length}</span>
      </div>
      <div className="grid gap-2">
        {selectedTargets.map((fieldId) => {
          const parsed = parseCompetencyFieldId(fieldId);
          const tone = parsed ? competencyAreaTones[parsed.area] : competencyAreaTones.fach;
          const entry = { ...defaultCompetencyNeedEntry(), ...(plan.competencyNeedAnalysis.entries[fieldId] ?? {}) };
          const level = (plan.competencyNeedAnalysis.selectedLevels[fieldId] ?? [])[0];
          const phasesForTarget = parsed
            ? plan.phases.filter((phase) => (phase.competencies?.[parsed.area]?.[parsed.dimension] ?? 0) > 0 || Object.prototype.hasOwnProperty.call(phase.competencyFocus ?? {}, fieldId))
            : [];
          return (
            <article
              key={fieldId}
              className="rounded-2xl border p-3"
              style={{
                borderColor: tone.ring,
                background: `rgba(${hexToRgb(tone.soft)}, .78)`,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black" style={{ color: tone.ink }}>{competencyFieldLabel(fieldId)}</span>
                {level ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black"
                    style={{
                      background: `rgba(${hexToRgb(tone.strong)}, ${0.32 + competencyLevelOpacity(level)})`,
                      color: level >= 3 ? "#fff" : tone.ink,
                      border: level === 4 ? "1px solid rgba(156, 27, 22, .42)" : "1px solid transparent",
                    }}
                  >
                    Stufe {level}
                  </span>
                ) : (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink/35">Stufe offen</span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">
                {entry.levelGoal.trim() || "Noch kein konkretes Ziel formuliert."}
              </p>
              {phasesForTarget.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {phasesForTarget.map((phase, index) => (
                    <span key={phase.id} className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[10px] font-black text-ink/55">
                      <span className="h-2 w-2 rounded-full" style={{ background: phase.color }} />
                      {phase.title.trim() || `Phase ${plan.phases.findIndex((item) => item.id === phase.id) + 1 || index + 1}`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] font-semibold text-ink/35">Noch keiner Phase zugeordnet.</p>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function PrintDocument({ plan, totalMinutes }: { plan: Plan; totalMinutes: number }) {
  const planPdfConfig = planningLevelConfig[plan.targetAudience];
  const pdfConfig = planPdfConfig.pdf;
  const showPdfCompetencyNeed = isVisible(sectionVisibility(planPdfConfig, "competencyNeed"));
  const showPdfStudentCount = fieldVisibility(planPdfConfig, "organization", "studentCount") === "visible";
  const showPdfOrganizationNotes = fieldVisibility(planPdfConfig, "organization", "organizationNotes") === "visible";
  const showPdfConcreteLearningSituation = fieldVisibility(planPdfConfig, "synthesis", "concreteLearningSituation") === "visible";
  const hasVisibleFlowContent = plan.phases.length > 0 || Boolean(showPdfConcreteLearningSituation && plan.concreteLearningSituation.trim());
  const audience = targetAudienceOptions.find((option) => option.key === plan.targetAudience)?.title ?? "Studium";
  const detailedPdf = isVisible(pdfConfig.analysis);
  const showPdfObservation = Boolean(plan.observationEnabled && plan.observationTask.trim());
  const contentBubbleSummary = plan.contentBubbles
    .filter((bubble) => bubble.title.trim() || bubble.description.trim())
    .map((bubble) => [bubble.title.trim(), bubble.description.trim()].filter(Boolean).join(": "))
    .join("\n");
  const showPdfLearningContentCard = isVisible(sectionVisibility(planPdfConfig, "contentAnalysis"))
    && (plan.targetAudience === "students" || plan.targetAudience === "ref-beginning" || Boolean(plan.learningContent.trim() || contentBubbleSummary));
  const coverLearningContent = plan.learningContent.trim() || contentBubbleSummary;
  const showCoverProfessionalRequirement = Boolean(plan.situationDescription.trim()) || isVisible(pdfConfig.professionalRequirement);
  const showCoverLearningContent = Boolean(coverLearningContent) || showPdfLearningContentCard;
  const showCoverOrganizationNotes = Boolean(plan.organizationNotes.trim()) || showPdfOrganizationNotes;
  const hasAnalysisContent = detailedPdf && [
    plan.curriculumReference,
    plan.annualPlanReference,
    plan.topicPlacement,
    ...(showPdfCompetencyNeed ? [
      plan.competencyIntentions,
      plan.competencyDemand,
      plan.wkwFocus,
      plan.competencyNeedAnalysis.summary,
    ] : []),
    plan.didacticConsiderations,
    plan.methodologicalConsiderations,
    plan.learningPrerequisites.compact,
    plan.learningPrerequisites.priorKnowledge,
    plan.learningPrerequisites.subject,
    plan.learningPrerequisites.language,
    plan.learningPrerequisites.methodological,
    plan.learningPrerequisites.social,
    plan.learningPrerequisites.difficulties,
    plan.learningPrerequisites.consequences,
  ].some((value) => value.trim())
    || (detailedPdf && plan.contentMindmap.some((node) => node.text.trim()))
    || (detailedPdf && plan.contentBubbles.some((bubble) => bubble.title.trim() || bubble.description.trim()));

  return (
    <div className="print-only">
      <section className="print-page print-cover">
        <PrintHeader page="01" title="Titelseite" />
        <div className="mt-[4mm]">
          <div className="text-[6.5pt] font-bold uppercase tracking-[.18em] text-clay">Unterrichtsplanung</div>
          <h1 className="mt-1 font-display text-[19pt] font-bold leading-tight">{plan.topic || "—"}</h1>
        </div>
        <div className="print-title-card mt-[3mm] grid grid-cols-4 gap-[2.5mm] text-[8pt]">
          {[
            ["Lehrkraft", plan.teacherName || "—"],
            ["Planungsstand", audience],
            ["Klasse", plan.className || "—"],
            ["Datum", plan.date || "—"],
            ["Beginn", plan.startTime ? `${plan.startTime} Uhr` : "—"],
            ["Lernende", plan.studentCount || (showPdfStudentCount ? "—" : "")],
            ["Zeitlicher Umfang", plan.lessonDuration || "—"],
          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
            <div key={label} className="rounded-[3mm] bg-paper px-[3mm] py-[2mm]">
              <div className="text-[5.8pt] font-bold uppercase tracking-[.12em] text-ink/40">{label}</div>
              <div className="mt-0.5 font-bold leading-snug">{value}</div>
            </div>
          ))}
          <div className="rounded-[3mm] bg-clay px-[3mm] py-[2mm] text-white">
            <div className="text-[5.8pt] font-bold uppercase tracking-[.12em] opacity-75">Aus Phasen kalkuliert</div>
            <div className="mt-0.5 font-display text-[10.5pt] font-bold leading-tight">{totalMinutes} Min · bis {addMinutes(plan.startTime, totalMinutes)}{plan.startTime ? " Uhr" : ""}</div>
          </div>
        </div>
        <div className={`print-title-card mt-[3mm] gap-[3mm] ${plan.situationImageDataUrl ? "grid grid-cols-[1fr_34mm]" : ""}`}>
          <div className="grid gap-[2.5mm] text-[7.4pt] leading-snug">
            {showCoverProfessionalRequirement && (
              <div className="rounded-[3mm] border border-ink/10 px-[3mm] py-[2.2mm]">
                <div className="text-[6pt] font-bold uppercase tracking-[.13em] text-moss">Berufliche Anforderung</div>
                <p className="mt-1 whitespace-pre-wrap text-ink/70">{plan.situationDescription || "—"}</p>
              </div>
            )}
            <div className="rounded-[3mm] border border-moss/15 bg-sky/10 px-[3mm] py-[2.2mm]">
              <div className="text-[6pt] font-bold uppercase tracking-[.13em] text-moss">Globalziel der Unterrichtseinheit</div>
              <p className="mt-1 whitespace-pre-wrap font-semibold text-ink/85">{plan.globalGoal || "—"}</p>
            </div>
          </div>
          {plan.situationImageDataUrl && (
            <img
              src={plan.situationImageDataUrl}
              alt={plan.situationImageName || "Einstiegssituation"}
              className="h-[34mm] w-[34mm] rounded-[3mm] border border-ink/10 object-cover"
            />
          )}
        </div>
        <div className="mt-[3mm] grid gap-[2.5mm] text-[7.2pt] leading-snug">
          {showCoverLearningContent && (
            <div className="print-title-card rounded-[3mm] border border-ink/10 bg-paper/60 px-[3mm] py-[2.2mm]">
              <div className="text-[6pt] font-bold uppercase tracking-[.13em] text-moss">Lerninhalte</div>
              <p className="mt-1 whitespace-pre-wrap text-ink/70">{coverLearningContent || "—"}</p>
            </div>
          )}
          {showCoverOrganizationNotes && (
            <div className="print-title-card rounded-[3mm] border border-ink/10 bg-white px-[3mm] py-[2.2mm]">
              <div className="text-[6pt] font-bold uppercase tracking-[.13em] text-ink/40">Weitere organisatorische Rahmenbedingungen</div>
              <p className="mt-1 whitespace-pre-wrap text-ink/65">{plan.organizationNotes || "—"}</p>
            </div>
          )}
          {showPdfObservation && (
            <div className="print-observation-card rounded-[3mm] border-l-[2mm] border-clay bg-paper px-[3mm] py-[2.2mm]">
              <div className="text-[6pt] font-bold uppercase tracking-[.13em] text-clay">Beobachtungsauftrag für Hospitierende</div>
              <p className="mt-1 whitespace-pre-wrap text-ink/70">{plan.observationTask}</p>
            </div>
          )}
        </div>
      </section>

      {hasAnalysisContent && (
        <section className="print-flow">
          <div className="print-flow-heading">
            <PrintHeader page="Analyse" title="Analysen & Grobplanung" />
            <div className="mt-[7mm]">
              <div className="text-[8pt] font-bold uppercase tracking-[.18em] text-clay">Analysen & Grobplanung</div>
              <h1 className="mt-1 font-display text-[22pt] font-bold">Didaktische Vorüberlegungen</h1>
            </div>
          </div>
          <div className="print-analysis-stack mt-[6mm] text-[8.5pt] leading-relaxed">
            {(plan.curriculumReference || plan.annualPlanReference || plan.topicPlacement) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Direkte Vorgaben und Ressourcen</div>
                <div className="print-card-grid mt-2 grid grid-cols-3 gap-[4mm]">
                  <p><b>Lehrplan:</b><br />{plan.curriculumReference || "—"}</p>
                  <p><b>Didaktische Jahresplanung:</b><br />{plan.annualPlanReference || "—"}</p>
                  <p><b>Einordnung:</b><br />{plan.topicPlacement || "—"}</p>
                </div>
              </div>
            )}
            {showPdfCompetencyNeed && (plan.competencyNeedAnalysis.summary || plan.competencyIntentions || plan.competencyDemand || plan.wkwFocus) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Kompetenzbedarf</div>
                {plan.competencyNeedAnalysis.summary ? (
                  <p className="mt-2 whitespace-pre-wrap">{plan.competencyNeedAnalysis.summary}</p>
                ) : (
                  <div className="print-card-grid mt-2 grid grid-cols-3 gap-[4mm]">
                    <p><b>Kompetenzen:</b><br />{plan.competencyIntentions || "—"}</p>
                    <p><b>Bedarf:</b><br />{plan.competencyDemand || "—"}</p>
                    <p><b>Wissen · Können · Wollen:</b><br />{plan.wkwFocus || "—"}</p>
                  </div>
                )}
              </div>
            )}
            {(plan.learningPrerequisites.compact || plan.learningPrerequisites.priorKnowledge || plan.learningPrerequisites.consequences) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Lernvoraussetzungen</div>
                <p className="mt-2 whitespace-pre-wrap">{plan.learningPrerequisites.compact || [
                  plan.learningPrerequisites.priorKnowledge,
                  plan.learningPrerequisites.subject,
                  plan.learningPrerequisites.language,
                  plan.learningPrerequisites.methodological,
                  plan.learningPrerequisites.social,
                  plan.learningPrerequisites.difficulties,
                  plan.learningPrerequisites.consequences,
                ].filter(Boolean).join("\n") || "—"}</p>
              </div>
            )}
            {(plan.didacticConsiderations || plan.methodologicalConsiderations) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Didaktische und methodische Überlegungen</div>
                <div className="print-card-grid mt-2 grid grid-cols-2 gap-[4mm]">
                  <p><b>Didaktik:</b><br />{plan.didacticConsiderations || "—"}</p>
                  <p><b>Methodik:</b><br />{plan.methodologicalConsiderations || "—"}</p>
                </div>
              </div>
            )}
            {detailedPdf && plan.contentMindmap.some((node) => node.text.trim()) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Mindmap Lerninhalte</div>
                <div className="mt-2 flex flex-wrap gap-[2mm]">
                  {plan.contentMindmap.filter((node) => node.text.trim()).map((node) => (
                    <span key={node.id} className="rounded-full bg-sky/20 px-[3mm] py-[1.5mm] text-[8pt] font-bold text-ink">{node.text}</span>
                  ))}
                </div>
              </div>
            )}
            {detailedPdf && plan.contentBubbles.some((bubble) => bubble.title.trim() || bubble.description.trim()) && (
              <div className="print-analysis-card rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Inhaltskarten</div>
                <div className="print-card-grid mt-2 grid grid-cols-2 gap-[3mm]">
                  {plan.contentBubbles.filter((bubble) => bubble.title.trim() || bubble.description.trim()).map((bubble) => (
                    <div key={bubble.id} className="rounded-[3mm] border border-ink/10 p-[3mm]" style={{ backgroundColor: bubble.color }}>
                      <div className="font-bold">{bubble.title || "Inhalt"}</div>
                      {bubble.description && <p className="mt-1 whitespace-pre-wrap text-[7.5pt] leading-snug text-ink/70">{bubble.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {hasVisibleFlowContent && (
        <section className="print-flow print-flow-start">
          <div className="print-flow-heading">
            <PrintHeader page="ab 02" title="Unterrichtsverlauf" />
            <div className="mt-[7mm]">
              <div className="text-[8pt] font-bold uppercase tracking-[.18em] text-clay">Unterrichtsverlauf</div>
              <h1 className="mt-1 font-display text-[23pt] font-bold">Unterrichtsverlaufplan</h1>
              <p className="mt-1 text-[8.5pt] text-ink/50">Die Uhrzeiten ergeben sich fortlaufend aus dem Unterrichtsbeginn und den Zeitangaben der Phasen.</p>
            </div>
          </div>
          <div className="mt-[6mm] space-y-[4mm]">
            {showPdfConcreteLearningSituation && plan.concreteLearningSituation.trim() && (
              <div className="print-concrete-situation-card rounded-[5mm] border border-moss/15 bg-sky/10 p-[5mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Konkrete Lernsituation</div>
                <p className="mt-2 whitespace-pre-wrap text-[9pt] leading-relaxed text-ink/75">{plan.concreteLearningSituation}</p>
              </div>
            )}
            {plan.phases.map((phase, index) => {
              const before = plan.phases.slice(0, index).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
              const startsAt = addMinutes(plan.startTime, before);
              const endsAt = addMinutes(plan.startTime, before + Number(phase.minutes || 0));
              return (
                <article key={phase.id} className={`print-phase-card rounded-[5mm] border border-ink/10 bg-white ${index === 0 ? "print-phase-card-first" : ""}`} style={{ borderLeft: `3mm solid ${phase.color}` }}>
                <div className="flex items-center justify-between gap-[6mm] bg-paper/60 px-[5mm] py-[3.5mm]">
                  <div className="min-w-0">
                    <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-ink/40">Phase {index + 1}</div>
                    <h2 className="mt-1 font-display text-[15pt] font-bold leading-tight">{phase.title || "Ohne Titel"}</h2>
                    {phase.shortDescription && (
                      <p className="mt-1.5 max-w-[125mm] whitespace-pre-wrap text-[8pt] leading-snug text-ink/60">{phase.shortDescription}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[13pt] font-bold">{startsAt}–{endsAt} Uhr</div>
                    <div className="mt-1 text-[8pt] font-bold text-ink/50">{phase.minutes || 0} Minuten</div>
                  </div>
                </div>
                <div className="print-phase-body grid grid-cols-2 gap-x-[6mm] gap-y-[4mm] p-[5mm] text-[9pt] leading-relaxed">
                  {isVisible(pdfConfig.phaseCompetencyGoal) && (
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Kompetenzorientiertes Teilziel</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.goal || "—"}</p>
                  </div>
                  )}
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Unterrichtsinhalt</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.content || "—"}</p>
                  </div>
                  {!isVisible(pdfConfig.phaseActions) ? (
                    <div className="col-span-2">
                      <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Moderationsnotizen</div>
                      <p className="mt-1 whitespace-pre-wrap">{phase.moderation || "—"}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Lehrhandlung</div>
                        <p className="mt-1 whitespace-pre-wrap">{phase.teacherAction || phase.moderation || "—"}</p>
                      </div>
                      <div>
                        <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Lernhandlung</div>
                        <p className="mt-1 whitespace-pre-wrap">{phase.studentAction || "—"}</p>
                      </div>
                      {isVisible(pdfConfig.phaseMethods) && (
                      <div className="col-span-2">
                        <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Methoden & Medien</div>
                        <p className="mt-1 whitespace-pre-wrap">{phase.methods || "—"}</p>
                      </div>
                      )}
                    </>
                  )}
                  {phase.differentiation === "Ja" && (
                    <div className="col-span-2 rounded-[3mm] bg-paper px-[4mm] py-[3mm]">
                      <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-clay">Differenzierung</div>
                      <div className="mt-1 grid grid-cols-2 gap-[5mm]">
                        <p><b>Nach oben:</b> {phase.differentiationDetails.up ? phase.differentiationDetails.upHow || "vorgesehen" : "nicht ausgewählt"}</p>
                        <p><b>Nach unten:</b> {phase.differentiationDetails.down ? phase.differentiationDetails.downHow || "vorgesehen" : "nicht ausgewählt"}</p>
                      </div>
                    </div>
                  )}
                </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {isVisible(pdfConfig.competencyProfile) && (
      <section className={`print-page print-competency-page ${hasVisibleFlowContent ? "" : "print-competency-after-cover"}`}>
        <PrintHeader page="Schlussseite" title="Handlungskompetenz" />
        <div className="mt-6">
          <div className="text-[8pt] font-bold uppercase tracking-[.18em] text-clay">Kompetenzprofil</div>
          <h1 className="mt-1 font-display text-[22pt] font-bold">Kompetenzprofil der Stunde</h1>
          <p className="mt-2 max-w-[155mm] text-[9pt] leading-relaxed text-ink/60">Die Matrix macht sichtbar, welche Facetten beruflicher Handlungskompetenz in den einzelnen Unterrichtsphasen angebahnt werden. Die Tiefe markiert das gewählte Niveau 1–4, die Farben verweisen auf die Phasen.</p>
        </div>
        <div className="mt-5"><CompetencyLandscape phases={plan.phases} compact /></div>
        <PrintFooter />
      </section>
      )}
    </div>
  );
}

function PrintHeader({ page, title }: { page: string; title: string }) {
  return (
    <div className="print-header flex items-center justify-between border-b border-ink/15 pb-[3mm]">
      <div className="flex items-center gap-[4mm]">
        <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth" className="h-[12mm] w-auto object-contain" />
        <div className="border-l border-ink/15 pl-[4mm]">
          <img src={SEMINAR_LOGO} alt="Seminar Metalltechnik" className="h-[13mm] w-auto max-w-[48mm] object-contain object-left" />
        </div>
        <div className="border-l border-ink/15 pl-[4mm]">
          <img src={UVP_STUDIO_LOGO} alt="UVP Studio" className="h-[12mm] w-auto max-w-[34mm] object-contain object-left" />
        </div>
      </div>
      <div className="text-right text-[7pt] font-bold uppercase tracking-[.16em] text-ink/45">{title}<br /><span className="text-clay">{page}</span></div>
    </div>
  );
}
function PrintFooter() {
  return (
    <div className="print-final-footer border-t border-clay/40 pt-2 text-center text-[6.5pt] text-ink/40">
      <span>{APP_FOOTER_TEXT}</span>
    </div>
  );
}
