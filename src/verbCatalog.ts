import type { CompetencyDimension } from "./types.ts";

export interface VerbLevel {
  level: number;
  code: string;
  title: string;
  verbs: string[];
  hint: string;
}

export interface VerbDimension {
  key: CompetencyDimension;
  code: string;
  title: string;
  subtitle: string;
  levels: VerbLevel[];
}

export const VERB_CATALOG: VerbDimension[] = [
  {
    key: "wissen",
    code: "A",
    title: "Wissen",
    subtitle: "Kognitive Auseinandersetzung mit Sachverhalten",
    levels: [
      {
        level: 1,
        code: "A1",
        title: "wiedergeben · Reproduktion",
        verbs: ["aufzählen", "benennen", "beschreiben", "erinnern", "erkennen", "feststellen", "wiederholen", "zitieren"],
        hint: "Im Zentrum stehen meist einzelne Sachverhalte.",
      },
      {
        level: 2,
        code: "A2",
        title: "erklären · Reorganisation",
        verbs: ["mit eigenen Worten beschreiben", "berichten", "auseinanderhalten", "bestimmen", "definieren", "differenzieren", "dokumentieren", "erfassen", "gegenüberstellen", "interpretieren", "klassifizieren", "protokollieren", "schätzen", "übersetzen", "umformen", "verarbeiten", "verstehen"],
        hint: "Im Zentrum stehen meist mehrere Sachverhalte und ihre Zusammenhänge.",
      },
      {
        level: 3,
        code: "A3",
        title: "anwenden · Transfer",
        verbs: ["ausprobieren", "auswählen", "bedienen", "berechnen", "benutzen", "demonstrieren", "entdecken", "folgern", "konstruieren", "prüfen", "voraussagen"],
        hint: "Anwendung in noch nicht vertrauten Situationen.",
      },
      {
        level: 4,
        code: "A4",
        title: "Problemlösung entwickeln und evaluieren",
        verbs: ["ausdenken", "aufbauen", "anordnen", "berechnen", "bewerten", "debattieren", "einrichten", "erfinden", "ermitteln", "evaluieren", "experimentieren", "generieren", "integrieren", "kreieren", "kombinieren", "modifizieren", "organisieren", "untersuchen", "überarbeiten", "validieren", "zusammenfassen"],
        hint: "Im Vordergrund steht die Anwendung in unbekannten Situationen.",
      },
    ],
  },
  {
    key: "koennen",
    code: "B",
    title: "Können",
    subtitle: "Praktisches Tun und zunehmende Handlungssicherheit",
    levels: [
      {
        level: 1,
        code: "B1",
        title: "(nach)machen",
        verbs: ["abschauen", "imitieren", "kopieren"],
        hint: "Nachmachen setzt Vormachen und Anleiten mit den nötigen wissensbasierten Erklärungen voraus.",
      },
      {
        level: 2,
        code: "B2",
        title: "einüben",
        verbs: ["nach Anleitung wiederholen", "üben", "trainieren"],
        hint: "Das Stadium des Anfängers wird unter professioneller Anleitung überwunden; Ziele und Grundzüge der Handlung werden verdeutlicht.",
      },
      {
        level: 3,
        code: "B3",
        title: "verfeinern",
        verbs: ["optimieren", "kultivieren", "professionalisieren"],
        hint: "Selbstreflexion des Tuns und Orientierung an aktuellen Qualitätsstandards rücken in den Vordergrund.",
      },
      {
        level: 4,
        code: "B4",
        title: "selbstständig und gekonnt agieren",
        verbs: ["fachgerecht agieren", "sachgemäß agieren", "professionell agieren", "selbstbestimmt agieren", "souverän agieren"],
        hint: "Selbstständige Handlungsregulation und eigenverantwortliche Selbststeuerung stehen im Mittelpunkt.",
      },
    ],
  },
  {
    key: "wollen",
    code: "C",
    title: "Wollen",
    subtitle: "Haltung, Werteorientierung und Verantwortungsübernahme",
    levels: [
      {
        level: 1,
        code: "C1",
        title: "wahrnehmen",
        verbs: ["aufmerksam werden", "erkennen", "sich bewusst werden", "zur Kenntnis nehmen"],
        hint: "Ein Phänomen oder Verhalten wird bewusst wahrgenommen; die Bedeutung konsensfähiger Normen wird erkannt.",
      },
      {
        level: 2,
        code: "C2",
        title: "reagieren",
        verbs: ["bereit sein", "Normen beachten", "Normen respektieren", "Interesse für Normen entwickeln"],
        hint: "Konsensfähige Normen und Regeln werden beachtet, auch wenn sie noch nicht vollständig persönlich akzeptiert sind.",
      },
      {
        level: 3,
        code: "C3",
        title: "sich positionieren",
        verbs: ["einen Standpunkt vertreten", "Position beziehen", "wertend Stellung nehmen", "sich bewusst fügen", "sich begründet widersetzen"],
        hint: "Normen und persönliche Wertvorstellungen werden auf Grundlage des eigenen Wertesystems argumentativ vertreten.",
      },
      {
        level: 4,
        code: "C4",
        title: "verantwortungsbewusst lernen, denken und handeln",
        verbs: ["sachgemäß abwägen", "selbstbestimmt entscheiden", "sozialverträglich handeln", "sich der Tragweite bewusst sein", "verantworten"],
        hint: "Verantwortungsvolles Handeln bewährt und entwickelt sich auf Grundlage des eigenen Wertesystems kontinuierlich weiter.",
      },
    ],
  },
];
