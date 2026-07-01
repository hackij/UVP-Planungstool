export interface ExamCriterion {
  id: string;
  text: string;
}

export interface ExamCriterionGroup {
  id: string;
  title: string;
  items: ExamCriterion[];
}

export const EXAM_CRITERIA: ExamCriterionGroup[] = [
  {
    id: "1",
    title: "Persönlichkeit",
    items: [
      { id: "1.1", text: "Der Lernprozess wird durch das Auftreten der Lehrkraft unterstützt." },
      { id: "1.2", text: "Die Lehrkraft zeigt gegenüber den Schülerinnen und Schülern eine positive Haltung." },
      { id: "1.3", text: "Die Lehrkraft überzeugt durch fachliche Sicherheit." },
      { id: "1.4", text: "Das kommunikative Verhalten der Lehrkraft fördert das Unterrichtsgeschehen." },
    ],
  },
  {
    id: "2",
    title: "Zielklarheit und Motivation",
    items: [
      { id: "2.1", text: "Die Lernsituation orientiert sich am Lehrplan, knüpft an die Berufs- und/oder Lebenswelt der Schülerinnen und Schüler an und erzeugt persönliche Betroffenheit." },
      { id: "2.2", text: "Die Problemstellung der Lernsituation wird analysiert." },
      { id: "2.3", text: "Die Problemstellung motiviert die Schülerinnen und Schüler zur aktiven Mitarbeit." },
      { id: "2.4", text: "Die Schülerinnen und Schüler können ihre Vorkenntnisse und Erfahrungen einbringen." },
      { id: "2.5", text: "Es besteht Klarheit über Unterrichtsziele und Unterrichtsprozess." },
    ],
  },
  {
    id: "3",
    title: "Gesprächsführung",
    items: [
      { id: "3.1", text: "Im Unterricht wird die Fachsprache/Fremdsprache richtig und durchgängig angewendet." },
      { id: "3.2", text: "Die Lehrkraft bindet Schülerbeiträge konsequent und lernwirksam in den Unterricht ein." },
      { id: "3.3", text: "Die Lehrkraft unterstützt den Lernprozess mit Hilfe zielführender Frage- und Impulstechnik." },
      { id: "3.4", text: "Die Lehrkraft kommuniziert adressatengerecht." },
      { id: "3.5", text: "Der Sprechanteil der Lehrkraft ist für die Unterrichtskonzeption angemessen." },
    ],
  },
  {
    id: "4",
    title: "Unterrichtsführung",
    items: [
      { id: "4.1", text: "Die Problemstellung/Lernsituation zieht sich wie ein roter Faden durch die Unterrichtseinheit." },
      { id: "4.2", text: "Die Unterrichtseinheit ist klar und lernförderlich strukturiert." },
      { id: "4.3", text: "Die Lernzeit wird effizient genutzt." },
      { id: "4.4", text: "Die Lehrkraft geht angemessen mit Störungen um." },
      { id: "4.5", text: "Der Unterricht ist durch eine lernförderliche Atmosphäre mit gegenseitiger Wertschätzung geprägt." },
    ],
  },
  {
    id: "5",
    title: "Medieneinsatz",
    items: [
      { id: "5.1", text: "Die ausgewählten Unterrichtsmedien sind zeitgemäß und unterstützen den Lernprozess." },
      { id: "5.2", text: "Die Unterrichtsmedien werden gekonnt eingesetzt." },
    ],
  },
  {
    id: "6",
    title: "Methodeneinsatz",
    items: [
      { id: "6.1", text: "Die Methoden sind für die Schülerinnen und Schüler passend." },
      { id: "6.2", text: "Die Lehrkraft setzt die Methoden didaktisch sinnvoll ein." },
    ],
  },
  {
    id: "7",
    title: "Schülerorientierung und individuelle Förderung",
    items: [
      { id: "7.1", text: "Der Unterricht ist in Umfang und fachlicher Tiefe auf das (Aus-)Bildungsziel der Schülerinnen und Schüler abgestimmt." },
      { id: "7.2", text: "Die Unterrichtsgestaltung berücksichtigt die individuellen (auch sprachlichen) Lernvoraussetzungen und Vorerfahrungen der Schülerinnen und Schüler." },
      { id: "7.3", text: "Die Lehrkraft bezieht Schülerinnen und Schüler entsprechend ihres individuellen Leistungsvermögens in den Unterricht mit ein." },
      { id: "7.4", text: "Die Schülerinnen und Schüler erhalten differenzierte Rückmeldungen." },
      { id: "7.5", text: "Die Lehrkraft gibt den Schülerinnen und Schülern angemessenen Raum für eigenverantwortliches Lernen." },
    ],
  },
  {
    id: "8",
    title: "Überfachliche Kompetenzen und Werte",
    items: [
      { id: "8.1", text: "Im Unterricht werden ausgewählte überfachliche Kompetenzen sinnvoll gefördert." },
      { id: "8.2", text: "Im Unterricht wird die Entwicklung von Werthaltungen gefördert." },
    ],
  },
  {
    id: "9",
    title: "Unterrichtsergebnis und Lernerfolg",
    items: [
      { id: "9.1", text: "Die Arbeitsergebnisse der Schülerinnen und Schüler werden hinsichtlich Unterrichtsziel und fachlicher Richtigkeit ausgewertet und reflektiert." },
      { id: "9.2", text: "Den Schülerinnen und Schülern stehen fachlich korrekte Lernunterlagen zur Verfügung." },
      { id: "9.3", text: "Die Unterrichtskonzeption führt zu einem erkennbaren Kompetenzzuwachs bei den Schülerinnen und Schülern." },
    ],
  },
];

export const EXAM_CRITERIA_COUNT = EXAM_CRITERIA.reduce((sum, group) => sum + group.items.length, 0);
