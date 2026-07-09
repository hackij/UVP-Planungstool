import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronRight, ClipboardCheck, Clock3, Download, FileDown, Grid3X3,
  GripVertical, ImagePlus, LibraryBig, Menu, Plus, Printer, RotateCcw, Save, Trash2, Upload, X,
} from "lucide-react";
import { initialPlan, PHASE_COLORS, phaseTemplate } from "./data.ts";
import { EXAM_CRITERIA, EXAM_CRITERIA_COUNT } from "./criteria.ts";
import { VERB_CATALOG } from "./verbCatalog.ts";
import type { CompetencyArea, CompetencyDimension, MindmapNode, Phase, Plan, TargetAudience } from "./types.ts";

const STORAGE_KEY = "uvp-studio-plan-v1";
const SCHOOL_LOGO = "./bs1-logo-hell.png";
const SEMINAR_LOGO = "./seminar-metalltechnik-logo.png";
const FOOTER_TEXT = "Erstellt mit UVP Studio – entwickelt von Jan Hacker unter fachlicher Beratung von Prof. Dr. Manfred Müller und Dr. Moritz Dier für die gewerblich-technische Universitätsberufsschule Bayreuth";
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
const targetAudienceOptions: { key: TargetAudience; title: string; subtitle: string }[] = [
  { key: "students", title: "Studium", subtitle: "Vollständige Analyse- und Grobplanungsfassung" },
  { key: "ref-beginning", title: "Am Anfang des Referendariats", subtitle: "Reduziert, aber mit didaktischer Orientierung" },
  { key: "ref-advanced", title: "Im fortgeschrittenen Referendariat", subtitle: "Schlanker Planungsmodus mit optionaler Vertiefung" },
  { key: "in-service", title: "Im Dienst", subtitle: "Kompakte Planung für den Unterrichtsalltag" },
];
const targetAudienceKeys = targetAudienceOptions.map((option) => option.key);
const USM_ITEMS = [
  { id: 1, title: "Mündigkeit", description: "Leitperspektive: Unterricht soll Lernende zu fachlich begründetem, selbstständigem und verantwortlichem Handeln befähigen." },
  { id: 2, title: "Bildungsgangerfolg", description: "Perspektive auf den Bildungsgang: Wie trägt die Stunde langfristig zum erfolgreichen Lernen und Handeln im Bildungsgang bei?" },
  { id: 3, title: "Lernergebnisse", description: "Welche beobachtbaren Ergebnisse sollen am Ende sichtbar sein - fachlich, methodisch, sozial oder personal?" },
  { id: 4, title: "Ziele", description: "Welche kompetenzorientierten Zielsetzungen strukturieren Auswahl, Lernweg und Ergebnissicherung?" },
  { id: 5, title: "Inhalte / Sache", description: "Welche fachliche Sache steht im Mittelpunkt und wie wird sie didaktisch reduziert, strukturiert und zugänglich gemacht?" },
  { id: 6, title: "Schüler", description: "Welche Lernvoraussetzungen, Interessen, Erfahrungen und Unterstützungsbedarfe der Lernenden sind für die Planung relevant?" },
  { id: 7, title: "Lehrer", description: "Welche Rolle, Impulse, Diagnose- und Unterstützungsleistungen übernimmt die Lehrkraft im Lernprozess?" },
  { id: 8, title: "Medien", description: "Welche Medien, Werkzeuge, Materialien oder digitalen Hilfen unterstützen Verstehen, Handeln und Sicherung?" },
  { id: 9, title: "Methoden", description: "Welche Lern- und Arbeitsformen passen zur beruflichen Handlung, zum Ziel und zur Lerngruppe?" },
  { id: 10, title: "Raum", description: "Welche räumlichen Bedingungen, Arbeitsplätze oder Lernorte beeinflussen den Unterricht?" },
  { id: 11, title: "Zeit", description: "Wie werden Lernzeit, Phasen, Taktung und Übergänge so geplant, dass Lernen möglich bleibt?" },
];

const addMinutes = (time: string, minutes: number) => {
  if (!/^\d{2}:\d{2}$/.test(time)) return "—";
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
    learningPrerequisites: { ...fallback.learningPrerequisites, ...(partial.learningPrerequisites ?? {}) },
    contentMindmap: Array.isArray(partial.contentMindmap) ? partial.contentMindmap.map((node, index) => ({
      id: typeof node.id === "string" && node.id ? node.id : crypto.randomUUID(),
      text: typeof node.text === "string" ? node.text : "",
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : 40 + index * 18,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : 40 + index * 14,
    })).filter((node) => node.text.trim()) : fallback.contentMindmap,
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

export default function App() {
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
  const [usmOpen, setUsmOpen] = useState(false);
  const [activeUsmItem, setActiveUsmItem] = useState<number | null>(null);
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

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [plan]);

  useEffect(() => {
    if (!criteriaOpen && !verbCatalogOpen && !usmOpen && activeUsmItem == null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCriteriaOpen(false);
      setVerbCatalogOpen(null);
      setUsmOpen(false);
      setActiveUsmItem(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [criteriaOpen, verbCatalogOpen, usmOpen, activeUsmItem]);

  const updatePlan = <K extends keyof Plan>(key: K, value: Plan[K]) => setPlan((old) => ({ ...old, [key]: value }));
  const updatePhase = (id: string, patch: Partial<Phase>) =>
    setPlan((old) => ({ ...old, phases: old.phases.map((p) => p.id === id ? { ...p, ...patch } : p) }));
  const updateLearningPrerequisite = <K extends keyof Plan["learningPrerequisites"]>(key: K, value: Plan["learningPrerequisites"][K]) =>
    setPlan((old) => ({ ...old, learningPrerequisites: { ...old.learningPrerequisites, [key]: value } }));

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

  return (
    <>
      <div className="app-shell flex min-h-screen flex-col bg-paper">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 text-ink shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex h-[86px] max-w-[1540px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth und Technikerschule" className="h-11 w-auto max-w-[138px] shrink-0 object-contain sm:h-14 sm:max-w-[180px]" />
              <div className="min-w-0 border-l border-ink/10 pl-3 sm:pl-5">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={SEMINAR_LOGO}
                    alt="Seminar Metalltechnik"
                    className="h-10 w-auto max-w-[145px] object-contain object-left sm:h-14 sm:max-w-[210px]"
                  />
                  <div className="shrink-0 border-l border-clay/25 pl-3 font-display text-base font-bold uppercase leading-none text-moss sm:text-xl">UVP Studio</div>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 xl:flex">
              <label className="mr-1 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-2 text-xs font-bold text-ink/60">
                Planungsstand
                <select
                  className="bg-transparent text-xs font-bold text-ink outline-none"
                  value={plan.targetAudience}
                  onChange={(event) => updatePlan("targetAudience", event.target.value as TargetAudience)}
                >
                  {targetAudienceOptions.map((option) => <option key={option.key} value={option.key}>{option.title}</option>)}
                </select>
              </label>
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink/45">
                {saved ? <Check size={14} /> : <Save size={14} className="animate-pulse" />}
                {saved ? "Lokal gespeichert" : "Speichert …"}
              </span>
              <button className="icon-btn border-clay/25 text-clay hover:border-clay/50 hover:bg-clay/5" onClick={resetPlan}><RotateCcw size={16} />Planung zurücksetzen</button>
              <button className="icon-btn" onClick={() => setCriteriaOpen(true)}>
                <ClipboardCheck size={16} />
                Kriterien
                {checkedCriteria > 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] text-ink">{checkedCriteria}/{EXAM_CRITERIA_COUNT}</span>}
              </button>
              <button className="icon-btn" onClick={() => { setUsmOpen(true); setActiveUsmItem(null); }}>
                <Grid3X3 size={16} />
                Unterrichtsstrukturmodell (USM)
              </button>
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Import</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON</button>
              <button className="icon-btn border-clay bg-clay text-white hover:border-clay hover:bg-[#8d1920]" onClick={() => window.print()}><FileDown size={16} />PDF exportieren</button>
            </div>
            <button aria-label="Menü öffnen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-paper xl:hidden" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X /> : <Menu />}
            </button>
          </div>
          {mobileNav && (
            <div className="grid gap-2 border-t border-ink/10 bg-white p-4 xl:hidden">
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
              <button className="icon-btn border-clay/25 text-clay" onClick={resetPlan}><RotateCcw size={16} />Planung zurücksetzen</button>
              <button className="icon-btn" onClick={() => { setCriteriaOpen(true); setMobileNav(false); }}><ClipboardCheck size={16} />Prüfungskriterien</button>
              <button className="icon-btn" onClick={() => { setUsmOpen(true); setActiveUsmItem(null); setMobileNav(false); }}><Grid3X3 size={16} />Unterrichtsstrukturmodell (USM)</button>
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Plan importieren</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON exportieren</button>
              <button className="icon-btn bg-clay text-white" onClick={() => window.print()}><Printer size={16} />Als PDF drucken</button>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <section className="mb-8 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="label">Aktueller Planungsstand</div>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Wo befindest du dich gerade?</h1>
              </div>
              <span className="rounded-full bg-sky/15 px-3 py-1.5 text-xs font-bold text-moss">dauerhaft änderbar</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              {targetAudienceOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={plan.targetAudience === option.key}
                  className={`rounded-3xl border p-4 text-left transition ${plan.targetAudience === option.key ? "border-clay bg-clay text-white shadow-soft" : "border-ink/10 bg-paper/50 text-ink hover:border-moss/40 hover:bg-sky/10"}`}
                  onClick={() => updatePlan("targetAudience", option.key)}
                >
                  <span className="block font-display text-xl font-bold">{option.title}</span>
                  <span className={`mt-1 block text-sm leading-snug ${plan.targetAudience === option.key ? "text-white/70" : "text-ink/50"}`}>{option.subtitle}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-8 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="label">Unterrichtende Lehrkraft</div>
                <h2 className="font-display text-2xl font-bold">Organisatorische Stammdaten</h2>
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
              <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Anzahl der Schülerinnen und Schüler</span>
                <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 24" value={plan.studentCount} onChange={(event) => updatePlan("studentCount", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white px-5 py-7 text-ink shadow-soft sm:px-8 lg:px-10 lg:py-9">
            <div className="absolute inset-x-0 top-0 h-1 bg-clay" />
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-sky/10" />
            <RedAccentCurve className="absolute -right-14 top-12 w-[330px] opacity-[.045]" />
            <div className="relative">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-moss"><BookOpen size={15} />Unterrichtsvorbereitung strukturieren</div>
              <h2 className="font-display text-3xl font-bold">Analysen & Grobplanung</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/55">{isInServiceMode ? "Kompakte Planung für den Unterrichtsalltag: Ziel klären, Verlauf strukturieren, Zeit im Blick behalten." : "Kläre Rahmenbedingungen, Vorgaben, Kompetenzbedarf, Inhalte und Lernvoraussetzungen. Daraus entsteht anschließend das Unterrichtsgrobkonzept."}</p>
              <div className="mt-6 mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-clay">1 · Allgemeine Rahmenbedingungen klären</div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
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
                {showCoreAnalyses && (
                <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Berufliche Anforderung</span>
                    <textarea
                      aria-label="Berufliche Anforderung"
                      className="min-h-[132px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-moss"
                      placeholder="Welche berufliche Anforderung, welcher Auftrag oder welches Problem bildet den Handlungsanlass?"
                      value={plan.situationDescription} onChange={(e) => updatePlan("situationDescription", e.target.value)}
                    />
                  </label>
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
                {showCoreAnalyses && <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-clay">2 · Direkte Vorgaben und Ressourcen berücksichtigen</div>}
                {showExtendedBlocks && (
                  <div className="mb-5 grid gap-4 sm:grid-cols-3">
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
                )}
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Globalziel der Unterrichtseinheit</label>
                <textarea
                  aria-label="Globalziel"
                  className="min-h-[88px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss sm:text-xl"
                  placeholder="Die Lernenden können …"
                  value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                />
                {showCoreAnalyses && (
                  <>
                    <label className="mb-2 mt-5 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Lerninhalte</label>
                    <textarea
                      aria-label="Lerninhalte"
                      className="min-h-[104px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss"
                      placeholder="Welche fachlichen Inhalte, Begriffe, Verfahren oder Zusammenhänge werden erschlossen?"
                      value={plan.learningContent}
                      onChange={(event) => updatePlan("learningContent", event.target.value)}
                    />
                  </>
                )}
                {showCompactOptionalBlocks && (
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-ink/10 bg-paper/50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[.16em] text-clay">3 · Kompetenzbedarf ermitteln</div>
                        <p className="mt-1 text-xs leading-relaxed text-ink/50">Verknüpfe die berufliche Anforderung mit Wissen, Können und Wollen. Die konkrete Zuordnung erfolgt weiterhin in den Phasen über die Handlungskompetenzmatrix.</p>
                      </div>
                      <InfoHint title="Späterer Hilfeblock" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label><span className="label">Kompetenzen</span><textarea className="field min-h-24" value={plan.competencyIntentions} onChange={(event) => updatePlan("competencyIntentions", event.target.value)} placeholder="Welche Kompetenzen sollen angebahnt oder erweitert werden?" /></label>
                      <label><span className="label">Kompetenzbedarf</span><textarea className="field min-h-24" value={plan.competencyDemand} onChange={(event) => updatePlan("competencyDemand", event.target.value)} placeholder="Was ergibt sich aus der beruflichen Anforderung?" /></label>
                      <label><span className="label">Wissen · Können · Wollen</span><textarea className="field min-h-24" value={plan.wkwFocus} onChange={(event) => updatePlan("wkwFocus", event.target.value)} placeholder="Welche Aspekte stehen im Mittelpunkt?" /></label>
                    </div>
                  </div>

                  {(isStudentMode || plan.targetAudience === "ref-beginning") && (
                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[.16em] text-clay">4 · Inhalte analysieren, strukturieren und auswählen</div>
                        <p className="mt-1 text-xs leading-relaxed text-ink/50">{showMindmap ? "Ordne zentrale Begriffe frei auf der Arbeitsfläche an." : "Die Mindmap ist in diesem Planungsstand ausgeblendet und kann optional geöffnet werden."}</p>
                      </div>
                      {!isStudentMode && (
                        <button type="button" className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/55 transition hover:text-ink" onClick={() => setCompactDetailsOpen(!compactDetailsOpen)}>
                          {compactDetailsOpen ? "Optionen ausblenden" : "Optionen anzeigen"}
                        </button>
                      )}
                    </div>
                    {showMindmap && (
                      <MindmapCanvas
                        nodes={plan.contentMindmap}
                        draft={mindmapDraft}
                        onDraftChange={setMindmapDraft}
                        onAdd={addMindmapNode}
                        onUpdate={updateMindmapNode}
                        onDelete={deleteMindmapNode}
                      />
                    )}
                  </div>
                  )}
                </div>
                )}
                {showCoreAnalyses && (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[.16em] text-clay">5 · Lernvoraussetzungen erfassen und analysieren</div>
                      <p className="mt-1 text-xs leading-relaxed text-ink/50">
                        {isAdvancedRefMode ? "In der fortgeschrittenen Referendariatsansicht optional einklappbar." : "Was bringen die Lernenden fachlich, sprachlich, methodisch und sozial mit?"}
                      </p>
                    </div>
                    {isAdvancedRefMode && (
                      <button type="button" className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink/55 transition hover:text-ink" onClick={() => setCompactDetailsOpen(!compactDetailsOpen)}>
                        {compactDetailsOpen ? "Ausblenden" : "Einblenden"}
                      </button>
                    )}
                  </div>
                  {isAdvancedRefMode && !compactDetailsOpen ? (
                    <div className="rounded-2xl bg-paper px-4 py-3 text-sm text-ink/50">Dieser Analyseblock ist im kompakten Modus eingeklappt. Bei Bedarf kannst du ihn einblenden.</div>
                  ) : (
                    <div className={`grid gap-3 ${isStudentMode ? "md:grid-cols-2" : ""}`}>
                      {isStudentMode ? (
                        <>
                          <label><span className="label">Vorwissen</span><textarea className="field min-h-20" value={plan.learningPrerequisites.priorKnowledge} onChange={(event) => updateLearningPrerequisite("priorKnowledge", event.target.value)} /></label>
                          <label><span className="label">Fachliche Voraussetzungen</span><textarea className="field min-h-20" value={plan.learningPrerequisites.subject} onChange={(event) => updateLearningPrerequisite("subject", event.target.value)} /></label>
                          <label><span className="label">Sprachliche Voraussetzungen</span><textarea className="field min-h-20" value={plan.learningPrerequisites.language} onChange={(event) => updateLearningPrerequisite("language", event.target.value)} /></label>
                          <label><span className="label">Methodische Voraussetzungen</span><textarea className="field min-h-20" value={plan.learningPrerequisites.methodological} onChange={(event) => updateLearningPrerequisite("methodological", event.target.value)} /></label>
                          <label><span className="label">Soziale Voraussetzungen</span><textarea className="field min-h-20" value={plan.learningPrerequisites.social} onChange={(event) => updateLearningPrerequisite("social", event.target.value)} /></label>
                          <label><span className="label">Mögliche Lernschwierigkeiten</span><textarea className="field min-h-20" value={plan.learningPrerequisites.difficulties} onChange={(event) => updateLearningPrerequisite("difficulties", event.target.value)} /></label>
                          <label className="md:col-span-2"><span className="label">Konsequenzen für die Planung</span><textarea className="field min-h-20" value={plan.learningPrerequisites.consequences} onChange={(event) => updateLearningPrerequisite("consequences", event.target.value)} /></label>
                        </>
                      ) : (
                        <label><span className="label">Lernvoraussetzungen kompakt</span><textarea className="field min-h-28" value={plan.learningPrerequisites.compact} onChange={(event) => updateLearningPrerequisite("compact", event.target.value)} placeholder="Vorwissen, Schwierigkeiten und Konsequenzen für die Planung …" /></label>
                      )}
                    </div>
                  )}
                </div>
                )}

                {(showExtendedBlocks || plan.targetAudience === "ref-beginning") && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="rounded-2xl border border-ink/10 bg-paper/50 p-4">
                      <span className="label">Didaktische Überlegungen</span>
                      <textarea className="field min-h-28 bg-white" value={plan.didacticConsiderations} onChange={(event) => updatePlan("didacticConsiderations", event.target.value)} placeholder="Auswahl, Reduktion, Sequenzierung, didaktischer Kern …" />
                    </label>
                    <label className="rounded-2xl border border-ink/10 bg-paper/50 p-4">
                      <span className="label">Methodische Überlegungen</span>
                      <textarea className="field min-h-28 bg-white" value={plan.methodologicalConsiderations} onChange={(event) => updatePlan("methodologicalConsiderations", event.target.value)} placeholder="Lernweg, Sozialformen, Medien, Sicherung, Aktivierung …" />
                    </label>
                  </div>
                )}
              </div>
              {showCoreAnalyses && (
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 rounded-2xl border border-ink/10 bg-paper/60 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Zeitlicher Umfang</span>
                  <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/25" placeholder="z. B. 90 Min" value={plan.lessonDuration} onChange={(e) => updatePlan("lessonDuration", e.target.value)} />
                </label>
                <label className="col-span-2 rounded-2xl border border-ink/10 bg-paper/60 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Weitere organisatorische Rahmenbedingungen</span>
                  <textarea className="min-h-24 w-full bg-transparent text-sm leading-relaxed outline-none placeholder:text-ink/25" placeholder="Raum, Gruppengröße, besondere Ressourcen, Einschränkungen …" value={plan.organizationNotes} onChange={(e) => updatePlan("organizationNotes", e.target.value)} />
                </label>
                <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-clay px-4 py-3 text-white">
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wider">Kalkulierte Unterrichtszeit</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/60">Summe aller Phasen</span>
                  </span>
                  <span className="text-right font-display text-xl font-bold">{totalMinutes} Min · bis {addMinutes(plan.startTime, totalMinutes)}</span>
                </div>
              </div>
              )}
            </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">6 · Unterrichtsgrobkonzept</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Unterrichtsgrobkonzept: Der rote Faden deiner Stunde</h2>
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
                        className={`relative z-10 overflow-hidden rounded-[2rem] border bg-white text-left transition duration-300 ${isEntry ? "h-52 w-64" : "h-44 w-48"} ${active ? "scale-[1.025] shadow-soft" : "border-ink/10 hover:-translate-y-1 hover:shadow-soft"} ${dragging ? "opacity-35" : "opacity-100"}`}
                        style={active ? { borderColor: phase.color, boxShadow: `0 18px 45px ${phase.color}22` } : undefined}
                      >
                        <div className={`flex h-full w-full flex-col justify-between text-left ${isEntry ? "p-5" : "p-4"}`} onClick={() => setSelectedId(phase.id)}>
                          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] opacity-90" style={{ background: phase.color }} />
                          <div className="relative">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.15em] text-ink/45"><GripVertical size={12} />Phase {index + 1}</span>
                            <input
                              aria-label={`Titel von Phase ${index + 1}`}
                              className={`mt-2 w-[calc(100%-2.25rem)] border-0 bg-transparent p-0 font-display font-bold leading-tight outline-none placeholder:text-ink/25 ${isEntry ? "text-2xl" : "text-xl"}`}
                              placeholder="Titel der Phase"
                              value={phase.title}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(phase.id);
                              }}
                              onChange={(event) => updatePhase(phase.id, { title: event.target.value })}
                            />
                            {isEntry && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink/55">{phase.shortDescription || phase.teacherAction || "Kurzbeschreibung ergänzen …"}</p>}
                          </div>
                          <div className="relative flex items-end justify-between">
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
                  <label className="sm:col-span-2"><span className="label">Kurzbeschreibung der Phase</span><textarea className="field min-h-16" placeholder="Welche Funktion hat diese Phase im Unterrichtsverlauf?" value={selected.shortDescription} onChange={(e) => updatePhase(selected.id, { shortDescription: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Kompetenzorientierte Zielformulierung</span><textarea className="field min-h-20" placeholder="Die Lernenden können …" value={selected.goal} onChange={(e) => updatePhase(selected.id, { goal: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Unterrichtsinhalt</span><textarea className="field min-h-24" placeholder="Was wird in dieser Phase fachlich thematisiert?" value={selected.content} onChange={(e) => updatePhase(selected.id, { content: e.target.value })} /></label>
                  <label><span className="label">Lehrhandlung</span><textarea className="field min-h-28" placeholder="Was tut die Lehrkraft? Impulse, Strukturierung, Begleitung …" value={selected.teacherAction} onChange={(e) => updatePhase(selected.id, { teacherAction: e.target.value, moderation: e.target.value })} /></label>
                  <label><span className="label">Lernhandlung</span><textarea className="field min-h-28" placeholder="Was tun die Schülerinnen und Schüler? Denken, handeln, kooperieren …" value={selected.studentAction} onChange={(e) => updatePhase(selected.id, { studentAction: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Methoden & Material</span><textarea className="field min-h-28" placeholder="z. B. Think–Pair–Share, Impulskarte …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
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
            <span className="max-w-4xl text-ink/45">{FOOTER_TEXT}</span>
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
      <PrintDocument plan={plan} totalMinutes={totalMinutes} />
    </>
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
  const points = [
    { id: 1, x: 50, y: 8 }, { id: 2, x: 50, y: 23 }, { id: 3, x: 50, y: 39 }, { id: 4, x: 50, y: 55 },
    { id: 5, x: 50, y: 72 }, { id: 6, x: 23, y: 79 }, { id: 7, x: 77, y: 79 }, { id: 8, x: 34, y: 90 },
    { id: 9, x: 66, y: 90 }, { id: 10, x: 13, y: 94 }, { id: 11, x: 87, y: 94 },
  ];
  const itemById = new Map(USM_ITEMS.map((item) => [item.id, item]));
  const activeItem = activeId ? itemById.get(activeId) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)] lg:items-center">
      <div className="rounded-[2rem] border border-ink/10 bg-paper/50 p-4">
        <div className="relative mx-auto aspect-[1.18/1] max-w-[620px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 86" aria-hidden="true">
            <path d="M50 4 96 82H4Z" fill="#ffffff" stroke="#174a87" strokeOpacity=".25" strokeWidth="1.2" />
            <path d="M50 4 50 82" stroke="#174a87" strokeOpacity=".12" strokeWidth="1" />
            <path d="M22 72H78" stroke="#174a87" strokeOpacity=".12" strokeWidth="1" />
            <path d="M35 50H65" stroke="#174a87" strokeOpacity=".12" strokeWidth="1" />
            <path d="M43 30H57" stroke="#174a87" strokeOpacity=".12" strokeWidth="1" />
            <path d="M8 78C27 50 46 42 69 57C82 66 90 64 96 52" fill="none" stroke="#9f140c" strokeOpacity=".18" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <div className="absolute left-1/2 top-[3%] -translate-x-1/2 text-center">
            <div className="font-display text-lg font-bold text-ink">Mündigkeit</div>
          </div>
          <div className="absolute left-1/2 top-[20%] -translate-x-1/2 text-center text-sm font-bold text-ink/70">Bildungsgangerfolg</div>
          <div className="absolute left-1/2 top-[36%] -translate-x-1/2 text-center text-sm font-bold text-ink/70">Lernergebnisse</div>
          <div className="absolute left-1/2 top-[52%] -translate-x-1/2 text-center text-sm font-bold text-ink/70">Ziele</div>
          <div className="absolute left-1/2 top-[68%] -translate-x-1/2 text-center font-display text-xl font-bold text-moss">Inhalte / Sache</div>
          <div className="absolute left-[14%] top-[76%] font-bold text-ink/70">Schüler</div>
          <div className="absolute right-[15%] top-[76%] font-bold text-ink/70">Lehrer</div>
          <div className="absolute left-[27%] top-[88%] text-xs font-bold uppercase tracking-[.12em] text-ink/45">Medien</div>
          <div className="absolute right-[26%] top-[88%] text-xs font-bold uppercase tracking-[.12em] text-ink/45">Methoden</div>
          <div className="absolute bottom-[1%] left-[5%] text-xs font-bold uppercase tracking-[.12em] text-ink/45">Raum</div>
          <div className="absolute bottom-[1%] right-[6%] text-xs font-bold uppercase tracking-[.12em] text-ink/45">Zeit</div>
          {points.map((point) => {
            const item = itemById.get(point.id);
            return (
              <button
                key={point.id}
                type="button"
                aria-label={`${point.id}: ${item?.title ?? "USM-Bereich"} öffnen`}
                className={`absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xs font-black shadow-sm transition focus:outline-none focus:ring-2 focus:ring-clay/30 ${activeId === point.id ? "border-clay bg-clay text-white" : "border-white bg-ink text-white hover:bg-clay"}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => onSelect(point.id)}
              >
                {point.id}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-[2rem] border border-ink/10 bg-sky/10 p-5">
        <div className="label">Anwendung</div>
        <h3 className="font-display text-2xl font-bold">Planung und Nachbesprechung</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">Die Ziffern helfen, Unterrichtsideen systematisch zu prüfen: vom Bildungsanspruch über Ziele und Inhalte bis zu Bedingungen wie Raum, Zeit, Medien und Methoden.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {USM_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${activeId === item.id ? "border-clay bg-clay text-white" : "border-ink/10 bg-white text-ink/60 hover:border-clay hover:text-clay"}`}
              onClick={() => onSelect(item.id)}
            >
              {item.id}. {item.title}
            </button>
          ))}
        </div>
        {activeItem && (
          <div className="mt-5 rounded-2xl border border-clay/15 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-clay">Punkt {activeItem.id}</div>
                <h4 className="mt-1 font-display text-xl font-bold">{activeItem.title}</h4>
              </div>
              <button
                type="button"
                aria-label="USM-Erläuterung schließen"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink/45 transition hover:bg-clay/10 hover:text-clay"
                onClick={() => onSelect(null)}
              >
                <X size={15} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">{activeItem.description}</p>
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
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-7">
          <div>
            <div className="label">Brainstorming & Nachbesprechung</div>
            <h2 id="usm-title" className="font-display text-2xl font-bold sm:text-3xl">Unterrichtsstrukturmodell (USM)</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/55">Nutze die anklickbaren Ziffern als Denkanker, ohne den eigentlichen Unterrichtsverlauf zu verlassen.</p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink/60 transition hover:bg-clay/10 hover:text-clay" onClick={onClose} aria-label="Unterrichtsstrukturmodell schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-7">
          <TeachingStructureModel activeId={activeId} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

function InfoHint({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-ink/35">
      {title}
    </span>
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
  const hasAnalysisContent = detailedPdf && [
    plan.curriculumReference,
    plan.annualPlanReference,
    plan.topicPlacement,
    plan.competencyIntentions,
    plan.competencyDemand,
    plan.wkwFocus,
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
  ].some((value) => value.trim()) || (detailedPdf && plan.contentMindmap.some((node) => node.text.trim()));

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
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Anzahl SuS</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.studentCount || "—"}</div>
            </div>
          </div>
        </div>
        {!isInServicePdf && (
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
        )}
        <div className="mt-[4mm] grid grid-cols-2 gap-[4mm]">
          <div className={`${isInServicePdf ? "col-span-2" : ""} rounded-[4mm] border border-moss/15 bg-sky/10 p-[4mm]`}>
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Globalziel der Unterrichtseinheit</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[9pt] leading-snug">{plan.globalGoal || "—"}</p>
          </div>
          {!isInServicePdf && (
          <div className="rounded-[4mm] border border-ink/10 bg-paper/60 p-[4mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Lerninhalte</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[8.5pt] leading-snug text-ink/75">{plan.learningContent || "—"}</p>
          </div>
          )}
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
            {(plan.competencyIntentions || plan.competencyDemand || plan.wkwFocus) && (
              <div className="rounded-[4mm] border border-ink/10 p-[4mm]">
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-moss">Kompetenzbedarf</div>
                <div className="mt-2 grid grid-cols-3 gap-[4mm]">
                  <p><b>Kompetenzen:</b><br />{plan.competencyIntentions || "—"}</p>
                  <p><b>Bedarf:</b><br />{plan.competencyDemand || "—"}</p>
                  <p><b>Wissen · Können · Wollen:</b><br />{plan.wkwFocus || "—"}</p>
                </div>
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
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[13pt] font-bold">{startsAt}–{endsAt} Uhr</div>
                    <div className="mt-1 text-[8pt] font-bold text-ink/50">{phase.minutes || 0} Minuten</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-[6mm] gap-y-[4mm] p-[5mm] text-[9pt] leading-relaxed">
                  {phase.shortDescription && (
                    <div className="col-span-2 rounded-[3mm] bg-paper px-[4mm] py-[2.5mm]">
                      <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-clay">Kurzbeschreibung der Phase</div>
                      <p className="mt-1 whitespace-pre-wrap">{phase.shortDescription}</p>
                    </div>
                  )}
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Kompetenzorientierte Zielformulierung</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.goal || "—"}</p>
                  </div>
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Unterrichtsinhalt</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.content || "—"}</p>
                  </div>
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
      <span>{FOOTER_TEXT}</span>
    </div>
  );
}
