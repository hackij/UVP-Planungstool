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
const SCHOOL_LOGO = "./bs1-logo-hell.png";
const SEMINAR_LOGO = "./seminar-metalltechnik-logo.png";
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
  { key: "wissen", label: "Wissen" }, { key: "wollen", label: "Wollen" }, { key: "koennen", label: "Können" },
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
  wissen: ["fachliche Grundlagen bereitstellen", "Vorwissen aktivieren", "Fachbegriffe sichern", "Zusammenhänge visualisieren", "Möglichkeiten zum Erklären und Begründen schaffen"],
  koennen: ["praktische oder anwendungsbezogene Aufgaben einsetzen", "vollständige Handlungen ermöglichen", "selbstständige Entscheidungen zulassen", "Übungs- und Transfergelegenheiten schaffen", "Ergebnisse prüfen und reflektieren lassen"],
  wollen: ["berufliche Verantwortung sichtbar machen", "authentische Handlungssituationen verwenden", "Entscheidungsfreiheit ermöglichen", "Qualitätsmaßstäbe transparent machen", "Reflexion über Folgen und Verantwortung anregen"],
};
const areaConsequenceSuggestions: Record<CompetencyArea, string[]> = {
  fach: [],
  selbst: ["individuelle Verantwortung übertragen", "Selbstkontrolle ermöglichen", "Reflexionsphasen einbauen", "Wahlmöglichkeiten anbieten", "Lernfortschritte sichtbar machen"],
  sozial: ["Partner- oder Gruppenarbeit nutzen", "klare Rollen vergeben", "kooperative Entscheidungen einfordern", "Kommunikationsregeln vereinbaren", "gemeinsame Verantwortung für Ergebnisse schaffen"],
};
const targetAudienceOptions: { key: TargetAudience; title: string; subtitle: string }[] = [
  { key: "students", title: "Studium", subtitle: "Vollständige Analyse- und Grobplanungsfassung" },
  { key: "ref-beginning", title: "Am Anfang des Referendariats", subtitle: "Reduziert, aber mit didaktischer Orientierung" },
  { key: "ref-advanced", title: "Im fortgeschrittenen Referendariat", subtitle: "Schlanker Planungsmodus mit optionaler Vertiefung" },
  { key: "in-service", title: "Im Dienst", subtitle: "Kompakte Planung für den Unterrichtsalltag" },
];
const targetAudienceKeys = targetAudienceOptions.map((option) => option.key);
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
    focus: "Können macht sichtbar, wie Lernende fachgerecht handeln oder ein Verfahren anwenden.",
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
  1: "Stufe 1: wiedergeben, wahrnehmen oder nachmachen – Grundlagen sichtbar machen.",
  2: "Stufe 2: erklären, einüben oder reagieren – Strukturen verstehen und angeleitet handeln.",
  3: "Stufe 3: anwenden, verfeinern oder Position beziehen – Transfer und begründete Entscheidungen ermöglichen.",
  4: "Stufe 4: Problemlösung, souveränes Handeln und verantwortliche Bewertung – komplex und selbstständig agieren.",
};

const planningFieldHelps = {
  globalGoal: {
    title: "Hilfe zum Globalziel",
    phase: "Grobplanung",
    purpose: "Das Globalziel bündelt, welches beruflich bedeutsame Können am Ende der Einheit sichtbar werden soll.",
    questions: ["In welcher Situation handeln die Lernenden?", "Welcher Inhalt oder Gegenstand steht im Mittelpunkt?", "Woran kann man das Lernen beobachten?"],
    pitfalls: ["nur ein Thema statt eines beobachtbaren Handelns nennen", "zu viele Ziele in einen Satz packen", "Methoden mit Zielen verwechseln"],
    tips: ["Situation, Inhalt und Verhalten knapp verbinden.", "Ein starkes Verb macht das Ziel prüf- und beobachtbar.", "Wissen, Können und Wollen können gemeinsam vorkommen."],
  },
  competencyNeed: {
    title: "Hilfe zum Kompetenzbedarf",
    phase: "Analyse",
    purpose: "Hier wird geklärt, welche Kompetenzfelder aus der beruflichen Anforderung besonders bedeutsam werden.",
    questions: ["Welche fachliche, personale oder soziale Herausforderung steckt in der Situation?", "Geht es vorrangig um Wissen, Können oder Wollen?", "Welche Stufe passt zum Anspruch der Stunde?"],
    pitfalls: ["alle Felder markieren", "Kompetenzstufen ohne Bezug zur Aufgabe wählen", "Zielformulierung und Methode vermischen"],
    tips: ["Wähle wenige tragende Kompetenzfelder.", "Formuliere anschließend konkret, was Lernende auf der Stufe zeigen sollen."],
  },
  learningContent: {
    title: "Hilfe zu Lerninhalten",
    phase: "Analyse",
    purpose: "Die Inhaltsanalyse hilft, fachliche Inhalte auszuwählen, zu ordnen und auf den beruflichen Handlungsanlass zu beziehen.",
    questions: ["Was ist fachlich unverzichtbar?", "Was kann reduziert oder später vertieft werden?", "Welche Inhalte tragen direkt zum Ziel bei?"],
    pitfalls: ["Stoffsammlung ohne Auswahl", "Inhalte ohne Bezug zur Handlungssituation", "zu viele Begriffe für eine Stunde"],
    tips: ["Ordne Inhalte räumlich oder bündle sie nach Funktion.", "Markiere Kerninhalte anders als Vertiefungen."],
  },
  prerequisites: {
    title: "Hilfe zu Lernvoraussetzungen",
    phase: "Analyse",
    purpose: "Die Adressatenanalyse übersetzt Beobachtungen zur Lerngruppe in konkrete didaktische Konsequenzen.",
    questions: ["Was können die Lernenden bereits?", "Was könnte den Lernprozess erschweren?", "Welche Konsequenzen ergeben sich für Aufgaben, Sprache, Sozialform oder Unterstützung?"],
    pitfalls: ["Defizite sammeln, ohne Konsequenzen abzuleiten", "Einzelfälle verallgemeinern", "Vorwissen überschätzen"],
    tips: ["Formuliere am Ende konkrete Konsequenzen für die Planung.", "Wähle nur Aspekte, die die Stunde tatsächlich beeinflussen."],
  },
  flow: {
    title: "Hilfe zum Unterrichtsverlaufplan",
    phase: "Feinplanung",
    purpose: "Der Verlauf verbindet Ziel, Inhalt, Lehr- und Lernhandlungen, Methoden, Medien und Zeit zu einem stimmigen Lernweg.",
    questions: ["Passt jede Phase zum Ziel?", "Ist sichtbar, was Lehrkraft und Lernende tun?", "Sind Übergänge und Sicherungen klar?"],
    pitfalls: ["Methoden ohne Zielbezug", "zu knappe Zeitansätze", "fehlende Sicherung oder Reflexion"],
    tips: ["Plane von den erwarteten Lernergebnissen her.", "Prüfe, ob Zeit, Methode und Medien das Ziel unterstützen."],
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
    id: "scaffolding",
    title: "Unterstützung und Öffnung",
    prompt: "Sind Hilfen, Materialien und Impulse passend dosiert und wird der Handlungsspielraum wieder geöffnet?",
    hint: "Struktur darf entlasten, sollte aber nicht dauerhaft alles vorgeben. Ziel bleibt zunehmend selbstständiges Situationshandeln.",
  },
  {
    id: "conditions",
    title: "Lernbedingungen",
    prompt: "Passen Aufträge, Medien, Raum, Zeit, Rückmeldungen und Unterstützungen zur Lernsituation?",
    hint: "Die Gestaltung soll Lernen wahrscheinlicher machen: klar, zugänglich, aber nicht unnötig geschlossen.",
  },
  {
    id: "transfer",
    title: "Sicherung und Transfer",
    prompt: "Werden Ergebnisse gesichert, fachlich geordnet und auf veränderte Fälle übertragbar gemacht?",
    hint: "Erst durch Sicherung, Reflexion und Transfer wird aus situativer Aufgabenlösung verfügbare Kompetenz.",
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
      consequences.length ? `Konsequenz für den Unterricht:\n${consequences.map((item) => `- ${item}`).join("\n")}` : "",
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
    return value ? normalizePlan(JSON.parse(value)) : initialPlan();
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
        <div className="bg-gradient-to-br from-white via-sky/10 to-clay/5 px-6 pb-5 pt-7 text-center">
          <img src={SEMINAR_LOGO} alt="Seminar Metalltechnik" className="mx-auto h-24 w-auto max-w-[320px] object-contain" />
          <h1 className="mt-5 font-display text-3xl font-bold text-moss">UVP Studio</h1>
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
  const importRef = useRef<HTMLInputElement>(null);
  const situationImageRef = useRef<HTMLInputElement>(null);

  const totalMinutes = useMemo(() => plan.phases.reduce((sum, p) => sum + Number(p.minutes || 0), 0), [plan.phases]);
  const checkedCriteria = useMemo(() => Object.values(plan.criteriaChecks).filter(Boolean).length, [plan.criteriaChecks]);
  const selected = plan.phases.find((p) => p.id === selectedId) ?? plan.phases[0];
  const isStudentMode = plan.targetAudience === "students";
  const isInServiceMode = plan.targetAudience === "in-service";
  const isAdvancedRefMode = plan.targetAudience === "ref-advanced";
  const showObservationTask = !isStudentMode;
  const showExtendedBlocks = !isInServiceMode && (isStudentMode || compactDetailsOpen);
  const showMindmap = !isInServiceMode && (isStudentMode || (plan.targetAudience === "ref-beginning" && compactDetailsOpen));
  const showCoreAnalyses = !isInServiceMode;
  const showCompactOptionalBlocks = !isInServiceMode && (isAdvancedRefMode || compactDetailsOpen);
  const showContentBubbleBoard = isStudentMode || plan.targetAudience === "ref-beginning";
  const showCompactLearningContent = plan.targetAudience === "ref-advanced";
  const showContextAnalysis = isStudentMode || plan.targetAudience === "ref-beginning";
  const showCompactContentFrame = isAdvancedRefMode || isInServiceMode;
  const showDirectResources = isStudentMode || plan.targetAudience === "ref-beginning";
  const showExtendedOrganization = isStudentMode || plan.targetAudience === "ref-beginning";
  const useCompactFlowTitle = isInServiceMode || isAdvancedRefMode;

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
    if (!criteriaOpen && !verbCatalogOpen && !usmOpen && activeUsmItem == null && !competenceModelOpen && activeCompetenceItem == null && !hkmOpen && !aboutOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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
  }, [criteriaOpen, verbCatalogOpen, usmOpen, activeUsmItem, competenceModelOpen, activeCompetenceItem, hkmOpen, aboutOpen]);

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
  };

  const updatePlan = <K extends keyof Plan>(key: K, value: Plan[K]) => setPlan((old) => ({ ...old, [key]: value }));
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

  const updateCompetency = (area: CompetencyArea, dimension: CompetencyDimension, value: number) => {
    if (!selected) return;
    updatePhase(selected.id, {
      competencies: {
        ...selected.competencies,
        [area]: { ...selected.competencies[area], [dimension]: value },
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
    if (situationImageRef.current) situationImageRef.current.value = "";
  };

  const renderCompactContentFrame = () => (
    <section className="mt-6 rounded-[2rem] border border-moss/15 bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Inhaltliche Ausrichtung</div>
          <h2 className="font-display text-2xl font-bold">Inhaltliche Rahmenbedingungen</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/50">Kompakte Klärung von Thema, beruflichem Handlungsanlass und Ziel der Unterrichtseinheit.</p>
        </div>
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
        <label className="block rounded-2xl border border-ink/10 bg-paper/60 p-4">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Berufliche Anforderung</span>
          <textarea
            aria-label="Berufliche Anforderung"
            className="min-h-[132px] w-full rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
            placeholder="Welche berufliche Anforderung, welcher Auftrag oder welches Problem bildet den Handlungsanlass?"
            value={plan.situationDescription}
            onChange={(event) => updatePlan("situationDescription", event.target.value)}
          />
        </label>
        {!isInServiceMode && (
          <div className="lg:col-span-2">
            <LearningSituationReflection
              checks={plan.learningSituationChecks}
              onUpdate={updateLearningSituationCheck}
            />
          </div>
        )}
        <label className="block rounded-2xl border border-moss/15 bg-sky/10 p-4">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-moss">Globalziel der Unterrichtseinheit</span>
          <textarea
            aria-label="Globalziel der Unterrichtseinheit"
            className="min-h-[132px] w-full rounded-xl border border-ink/10 bg-white/80 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
            placeholder="Die Lernenden können …"
            value={plan.globalGoal}
            onChange={(event) => updatePlan("globalGoal", event.target.value)}
          />
          {!isInServiceMode && (
            <div className="mt-3 grid gap-2">
              <FieldHelp {...planningFieldHelps.globalGoal} />
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
      <div className="app-shell flex min-h-screen flex-col bg-paper">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 text-ink shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-3 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-5">
                <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth und Technikerschule" className="h-12 w-auto max-w-[180px] shrink-0 object-contain sm:h-16 sm:max-w-[238px]" />
                <div className="hidden h-14 w-px bg-ink/10 sm:block lg:h-16" aria-hidden="true" />
                <div className="flex min-w-0 items-center gap-5 sm:gap-6">
                  <img
                    src={SEMINAR_LOGO}
                    alt="Seminar Metalltechnik"
                    className="h-16 w-auto max-w-[230px] shrink-0 object-contain object-left sm:h-20 sm:max-w-[330px] lg:h-24 lg:max-w-[390px]"
                  />
                  <div>
                    <div className="font-display text-xl font-bold uppercase leading-none text-moss sm:text-2xl lg:text-3xl">UVP Studio</div>
                    <div className="mt-1 text-xs font-semibold text-ink/45">Unterricht professionell planen</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-xs font-medium text-ink/45 sm:inline-flex">
                  {saved ? <Check size={14} /> : <Save size={14} className="animate-pulse" />}
                  {saved ? "Lokal gespeichert" : "Speichert …"}
                </span>
                <button aria-label="Menü öffnen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-paper xl:hidden" onClick={() => setMobileNav(!mobileNav)}>
                  {mobileNav ? <X /> : <Menu />}
                </button>
              </div>
            </div>

            <div className="hidden items-center justify-between gap-4 rounded-[1.35rem] border border-ink/10 bg-paper/80 px-3 py-2 shadow-sm xl:flex">
              <nav className="flex items-center gap-1" aria-label="Hauptmenü">
                <MenuDropdown label="Projekt">
                  <MenuInfo label="Aktueller Planungsstand" value={targetAudienceOptions.find((option) => option.key === plan.targetAudience)?.title ?? "—"} />
                  <MenuItemButton tone="danger" icon={<RotateCcw size={15} />} onClick={resetPlan}>Planung zurücksetzen</MenuItemButton>
                  <MenuItemButton icon={<X size={15} />} onClick={lockAccess}>Zugang sperren</MenuItemButton>
                  <MenuDivider />
                  <MenuComingSoon>Einstellungen vorbereitet</MenuComingSoon>
                </MenuDropdown>
                <MenuDropdown label="Datei">
                  <MenuItemButton icon={<Upload size={15} />} onClick={() => importRef.current?.click()}>JSON importieren</MenuItemButton>
                  <MenuItemButton icon={<Download size={15} />} onClick={exportJson}>JSON exportieren</MenuItemButton>
                  <MenuItemButton icon={<FileDown size={15} />} onClick={() => window.print()}>PDF exportieren</MenuItemButton>
                </MenuDropdown>
                <MenuDropdown label="Modelle">
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
                <MenuDropdown label="KI">
                  <MenuComingSoon>Demnächst verfügbar</MenuComingSoon>
                  <MenuDivider />
                  <MenuComingSoon>KI-Unterrichtscoach</MenuComingSoon>
                  <MenuComingSoon>KI-Review</MenuComingSoon>
                  <MenuComingSoon>KI-Analyse</MenuComingSoon>
                  <MenuComingSoon>KI-Unterrichtsentwurf optimieren</MenuComingSoon>
                </MenuDropdown>
                <MenuDropdown label="Hilfe">
                  <MenuItemButton icon={<BookOpen size={15} />} onClick={() => setAboutOpen(true)}>Über UVP Studio</MenuItemButton>
                  <MenuDivider />
                  <MenuComingSoon>Glossar</MenuComingSoon>
                  <MenuComingSoon>Tutorials</MenuComingSoon>
                  <MenuComingSoon>Hilfeblöcke</MenuComingSoon>
                  <MenuComingSoon>Versionshinweise</MenuComingSoon>
                </MenuDropdown>
              </nav>
              <label className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/55 shadow-sm">
                Planungsstand
                <select
                  className="max-w-[240px] bg-transparent text-xs font-bold text-ink outline-none"
                  value={plan.targetAudience}
                  onChange={(event) => updatePlan("targetAudience", event.target.value as TargetAudience)}
                >
                  {targetAudienceOptions.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
                </select>
              </label>
            </div>
          </div>
          {mobileNav && (
            <div className="grid gap-3 border-t border-ink/10 bg-white p-4 xl:hidden">
              <label className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-ink/45">
                Planungsstand
                <select
                  className="mt-2 w-full bg-transparent text-sm font-bold normal-case tracking-normal text-ink outline-none"
                  value={plan.targetAudience}
                  onChange={(event) => updatePlan("targetAudience", event.target.value as TargetAudience)}
                >
                  {targetAudienceOptions.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink/10 bg-paper/70 p-3">
                  <div className="label">Projekt</div>
                  <button className="icon-btn mt-2 w-full justify-start border-clay/25 text-clay" onClick={resetPlan}><RotateCcw size={16} />Planung zurücksetzen</button>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={lockAccess}><X size={16} />Zugang sperren</button>
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
                  <div className="label">KI & Hilfe</div>
                  <button className="icon-btn mt-2 w-full justify-start" onClick={() => { setAboutOpen(true); setMobileNav(false); }}><BookOpen size={16} />Über UVP Studio</button>
                  <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink/40">KI-Funktionen, Glossar, Tutorials und Versionshinweise: demnächst verfügbar</div>
                </div>
              </div>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <section className="rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
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
              {showExtendedOrganization && (
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Anzahl der Schülerinnen und Schüler</span>
                <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 24" value={plan.studentCount} onChange={(event) => updatePlan("studentCount", event.target.value)} />
              </label>
              )}
              {showExtendedOrganization && (
                <>
                  <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4 lg:col-span-2">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Zeitlicher Umfang</span>
                    <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 90 Min" value={plan.lessonDuration} onChange={(e) => updatePlan("lessonDuration", e.target.value)} />
                  </label>
                  <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4 sm:col-span-2 lg:col-span-3">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Weitere organisatorische Rahmenbedingungen</span>
                    <textarea className="min-h-16 w-full bg-transparent text-sm leading-relaxed outline-none placeholder:text-ink/25" placeholder="Raum, Gruppengröße, besondere Ressourcen, Einschränkungen …" value={plan.organizationNotes} onChange={(e) => updatePlan("organizationNotes", e.target.value)} />
                  </label>
                </>
              )}
            </div>
          </section>

          {showCompactContentFrame && renderCompactContentFrame()}

          {!isInServiceMode && (
          <section className="relative mt-6 overflow-hidden rounded-[2.25rem] border border-ink/10 bg-white/70 p-4 text-ink shadow-soft sm:p-6 lg:p-7">
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
                <PlanningAccordion title="Kontextanalyse">
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
                        {(showCoreAnalyses || isInServiceMode) && (
                        <div className={`mb-5 grid gap-4 ${showCoreAnalyses ? "sm:grid-cols-[minmax(0,1fr)_220px]" : "sm:grid-cols-[minmax(0,280px)]"}`}>
                          {showCoreAnalyses && (
                          <label className="block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Berufliche Anforderung</span>
                            <textarea
                              aria-label="Berufliche Anforderung"
                              className="min-h-[132px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
                              placeholder="Welche berufliche Anforderung, welcher Auftrag oder welches Problem bildet den Handlungsanlass?"
                              value={plan.situationDescription} onChange={(e) => updatePlan("situationDescription", e.target.value)}
                            />
                          </label>
                          )}
                          <div>
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Datei der Einstiegssituation</span>
                            <input
                              ref={situationImageRef}
                              className="hidden"
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                              aria-label="Datei der Einstiegssituation auswählen"
                              onChange={(event) => uploadSituationImage(event.target.files?.[0])}
                            />
                            {plan.situationImageDataUrl ? (
                              <div className="group relative h-[132px] overflow-hidden rounded-2xl border border-ink/10 bg-paper">
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
                                      aria-label="Datei der Einstiegssituation ersetzen"
                                      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition hover:bg-white"
                                      onClick={() => situationImageRef.current?.click()}
                                    >
                                      <ImagePlus size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Datei der Einstiegssituation entfernen"
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
                                className="flex h-[132px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-paper/60 px-4 text-center transition hover:border-moss hover:bg-sky/5"
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
                        </div>
                        )}
                        <div className="mb-5">
                          <LearningSituationReflection
                            checks={plan.learningSituationChecks}
                            onUpdate={updateLearningSituationCheck}
                          />
                        </div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">{isInServiceMode ? "Gesamtziel der Unterrichtseinheit" : "Globalziel der Unterrichtseinheit"}</label>
                        <textarea
                          aria-label="Globalziel"
                          className="min-h-[88px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss sm:text-xl"
                          placeholder="Die Lernenden können …"
                          value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                        />
                        <div className="mt-3 grid gap-2">
                          <FieldHelp {...planningFieldHelps.globalGoal} />
                          <GoalAssistantPanel
                            value={plan.goalAssistant}
                            globalGoal={plan.globalGoal}
                            onChange={updateGoalAssistant}
                            onApply={applyGoalSuggestion}
                          />
                        </div>
                      </div>
                    </div>
                  </PlanningSubAccordion>
                  {showDirectResources && (
                    <PlanningSubAccordion title="Direkte Vorgaben und Ressourcen berücksichtigen">
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
                )}

                <PlanningAccordion title="Kompetenzorientierte Sachanalyse">
                  {showCoreAnalyses && (
                    <PlanningSubAccordion title="Kompetenzbedarf ermitteln">
                      <FieldHelp {...planningFieldHelps.competencyNeed} />
                      <CompetencyNeedCoach
                        value={plan.competencyNeedAnalysis}
                        compact={isAdvancedRefMode}
                        onChange={(value) => updatePlan("competencyNeedAnalysis", value)}
                      />
                    </PlanningSubAccordion>
                  )}
                  <PlanningSubAccordion title="Lerninhalte analysieren, strukturieren und auswählen">
                    <FieldHelp {...planningFieldHelps.learningContent} />
                    {showContentBubbleBoard && (
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

                {showCoreAnalyses && (
                  <PlanningAccordion title={isAdvancedRefMode ? "Notizen zu den Adressaten" : "Adressatenanalyse"}>
                    <PlanningSubAccordion title={isAdvancedRefMode ? "Aktuelle Beobachtungen und Hinweise" : "Lernvoraussetzungen erfassen und analysieren"}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs leading-relaxed text-ink/50">
                          {isAdvancedRefMode ? "Kurze Notizen zu Besonderheiten, Veränderungen oder aktuellen Hinweisen der Lerngruppe." : "Was bringen die Lernenden fachlich, sprachlich, methodisch und sozial mit?"}
                        </p>
                      </div>
                      <FieldHelp {...planningFieldHelps.prerequisites} />
                      {isAdvancedRefMode ? (
                        <label className="block">
                          <span className="label">Notizen zu den Adressaten</span>
                          <textarea
                            className="field min-h-28"
                            value={plan.learningPrerequisites.compact}
                            onChange={(event) => updateLearningPrerequisite("compact", event.target.value)}
                            placeholder="Besondere Beobachtungen, Veränderungen, einzelne Hinweise oder aktuelle Unterstützungsbedarfe …"
                          />
                        </label>
                      ) : (
                        <LearningPrerequisitesCoach
                          value={plan.learningPrerequisites}
                          onChange={updateLearningPrerequisites}
                        />
                      )}
                    </PlanningSubAccordion>
                  </PlanningAccordion>
                )}

              </div>
            </div>
          </section>
          )}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">{useCompactFlowTitle ? "Schnellplanung" : "Unterrichtsgrobkonzept"}</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">{useCompactFlowTitle ? "Unterrichtsverlaufplan" : "Päd.-didaktische Synthese (Grobkonzept)"}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/50">{useCompactFlowTitle ? "Kompakter Unterrichtsverlaufplan für den Unterrichtsalltag." : "Der Unterrichtsverlaufplan als roter Faden der Stunde."}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
            <div className="mb-4 grid gap-2">
              <FieldHelp {...planningFieldHelps.flow} />
              <QualityReflectionPanel plan={plan} totalMinutes={totalMinutes} />
            </div>
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
                        className={`relative z-10 rounded-[2rem] border bg-white text-left transition duration-300 ${isEntry ? "min-h-64 w-72" : "min-h-56 w-60"} ${active ? "scale-[1.025] shadow-soft" : "border-ink/10 hover:-translate-y-1 hover:shadow-soft"} ${dragging ? "opacity-35" : "opacity-100"}`}
                        style={active ? { borderColor: phase.color, boxShadow: `0 18px 45px ${phase.color}22` } : undefined}
                      >
                        <div className={`flex min-h-[inherit] w-full flex-col justify-between text-left ${isEntry ? "p-5" : "p-4"}`} onClick={() => setSelectedId(phase.id)}>
                          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] opacity-90" style={{ background: phase.color }} />
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
                              <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold"><Clock3 size={13} />{phase.minutes} Min</div>
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
                <div className="grid gap-5 sm:grid-cols-2">
                  <label><span className="label">Phasen-Titel</span><input className="field" value={selected.title} onChange={(e) => updatePhase(selected.id, { title: e.target.value })} /></label>
                  <label><span className="label">Zeit in Minuten</span><input className="field" min="1" max="240" type="number" value={selected.minutes} onChange={(e) => updatePhase(selected.id, { minutes: Math.max(0, Number(e.target.value)) })} /></label>
                  {!isInServiceMode && (
                  <label className="sm:col-span-2"><span className="label">Kurzbeschreibung der Phase</span><textarea className="field min-h-16" placeholder="Welche Funktion hat diese Phase im Unterrichtsverlauf?" value={selected.shortDescription} onChange={(e) => updatePhase(selected.id, { shortDescription: e.target.value })} /></label>
                  )}
                  <label className="sm:col-span-2"><span className="label">Kompetenzorientierte Zielformulierung</span><textarea className="field min-h-20" placeholder="Die Lernenden können …" value={selected.goal} onChange={(e) => updatePhase(selected.id, { goal: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Unterrichtsinhalt</span><textarea className="field min-h-24" placeholder="Was wird in dieser Phase fachlich thematisiert?" value={selected.content} onChange={(e) => updatePhase(selected.id, { content: e.target.value })} /></label>
                  {isInServiceMode ? (
                    <>
                      <label className="sm:col-span-2"><span className="label">Moderationsnotizen</span><textarea className="field min-h-28" placeholder="Welche Hinweise, Impulse oder Übergänge möchtest du dir für die Durchführung merken?" value={selected.moderation} onChange={(e) => updatePhase(selected.id, { moderation: e.target.value })} /></label>
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          className="rounded-full border border-ink/10 bg-paper px-4 py-2 text-xs font-bold text-ink/55 transition hover:border-moss hover:bg-sky/10 hover:text-ink"
                          onClick={() => setServiceMethodsOpen((value) => !value)}
                        >
                          {serviceMethodsOpen ? "Methoden & Material ausblenden" : "Methoden & Material anzeigen"}
                        </button>
                        {serviceMethodsOpen && (
                          <label className="mt-3 block"><span className="label">Methoden & Material</span><textarea className="field min-h-28" placeholder="z. B. Methode, Medien, Material, Sozialform …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                  <label><span className="label">Lehrhandlung</span><textarea className="field min-h-28" placeholder="Was tut die Lehrkraft? Impulse, Strukturierung, Begleitung …" value={selected.teacherAction} onChange={(e) => updatePhase(selected.id, { teacherAction: e.target.value, moderation: e.target.value })} /></label>
                  <label><span className="label">Lernhandlung</span><textarea className="field min-h-28" placeholder="Was tun die Schülerinnen und Schüler? Denken, handeln, kooperieren …" value={selected.studentAction} onChange={(e) => updatePhase(selected.id, { studentAction: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Methoden & Material</span><textarea className="field min-h-28" placeholder="z. B. Think–Pair–Share, Impulskarte …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
                    </>
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

              {!isInServiceMode && (
              <div className="card overflow-hidden">
                <button className="flex w-full items-center justify-between p-5 text-left sm:p-7" onClick={() => setMatrixOpen(!matrixOpen)}>
                  <div><div className="label !mb-1">Kompetenzprofil</div><h3 className="font-display text-2xl font-bold">Wissen · Wollen · Können</h3></div>
                  <Grid3X3 size={22} />
                </button>
                {matrixOpen && (
                  <div className="border-t border-ink/10 px-5 pb-6 pt-5 sm:px-7">
                    <p className="mb-5 text-xs leading-relaxed text-ink/50">Wähle je Kompetenzfeld das angestrebte Niveau. 0 bedeutet: in dieser Phase nicht fokussiert.</p>
                    <div className="mb-5">
                      <span className="label">Verben-Katalog nach Müller</span>
                      <div className="grid grid-cols-3 gap-2">
                        {VERB_CATALOG.map((dimension) => (
                          <button
                            key={dimension.key}
                            onClick={() => setVerbCatalogOpen(dimension.key)}
                            className="rounded-xl border border-ink/10 bg-paper px-2 py-2.5 text-center text-[11px] font-bold transition hover:border-moss hover:bg-moss hover:text-white"
                          >
                            {dimension.code} · {dimension.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-[76px_repeat(3,1fr)] gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-ink/45">
                      <span />
                      {dimensions.map((d) => <span key={d.key}>{d.label}</span>)}
                      {areas.map((area) => (
                        <Fragment key={area.key}>
                          <div className="flex items-center text-left text-[11px] normal-case tracking-normal text-ink/70">{area.short}</div>
                          {dimensions.map((dimension) => (
                            <select
                              aria-label={`${area.label} ${dimension.label}`}
                              key={`${area.key}-${dimension.key}`}
                              value={selected.competencies?.[area.key]?.[dimension.key] ?? 0}
                              onChange={(e) => updateCompetency(area.key, dimension.key, Number(e.target.value))}
                              className="rounded-xl border border-ink/10 bg-paper px-1 py-2 text-center text-xs font-bold outline-none focus:border-moss"
                            >
                              {[0, 1, 2, 3, 4].map((level) => <option value={level} key={level}>{level === 0 ? "–" : `Niveau ${level}`}</option>)}
                            </select>
                          ))}
                        </Fragment>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
                      <span className="text-xs font-semibold text-ink/60">Aktive Felder</span>
                      <div className="flex gap-1.5">
                        {areas.flatMap((a) => dimensions.map((d) => selected.competencies?.[a.key]?.[d.key] ?? 0)).map((v, i) => (
                          <span key={i} className={`h-2.5 w-2.5 rounded-full ${v ? "" : "bg-ink/10"}`} style={v ? { background: selected.color, opacity: .35 + v * .16 } : {}} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}
            </section>
          )}

          {showObservationTask && (
            <ObservationTaskPanel
              enabled={plan.observationEnabled}
              task={plan.observationTask}
              onEnabledChange={(value) => updatePlan("observationEnabled", value)}
              onTaskChange={(value) => updatePlan("observationTask", value)}
            />
          )}

          {!isInServiceMode && (
          <section className="mb-8 mt-8 overflow-hidden rounded-[2rem] border border-ink/10 bg-white p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><div className="label">Gesamtbild</div><h2 className="font-display text-2xl font-bold sm:text-3xl">Handlungskompetenzmatrix</h2></div>
              <span className="text-xs text-ink/45">Handlungskompetenzmatrix nach Prof. Dr. Manfred Müller</span>
            </div>
            <CompetencyLandscape phases={plan.phases} />
          </section>
          )}
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
          onClose={() => {
            setCompetenceModelOpen(false);
            setActiveCompetenceItem(null);
          }}
        />
      )}
      {hkmOpen && (
        <HkmModelModal onClose={() => setHkmOpen(false)} />
      )}
      {aboutOpen && (
        <AboutModal onClose={() => setAboutOpen(false)} />
      )}
      <PrintDocument plan={plan} totalMinutes={totalMinutes} />
    </>
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
  const commit = (next: CompetencyNeedAnalysis, refreshSummary = true) => {
    onChange(refreshSummary ? { ...next, summary: buildCompetencyNeedSummary(next) } : next);
  };

  const toggleField = (fieldId: CompetencyFieldId) => {
    const selected = value.selectedFields.includes(fieldId);
    const selectedFields = selected ? value.selectedFields.filter((item) => item !== fieldId) : [...value.selectedFields, fieldId];
    const entries = selected
      ? Object.fromEntries(Object.entries(value.entries).filter(([key]) => key !== fieldId)) as CompetencyNeedAnalysis["entries"]
      : { ...value.entries, [fieldId]: value.entries[fieldId] ?? defaultCompetencyNeedEntry() };
    const selectedLevels = selected
      ? Object.fromEntries(Object.entries(value.selectedLevels).filter(([key]) => key !== fieldId)) as CompetencyNeedAnalysis["selectedLevels"]
      : value.selectedLevels;
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

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-[1.35rem] border border-ink/10 bg-paper/50 p-4 xl:grid-cols-[minmax(420px,1.05fr)_minmax(340px,.95fr)]">
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
          <CompetencyNeedMatrix selectedFields={value.selectedFields} selectedLevels={value.selectedLevels} />
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <div className="mb-3">
            <div className="label">1 · Handlungskompetenzbereich und 2 · Handlungsdimension</div>
            <p className="text-xs leading-relaxed text-ink/50">Wähle zuerst den Kompetenzbereich und darin die passende Handlungsdimension. Die Matrix bleibt dabei vollständig sichtbar.</p>
          </div>
          <div className="grid gap-3">
            {areas.map((area) => (
              <section key={area.key} className="rounded-2xl border border-ink/10 bg-paper/50 p-3">
                <div className="mb-3 rounded-xl bg-white px-3 py-2 font-display text-lg font-bold text-ink shadow-sm">
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
                        className={`flex min-h-14 flex-col items-start justify-between rounded-2xl border px-3 py-2 text-left transition ${active ? "border-moss/35 bg-sky/25 text-ink shadow-sm" : "border-ink/10 bg-white text-ink/65 hover:border-moss/30 hover:bg-sky/10"}`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[.13em] text-ink/40">Dimension</span>
                        <span className="flex w-full items-center justify-between gap-2 text-base font-black">
                          {dimension.label}
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${active ? "bg-moss text-white" : "bg-paper text-ink/25"}`}>
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

      {value.selectedFields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-4 py-5 text-sm text-ink/50">Wähle mindestens ein Feld in der Matrix oder über die Chips aus, um die Kompetenzanalyse zu starten.</div>
      ) : (
        <div className="grid gap-3">
          {value.selectedFields.map((fieldId) => {
            const parsed = parseCompetencyFieldId(fieldId);
            if (!parsed) return null;
            const entry = { ...defaultCompetencyNeedEntry(), ...(value.entries[fieldId] ?? {}) };
            const clarificationSuggestions = competencyClarificationSuggestions[fieldId];
            const consequences = Array.from(new Set([
              ...dimensionConsequenceSuggestions[parsed.dimension],
              ...areaConsequenceSuggestions[parsed.area],
            ]));
            const selectedLevel = (value.selectedLevels[fieldId] ?? [])[0];
            return (
              <details key={fieldId} open={!compact || value.selectedFields.length === 1} className="group/need overflow-hidden rounded-[1.35rem] border border-ink/10 bg-white [&:not([open])>.need-content]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
                  <div>
                    <div className="text-sm font-bold text-ink">{competencyFieldLabel(fieldId)}</div>
                    <div className="mt-0.5 text-xs text-ink/45">Kompetenzbedarf, Konkretisierung und Unterrichtskonsequenzen</div>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink/35 transition group-open/need:rotate-90 group-open/need:bg-moss group-open/need:text-white">
                    <ChevronRight size={15} />
                  </span>
                </summary>
                <div className="need-content grid gap-5 border-t border-ink/10 p-4">
                  <CompetencyFormulationHint area={parsed.area} dimension={parsed.dimension} level={selectedLevel} />

                  <section>
                    <div className="label">3 · Kompetenzstufe auswählen</div>
                    <p className="mb-3 text-sm font-semibold leading-relaxed text-ink/70">Standardmäßig wird eine eindeutige Stufe pro ausgewähltem Kompetenzfeld gewählt.</p>
                    <div className="grid gap-2 sm:grid-cols-4">
                      {[1, 2, 3, 4].map((level) => {
                        const active = selectedLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setLevel(fieldId, level)}
                            className={`min-h-12 rounded-2xl border px-3 py-2 text-sm font-black transition ${active ? "border-clay bg-clay text-white shadow-sm" : "border-ink/10 bg-paper text-ink/60 hover:border-clay/35 hover:bg-white hover:text-ink"}`}
                          >
                            Stufe {level}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {selectedLevel ? (
                    <section className="grid gap-3 rounded-2xl border border-moss/15 bg-sky/5 p-4">
                      <label className="block">
                        <span className="label">4 · Konkretes Ziel zur gewählten Stufe</span>
                        <span className="mb-2 block text-sm font-semibold leading-relaxed text-ink/70">Was sollen die Schülerinnen und Schüler auf dieser Kompetenzstufe konkret erreichen?</span>
                        <textarea
                          className="field min-h-24 bg-white"
                          value={entry.levelGoal}
                          onChange={(event) => updateEntry(fieldId, { levelGoal: event.target.value })}
                          placeholder="Die Schülerinnen und Schüler …"
                        />
                      </label>
                      <label className="block">
                        <span className="label">Eigene Beschreibung der Stufe ergänzen</span>
                        <textarea
                          className="field min-h-16 bg-white"
                          value={entry.levelDescription}
                          onChange={(event) => updateEntry(fieldId, { levelDescription: event.target.value })}
                          placeholder="Optional: Was bedeutet diese Stufe in deiner konkreten beruflichen Handlungssituation?"
                        />
                      </label>
                    </section>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-ink/15 bg-paper/60 px-4 py-3 text-sm font-semibold text-ink/45">
                      Wähle eine Kompetenzstufe aus, damit Zielformulierung und Unterrichtskonsequenzen sichtbar werden.
                    </div>
                  )}

                  {selectedLevel && (
                  <section>
                    <div className="label">Zusätzliche Konkretisierung</div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {clarificationSuggestions.map((suggestion) => (
                        <DiagnosticCheckbox
                          key={suggestion}
                          label={suggestion}
                          checked={entry.selectedClarifications.includes(suggestion)}
                          onChange={() => toggleEntryListItem(fieldId, "selectedClarifications", suggestion)}
                        />
                      ))}
                    </div>
                    <label className="mt-3 block">
                      <span className="label">Eigene Formulierung ergänzen</span>
                      <textarea
                        className="field min-h-20"
                        value={entry.customClarification}
                        onChange={(event) => updateEntry(fieldId, { customClarification: event.target.value })}
                        placeholder="Welche konkrete Formulierung passt zu deiner Unterrichtseinheit?"
                      />
                    </label>
                  </section>
                  )}

                  {selectedLevel && (
                  <section>
                    <div className="label">5 · Konsequenzen für die Unterrichtsgestaltung</div>
                    <p className="mb-3 text-sm font-semibold text-ink/70">Welche Konsequenzen ergeben sich daraus für die Gestaltung des Unterrichts?</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {consequences.map((suggestion) => (
                        <DiagnosticCheckbox
                          key={suggestion}
                          label={suggestion}
                          checked={entry.selectedConsequences.includes(suggestion)}
                          onChange={() => toggleEntryListItem(fieldId, "selectedConsequences", suggestion)}
                        />
                      ))}
                    </div>
                    <label className="mt-3 block">
                      <span className="label">Eigene Konsequenz ergänzen</span>
                      <textarea
                        className="field min-h-20"
                        value={entry.customConsequence}
                        onChange={(event) => updateEntry(fieldId, { customConsequence: event.target.value })}
                        placeholder="Welche zusätzliche Konsequenz ergibt sich für deine konkrete Planung?"
                      />
                    </label>
                  </section>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <label className="block rounded-[1.35rem] border border-moss/15 bg-sky/5 p-4">
        <span className="label">Kompetenzbedarf der Unterrichtseinheit</span>
        <textarea
          className="field min-h-40 bg-white"
          value={value.summary}
          onChange={(event) => commit({ ...value, summary: event.target.value }, false)}
          placeholder="Ausgewählte Kompetenzfelder, Kompetenzbedarfe, Konkretisierungen und Konsequenzen werden hier automatisch zusammengeführt und bleiben bearbeitbar."
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
  const cellWidth = 150;
  const rowHeight = 92;
  const depthX = 92;
  const depthY = 54;
  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-inner">
      <svg viewBox="0 0 860 430" className="min-w-[760px]" role="img" aria-label="Handlungskompetenzmatrix nach Prof. Dr. Manfred Müller mit markierten Kompetenzfeldern">
        <rect x="330" y="8" width="300" height="36" rx="8" fill="#fff" stroke="#174a87" strokeOpacity=".25" />
        <text x="480" y="31" textAnchor="middle" fill="#174a87" fontSize="18" fontWeight="800">Handlungsdimensionen</text>
        <rect x="24" y="112" width="30" height="230" rx="7" fill="#fff" stroke="#174a87" strokeOpacity=".25" />
        <text x="43" y="228" transform="rotate(-90 43 228)" textAnchor="middle" fill="#174a87" fontSize="13" fontWeight="800">Handlungskompetenzbereiche</text>

        {landscapeDimensions.map((dimension, index) => (
          <g key={dimension.key}>
            <rect x={230 + index * cellWidth} y="62" width={cellWidth - 12} height="52" rx="8" fill="#fff" stroke="#0c2340" strokeOpacity=".18" />
            <text x={230 + index * cellWidth + (cellWidth - 12) / 2} y="84" textAnchor="middle" fill="#0c2340" fontSize="11">{dimension.label.split(":")[0]}</text>
            <text x={230 + index * cellWidth + (cellWidth - 12) / 2} y="103" textAnchor="middle" fill="#0c2340" fontSize="19" fontWeight="800">{dimension.label.split(": ")[1]}</text>
          </g>
        ))}

        {areas.map((area, rowIndex) => (
          <g key={area.key}>
            <rect x="72" y={132 + rowIndex * rowHeight} width="136" height={rowHeight - 12} rx="8" fill="#fff" stroke="#0c2340" strokeOpacity=".14" />
            <text x="140" y={177 + rowIndex * rowHeight} textAnchor="middle" fill="#0c2340" fontSize="13" fontWeight="800">{area.label}</text>
            {landscapeDimensions.map((dimension, columnIndex) => {
              const fieldId = `${area.key}-${dimension.key}` as CompetencyFieldId;
              const selected = selectedFields.includes(fieldId);
              return (
                <g key={fieldId}>
                  {[4, 3, 2, 1].map((level) => {
                    const t = (level - 1) / 5;
                    const levelActive = (selectedLevels[fieldId] ?? []).includes(level);
                    return (
                      <rect
                        key={level}
                        x={230 + columnIndex * cellWidth + depthX * t}
                        y={132 + rowIndex * rowHeight - depthY * t}
                        width={cellWidth - 22}
                        height={rowHeight - 22}
                        rx="5"
                        fill={selected ? "#d8e7f7" : "#f4f6f8"}
                        stroke={levelActive ? "#d55e00" : selected ? "#174a87" : "#0c2340"}
                        strokeOpacity={levelActive ? ".95" : selected ? ".42" : ".12"}
                        strokeWidth={levelActive ? "2.4" : "1.2"}
                        opacity={selected ? 0.82 : 0.5}
                      />
                    );
                  })}
                  <rect
                    x={230 + columnIndex * cellWidth}
                    y={132 + rowIndex * rowHeight}
                    width={cellWidth - 22}
                    height={rowHeight - 22}
                    rx="6"
                    fill={selected ? "#174a87" : "#ffffff"}
                    fillOpacity={selected ? ".88" : ".72"}
                    stroke={selected ? "#0c2340" : "#0c2340"}
                    strokeOpacity={selected ? ".22" : ".13"}
                  />
                  <text x={230 + columnIndex * cellWidth + (cellWidth - 22) / 2} y={172 + rowIndex * rowHeight} textAnchor="middle" fill={selected ? "#fff" : "#0c2340"} fontSize="12" fontWeight="800">
                    {selected ? "markiert" : "—"}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
        {[1, 2, 3, 4].map((level, index) => (
          <g key={level}>
            <rect x={660 + index * 36} y={368 - index * 10} width="26" height="30" rx="4" fill="#fff" stroke="#0c2340" strokeOpacity=".22" />
            <text x={673 + index * 36} y={388 - index * 10} textAnchor="middle" fill="#0c2340" fontSize="14" fontWeight="800">{level}</text>
          </g>
        ))}
        <text x="726" y="418" textAnchor="middle" fill="#174a87" fontSize="14" fontWeight="800">Kompetenzstufen</text>
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

function MenuDropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

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
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition focus:outline-none ${open ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:bg-white hover:text-ink"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      <div
        className={`absolute left-0 top-[calc(100%+.5rem)] z-50 min-w-[260px] rounded-[1.25rem] border border-ink/10 bg-white p-2 shadow-soft transition ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}
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
          <h2 className="font-display text-2xl font-bold">Beobachtungsauftrag</h2>
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
  onClose,
}: {
  activeId: number | null;
  onSelect: (id: number | null) => void;
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
          <ModelOrientationStrip active="usm" />
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
  onClose,
}: {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
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
          <ModelOrientationStrip active="competence" />
          <div className="mt-5">
            <CompetenceModelExplorer activeKey={activeKey} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HkmModelModal({ onClose }: { onClose: () => void }) {
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
          <ModelOrientationStrip active="hkm" />
          <div className="mt-5">
          <LayeredHkmModelExplorer />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelOrientationStrip({ active }: { active: "competence" | "hkm" | "usm" | "uvp" }) {
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
            <div key={step.key} className={`relative rounded-2xl border px-4 py-3 transition ${isActive ? "border-clay/20 bg-clay/5" : "border-ink/10 bg-white/70"}`}>
              {index > 0 && <span className="absolute -left-3 top-1/2 hidden -translate-y-1/2 text-ink/20 md:block">→</span>}
              <div className={`text-[10px] font-black uppercase tracking-[.14em] ${isActive ? "text-clay" : "text-ink/35"}`}>Schritt {index + 1}</div>
              <div className="mt-1 text-sm font-black text-ink">{step.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-ink/45">{step.subtitle}</div>
            </div>
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
  questions,
  pitfalls,
  tips,
}: {
  title: string;
  phase: string;
  purpose: string;
  questions: readonly string[];
  pitfalls: readonly string[];
  tips: readonly string[];
}) {
  return (
    <details className="group/help rounded-2xl border border-ink/10 bg-white/75 text-sm shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left font-bold text-ink/70 transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <BookOpen size={15} className="shrink-0 text-moss" />
          <span className="truncate">{title}</span>
          <span className="hidden rounded-full bg-sky/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.12em] text-moss sm:inline-flex">{phase}</span>
        </span>
        <ChevronDown size={15} className="shrink-0 text-ink/35 transition group-open/help:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-ink/10 px-4 py-3 text-xs leading-relaxed text-ink/60 md:grid-cols-3">
        <div className="md:col-span-3">
          <span className="font-bold text-ink">Ziel: </span>{purpose}
        </div>
        <MiniHelpList title="Leitfragen" items={questions} />
        <MiniHelpList title="Häufige Stolperstellen" items={pitfalls} />
        <MiniHelpList title="Praktische Tipps" items={tips} />
      </div>
    </details>
  );
}

function MiniHelpList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-xl bg-paper/70 p-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[.12em] text-ink/40">{title}</div>
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
  const checks = [
    { label: "Situation erkennbar", ok: Boolean(value.situation.trim()) || /\b(in|bei|angesichts|ausgehend von)\b/i.test(globalGoal) },
    { label: "Inhalt benannt", ok: Boolean(value.content.trim()) || globalGoal.trim().length > 45 },
    { label: "Beobachtbares Verhalten", ok: Boolean(value.behavior.trim()) || hasObservableVerb(globalGoal) },
    { label: "Vollständige Handlung bedacht", ok: /(plan|durchführ|prüf|bewert|reflekt|entscheid)/i.test(`${globalGoal} ${value.behavior}`) },
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
          <div className="rounded-2xl border border-ink/10 bg-sky/5 p-4">
            <div className="label">Formulierungshilfe</div>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-ink">{suggestion || "Fülle einen oder mehrere Bausteine aus, um eine mögliche Formulierung zu sehen."}</p>
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
    <aside className="rounded-2xl border border-moss/15 bg-sky/5 p-4 text-sm leading-relaxed text-ink/70">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-moss">Formulierungshilfe</span>
        {level && <span className="rounded-full bg-clay/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-clay">Stufe {level}</span>}
      </div>
      <p><span className="font-bold text-ink">{areaFormulationHints[area]}</span></p>
      <p className="mt-1">{dimensionHint.focus}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {dimensionHint.starters.map((starter) => (
          <span key={starter} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink/60">{starter}</span>
        ))}
      </div>
      {level && <p className="mt-3 text-xs font-semibold text-ink/50">{levelFocusHints[level]}</p>}
    </aside>
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
          <div className="text-xs leading-relaxed text-ink/45">Optionaler Reflexionsraum - keine Bewertung, keine Punktzahl.</div>
        </div>
        <ChevronDown size={16} className="shrink-0 text-ink/35 transition group-open/ls:rotate-180" />
      </summary>
      <div className="border-t border-ink/10 p-4">
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-ink/50">
          Prüfe bei Bedarf, ob die Lernsituation berufliche Handlung, Lernhandlung, Kompetenzaufbau und Transfer sinnvoll verbindet. Du kannst einzelne Punkte abhaken, kommentieren oder einfach überspringen.
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
                <label className="mt-3 block">
                  <span className="sr-only">Notiz zu {item.title}</span>
                  <textarea
                    className="min-h-16 w-full resize-y rounded-xl border border-ink/10 bg-white/85 px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
                    value={entry.notes}
                    onChange={(event) => onUpdate(item.id, { notes: event.target.value })}
                    placeholder="Optionale Notiz …"
                  />
                </label>
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
            <div className="max-w-md rounded-[1.5rem] border border-ink/10 bg-white/80 px-6 py-5 shadow-soft backdrop-blur">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-sky/15 text-moss"><Plus size={20} /></div>
              <p className="font-display text-lg font-bold text-ink">Noch keine Inhaltskarten angelegt.</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/45">Starte mit einer Karte und ordne die Lerninhalte anschließend frei auf der Fläche an.</p>
            </div>
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
  const frontX = 250;
  const cellWidth = 135;
  const depthX = 120;
  const depthY = 104;
  const dotOffsets = [[0, 0], [-9, 2], [9, 2], [0, -9], [-9, -8], [9, -8]];
  const svgHeight = 545 + Math.max(1, Math.ceil(phases.length / 4)) * 20;

  return (
    <div className="overflow-x-auto rounded-2xl bg-paper/50 p-2">
      <svg
        viewBox={`0 0 900 ${svgHeight}`}
        className={compact ? "min-w-[650px]" : "min-w-[820px]"}
        role="img"
        aria-label="Dreidimensionale Handlungskompetenzmatrix mit Niveaustufen und Phasenpunkten"
      >
        {visualAreas.map((area, areaIndex) => {
          const baseY = 140 + areaIndex * 162;
          const dots = phases.flatMap((phase, phaseIndex) =>
            landscapeDimensions.flatMap((dimension, dimensionIndex) => {
              const level = phase.competencies?.[area.key]?.[dimension.key] ?? 0;
              return level > 0 ? [{ phase, phaseIndex, dimensionIndex, level }] : [];
            }),
          );
          return (
            <g key={area.key}>
              <text x="22" y={baseY - 14} fill="#0c2340" opacity=".58" fontSize="13" fontStyle="italic">{area.subtitle}</text>
              <rect x="20" y={baseY} width="205" height="32" rx="3" fill="#fff" stroke="#0c2340" strokeOpacity=".4" />
              <text x="32" y={baseY + 21} fill="#0c2340" fontSize="13" fontWeight="700">{area.title}</text>

              {[0, 1, 2, 3, 4].map((level) => {
                const t = level / 4;
                const xShift = depthX * t;
                const y = baseY - depthY * t;
                return <line key={`h-${level}`} x1={frontX + xShift} y1={y} x2={frontX + cellWidth * 3 + xShift} y2={y} stroke="#174a87" strokeOpacity=".42" strokeWidth="1.5" />;
              })}
              {[0, 1, 2, 3].map((column) => (
                <line key={`v-${column}`} x1={frontX + column * cellWidth} y1={baseY} x2={frontX + column * cellWidth + depthX} y2={baseY - depthY} stroke="#174a87" strokeOpacity=".42" strokeWidth="1.5" />
              ))}
              {[0, 1, 2].map((column) => (
                <g key={`label-${column}`}>
                  <rect x={frontX + column * cellWidth} y={baseY} width={cellWidth} height="32" fill="#fff" stroke="#174a87" strokeOpacity=".42" />
                  <text x={frontX + column * cellWidth + cellWidth / 2} y={baseY + 21} textAnchor="middle" fill="#0c2340" fontSize="12" fontWeight="700">{landscapeDimensions[column].label}</text>
                </g>
              ))}
              {[1, 2, 3, 4].map((level) => {
                const t = (level - .5) / 4;
                return <text key={`n-${level}`} x={frontX + cellWidth * 3 + depthX * t + 10} y={baseY - depthY * t + 4} fill="#0c2340" fontSize="12" fontWeight="700">{level}</text>;
              })}
              {dots.map((dot, dotIndex) => {
                const sameBefore = dots.slice(0, dotIndex).filter((other) => other.dimensionIndex === dot.dimensionIndex && other.level === dot.level).length;
                const offset = dotOffsets[sameBefore % dotOffsets.length];
                const t = (dot.level - .5) / 4;
                const x = frontX + dot.dimensionIndex * cellWidth + cellWidth / 2 + depthX * t + offset[0];
                const y = baseY - depthY * t + offset[1];
                return (
                  <circle key={`${dot.phase.id}-${area.key}-${dot.dimensionIndex}`} cx={x} cy={y} r={compact ? 6 : 7} fill={dot.phase.color} stroke="#fff" strokeWidth="2">
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

function PrintDocument({ plan, totalMinutes }: { plan: Plan; totalMinutes: number }) {
  const hasVisibleFlowContent = plan.phases.length > 0;
  const audience = targetAudienceOptions.find((option) => option.key === plan.targetAudience)?.title ?? "Studium";
  const detailedPdf = plan.targetAudience === "students" || plan.targetAudience === "ref-beginning";
  const isInServicePdf = plan.targetAudience === "in-service";
  const showPdfObservation = plan.targetAudience !== "students" && plan.observationEnabled && plan.observationTask.trim();
  const contentBubbleSummary = plan.contentBubbles
    .filter((bubble) => bubble.title.trim() || bubble.description.trim())
    .map((bubble) => [bubble.title.trim(), bubble.description.trim()].filter(Boolean).join(": "))
    .join("\n");
  const hasAnalysisContent = detailedPdf && [
    plan.curriculumReference,
    plan.annualPlanReference,
    plan.topicPlacement,
    plan.competencyIntentions,
    plan.competencyDemand,
    plan.wkwFocus,
    plan.competencyNeedAnalysis.summary,
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
        <PrintHeader page="01" title="Stammdaten" />
        <div className="mt-[6mm] rounded-[4mm] border border-moss/15 bg-sky/10 px-[5mm] py-[3mm]">
          <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Unterrichtende Lehrkraft</div>
          <div className="mt-1 font-display text-[14pt] font-bold">{plan.teacherName || "—"}</div>
        </div>
        <div className="mt-[5mm]">
          <div className="text-[7pt] font-bold uppercase tracking-[.18em] text-clay">Thema / Lernsituation</div>
          <h1 className="mt-1 font-display text-[21pt] font-bold leading-tight">{plan.topic || "—"}</h1>
          <div className="mt-[4mm] grid grid-cols-2 gap-[4mm]">
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Zielgruppe</div>
              <div className="mt-1 text-[10pt] font-bold">{audience}</div>
            </div>
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Klasse</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.className || "—"}</div>
            </div>
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Datum</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.date || "—"}</div>
            </div>
            {!isInServicePdf && (
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Anzahl SuS</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.studentCount || "—"}</div>
            </div>
            )}
          </div>
        </div>
        <div className={`mt-[4mm] gap-[5mm] rounded-[4mm] border border-ink/10 p-[4mm] ${plan.situationImageDataUrl ? "grid grid-cols-[1fr_42mm]" : ""}`}>
          <div>
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Berufliche Anforderung</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[8.5pt] leading-relaxed text-ink/70">{plan.situationDescription || "—"}</p>
          </div>
          {plan.situationImageDataUrl && (
            <img
              src={plan.situationImageDataUrl}
              alt={plan.situationImageName || "Einstiegssituation"}
              className="h-[30mm] w-[42mm] rounded-[3mm] object-cover"
            />
          )}
        </div>
        <div className="mt-[4mm] grid grid-cols-2 gap-[4mm]">
          <div className={`${isInServicePdf ? "col-span-2" : ""} rounded-[4mm] border border-moss/15 bg-sky/10 p-[4mm]`}>
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Globalziel der Unterrichtseinheit</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[9pt] leading-snug">{plan.globalGoal || "—"}</p>
          </div>
          <div className={`${isInServicePdf ? "col-span-2" : ""} rounded-[4mm] border border-ink/10 bg-paper/60 p-[4mm]`}>
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Lerninhalte</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[8.5pt] leading-snug text-ink/75">{plan.learningContent || contentBubbleSummary || "—"}</p>
          </div>
        </div>
        <div className="mt-[4mm] grid grid-cols-[1fr_auto] items-center gap-[4mm]">
          <div className="rounded-[4mm] border border-ink/10 px-[4mm] py-[3mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Unterrichtsbeginn</div>
            <div className="mt-1 font-display text-[14pt] font-bold">{plan.startTime ? `${plan.startTime} Uhr` : "—"}</div>
            {plan.lessonDuration && <div className="mt-1 text-[7pt] font-bold text-ink/45">Zeitlicher Umfang: {plan.lessonDuration}</div>}
          </div>
          <div className="min-w-[92mm] rounded-[4mm] bg-clay px-[5mm] py-[3mm] text-white">
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] opacity-70">Aus den Phasen kalkuliert</div>
            <div className="mt-1 font-display text-[15pt] font-bold leading-none">
              {totalMinutes} Minuten · bis {addMinutes(plan.startTime, totalMinutes)}{plan.startTime ? " Uhr" : ""}
            </div>
          </div>
        </div>
        {!isInServicePdf && plan.organizationNotes && (
          <div className="mt-[3mm] rounded-[4mm] border border-ink/10 bg-white px-[4mm] py-[2.5mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Weitere organisatorische Rahmenbedingungen</div>
            <p className="mt-1 whitespace-pre-wrap text-[8pt] leading-snug text-ink/65">{plan.organizationNotes}</p>
          </div>
        )}
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
          <div className="mt-[6mm] grid gap-[4mm] text-[8.5pt] leading-relaxed">
            {(plan.curriculumReference || plan.annualPlanReference || plan.topicPlacement) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Direkte Vorgaben und Ressourcen</div>
                <div className="mt-2 grid grid-cols-3 gap-[4mm]">
                  <p><b>Lehrplan:</b><br />{plan.curriculumReference || "—"}</p>
                  <p><b>Didaktische Jahresplanung:</b><br />{plan.annualPlanReference || "—"}</p>
                  <p><b>Einordnung:</b><br />{plan.topicPlacement || "—"}</p>
                </div>
              </div>
            )}
            {(plan.competencyNeedAnalysis.summary || plan.competencyIntentions || plan.competencyDemand || plan.wkwFocus) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Kompetenzbedarf</div>
                {plan.competencyNeedAnalysis.summary ? (
                  <p className="mt-2 whitespace-pre-wrap">{plan.competencyNeedAnalysis.summary}</p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-[4mm]">
                    <p><b>Kompetenzen:</b><br />{plan.competencyIntentions || "—"}</p>
                    <p><b>Bedarf:</b><br />{plan.competencyDemand || "—"}</p>
                    <p><b>Wissen · Können · Wollen:</b><br />{plan.wkwFocus || "—"}</p>
                  </div>
                )}
              </div>
            )}
            {(plan.learningPrerequisites.compact || plan.learningPrerequisites.priorKnowledge || plan.learningPrerequisites.consequences) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
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
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Didaktische und methodische Überlegungen</div>
                <div className="mt-2 grid grid-cols-2 gap-[4mm]">
                  <p><b>Didaktik:</b><br />{plan.didacticConsiderations || "—"}</p>
                  <p><b>Methodik:</b><br />{plan.methodologicalConsiderations || "—"}</p>
                </div>
              </div>
            )}
            {detailedPdf && plan.contentMindmap.some((node) => node.text.trim()) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Mindmap Lerninhalte</div>
                <div className="mt-2 flex flex-wrap gap-[2mm]">
                  {plan.contentMindmap.filter((node) => node.text.trim()).map((node) => (
                    <span key={node.id} className="rounded-full bg-sky/20 px-[3mm] py-[1.5mm] text-[8pt] font-bold text-ink">{node.text}</span>
                  ))}
                </div>
              </div>
            )}
            {detailedPdf && plan.contentBubbles.some((bubble) => bubble.title.trim() || bubble.description.trim()) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Inhaltskarten</div>
                <div className="mt-2 grid grid-cols-2 gap-[3mm]">
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
        <section className="print-flow">
          <div className="print-flow-heading">
            <PrintHeader page="ab 02" title="Unterrichtsverlauf" />
            <div className="mt-[7mm]">
              <div className="text-[8pt] font-bold uppercase tracking-[.18em] text-clay">Unterrichtsverlauf</div>
              <h1 className="mt-1 font-display text-[23pt] font-bold">Unterrichtsverlaufplan</h1>
              <p className="mt-1 text-[8.5pt] text-ink/50">Die Uhrzeiten ergeben sich fortlaufend aus dem Unterrichtsbeginn und den Zeitangaben der Phasen.</p>
            </div>
          </div>
          <div className="mt-[6mm] space-y-[4mm]">
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
                <div className="grid grid-cols-2 gap-x-[6mm] gap-y-[4mm] p-[5mm] text-[9pt] leading-relaxed">
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Kompetenzorientierte Zielformulierung</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.goal || "—"}</p>
                  </div>
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Unterrichtsinhalt</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.content || "—"}</p>
                  </div>
                  {isInServicePdf ? (
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
                      <div className="col-span-2">
                        <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Methoden & Material</div>
                        <p className="mt-1 whitespace-pre-wrap">{phase.methods || "—"}</p>
                      </div>
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

      {showPdfObservation && (
        <section className="print-flow">
          <div className="mt-[6mm] rounded-[4mm] border-l-[2mm] border-clay bg-paper px-[4mm] py-[3mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-clay">Beobachtungsauftrag für Hospitierende</div>
            <p className="mt-1 whitespace-pre-wrap text-[8.5pt] leading-snug text-ink/70">{plan.observationTask}</p>
          </div>
        </section>
      )}

      {!isInServicePdf && (
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
          <div className="mt-1 text-[6pt] font-bold uppercase tracking-[.18em] text-moss">UVP Studio</div>
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
