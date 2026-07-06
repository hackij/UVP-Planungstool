import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronRight, ClipboardCheck, Clock3, Download, FileDown, Grid3X3,
  GripVertical, ImagePlus, LibraryBig, Menu, Plus, Printer, RotateCcw, Save, Trash2, Upload, X,
} from "lucide-react";
import { initialPlan, PHASE_COLORS, phaseTemplate } from "./data.ts";
import { EXAM_CRITERIA, EXAM_CRITERIA_COUNT } from "./criteria.ts";
import { VERB_CATALOG } from "./verbCatalog.ts";
import type { CompetencyArea, CompetencyDimension, Phase, Plan } from "./types.ts";

const STORAGE_KEY = "uvp-studio-plan-v1";
const SCHOOL_LOGO = "./bs1-logo-hell.png";
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
  const importRef = useRef<HTMLInputElement>(null);
  const situationImageRef = useRef<HTMLInputElement>(null);

  const totalMinutes = useMemo(() => plan.phases.reduce((sum, p) => sum + Number(p.minutes || 0), 0), [plan.phases]);
  const checkedCriteria = useMemo(() => Object.values(plan.criteriaChecks).filter(Boolean).length, [plan.criteriaChecks]);
  const selected = plan.phases.find((p) => p.id === selectedId) ?? plan.phases[0];

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [plan]);

  useEffect(() => {
    if (!criteriaOpen && !verbCatalogOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCriteriaOpen(false);
      setVerbCatalogOpen(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [criteriaOpen, verbCatalogOpen]);

  const updatePlan = <K extends keyof Plan>(key: K, value: Plan[K]) => setPlan((old) => ({ ...old, [key]: value }));
  const updatePhase = (id: string, patch: Partial<Phase>) =>
    setPlan((old) => ({ ...old, phases: old.phases.map((p) => p.id === id ? { ...p, ...patch } : p) }));

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
    setMobileNav(false);
    setImageError("");
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
                <div className="font-display truncate text-lg font-bold uppercase leading-none text-ink sm:text-2xl">Seminar Metalltechnik</div>
                <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-moss sm:text-[10px]">UVP Studio · Vom Ziel zur Stunde</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 xl:flex">
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
              <button className="icon-btn border-clay/25 text-clay" onClick={resetPlan}><RotateCcw size={16} />Planung zurücksetzen</button>
              <button className="icon-btn" onClick={() => { setCriteriaOpen(true); setMobileNav(false); }}><ClipboardCheck size={16} />Prüfungskriterien</button>
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Plan importieren</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON exportieren</button>
              <button className="icon-btn bg-clay text-white" onClick={() => window.print()}><Printer size={16} />Als PDF drucken</button>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white px-5 py-7 text-ink shadow-soft sm:px-8 lg:px-10 lg:py-9">
            <div className="absolute inset-x-0 top-0 h-1 bg-clay" />
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-sky/10" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-moss"><BookOpen size={15} />Unterrichtsentwurf</div>
              <label className="block max-w-3xl rounded-2xl border border-moss/15 bg-sky/10 px-4 py-3">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.14em] text-moss">Name der unterrichtenden Lehrkraft</span>
                <input
                  aria-label="Name der unterrichtenden Lehrkraft"
                  className="w-full bg-transparent text-lg font-bold text-ink outline-none placeholder:text-ink/25"
                  placeholder="Vor- und Nachname"
                  value={plan.teacherName}
                  onChange={(event) => updatePlan("teacherName", event.target.value)}
                />
              </label>
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Globalziel der Unterrichtseinheit</label>
                <textarea
                  aria-label="Globalziel"
                  className="min-h-[88px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss sm:text-xl"
                  placeholder="Die Lernenden können …"
                  value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                />
                <label className="mb-2 mt-5 block text-[11px] font-bold uppercase tracking-[.14em] text-ink/45">Lerninhalte</label>
                <textarea
                  aria-label="Lerninhalte"
                  className="min-h-[104px] w-full rounded-2xl border border-ink/10 bg-paper/60 px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss"
                  placeholder="Welche fachlichen Inhalte, Begriffe, Verfahren oder Zusammenhänge werden erschlossen?"
                  value={plan.learningContent}
                  onChange={(event) => updatePlan("learningContent", event.target.value)}
                />
                <div className="mt-4 rounded-2xl border border-ink/10 bg-paper/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[.14em] text-moss">Beobachtungsauftrag</div>
                      <p className="mt-1 text-xs text-ink/55">Ich möchte den Hospitierenden einen Beobachtungsauftrag geben.</p>
                    </div>
                    <div className="flex rounded-full bg-ink/5 p-1" aria-label="Beobachtungsauftrag auswählen">
                      <button
                        type="button"
                        aria-pressed={plan.observationEnabled}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${plan.observationEnabled ? "bg-clay text-white" : "text-ink/45 hover:text-ink"}`}
                        onClick={() => updatePlan("observationEnabled", true)}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        aria-pressed={!plan.observationEnabled}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${!plan.observationEnabled ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink"}`}
                        onClick={() => updatePlan("observationEnabled", false)}
                      >
                        Nein
                      </button>
                    </div>
                  </div>
                  {plan.observationEnabled && (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">Beobachtungsauftrag formulieren</span>
                      <textarea
                        aria-label="Beobachtungsauftrag formulieren"
                        className="min-h-24 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink/25 focus:border-moss"
                        placeholder="Beobachtet bitte besonders, wie …"
                        value={plan.observationTask}
                        onChange={(event) => updatePlan("observationTask", event.target.value)}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 rounded-2xl border border-ink/10 bg-paper/60 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Klasse</span>
                  <input
                    aria-label="Klasse"
                    className="w-full bg-transparent text-base font-bold outline-none placeholder:text-ink/25"
                    placeholder="z. B. Bäcker 11"
                    value={plan.className}
                    onChange={(event) => updatePlan("className", event.target.value)}
                  />
                </label>
                <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Datum</span>
                  <input type="date" className="w-full bg-transparent text-sm font-semibold outline-none" value={plan.date} onChange={(e) => updatePlan("date", e.target.value)} />
                </label>
                <label className="rounded-2xl border border-ink/10 bg-paper/60 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-ink/45">Beginn</span>
                  <input type="time" className="w-full bg-transparent text-sm font-semibold outline-none" value={plan.startTime} onChange={(e) => updatePlan("startTime", e.target.value)} />
                </label>
                <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-clay px-4 py-3 text-white">
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wider">Kalkulierte Unterrichtszeit</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/60">Summe aller Phasen</span>
                  </span>
                  <span className="text-right font-display text-xl font-bold">{totalMinutes} Min · bis {addMinutes(plan.startTime, totalMinutes)}</span>
                </div>
              </div>
            </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">Der rote Faden deiner Stunde</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Unterrichtsverlaufplan</h2>
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
                        <button className={`flex h-full w-full flex-col justify-between text-left ${isEntry ? "p-5" : "p-4"}`} onClick={() => setSelectedId(phase.id)}>
                          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] opacity-90" style={{ background: phase.color }} />
                          <div className="relative">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.15em] text-ink/45"><GripVertical size={12} />Phase {index + 1}</span>
                            <div className={`mt-2 font-display font-bold leading-tight ${isEntry ? "text-2xl" : "text-xl"}`}>{phase.title || "Ohne Titel"}</div>
                            {isEntry && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink/55">{phase.moderation || "Moderation ergänzen …"}</p>}
                          </div>
                          <div className="relative flex items-end justify-between">
                            <div>
                              <div className="text-[10px] font-semibold text-ink/40">{addMinutes(plan.startTime, before)}–{addMinutes(plan.startTime, before + Number(phase.minutes || 0))}</div>
                              <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold"><Clock3 size={13} />{phase.minutes} Min</div>
                            </div>
                            <ChevronRight size={18} className={active ? "text-ink" : "text-ink/25"} />
                          </div>
                        </button>
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
            <section className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.75fr)]">
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
                  <label className="sm:col-span-2"><span className="label">Wir-Lernziel</span><textarea className="field min-h-20" value={selected.goal} onChange={(e) => updatePhase(selected.id, { goal: e.target.value })} /></label>
                  <label className="sm:col-span-2"><span className="label">Unterrichtsinhalt</span><textarea className="field min-h-24" placeholder="Was wird in dieser Phase fachlich thematisiert?" value={selected.content} onChange={(e) => updatePhase(selected.id, { content: e.target.value })} /></label>
                  <label><span className="label">Methoden & Material</span><textarea className="field min-h-28" placeholder="z. B. Think–Pair–Share, Impulskarte …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
                  <label><span className="label">Moderation</span><textarea className="field min-h-28" placeholder="Leitfragen, Übergänge, Impulse …" value={selected.moderation} onChange={(e) => updatePhase(selected.id, { moderation: e.target.value })} /></label>
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
            </section>
          )}

          <section className="mb-8 mt-8 overflow-hidden rounded-[2rem] border border-ink/10 bg-white p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><div className="label">Gesamtbild</div><h2 className="font-display text-2xl font-bold sm:text-3xl">Handlungskompetenzmatrix</h2></div>
              <span className="text-xs text-ink/45">Handlungskompetenzmatrix nach Prof. Dr. Manfred Müller</span>
            </div>
            <CompetencyLandscape phases={plan.phases} />
          </section>
        </main>
        <footer className="border-t border-ink/10 bg-white px-4 py-6 text-ink sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-moss">Seminar Metalltechnik · UVP Studio</span>
            <span className="text-ink/45">entwickelt von Jan Hacker für die gewerblich-technische Universitätsberufsschule Bayreuth</span>
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
      <PrintDocument plan={plan} totalMinutes={totalMinutes} />
    </>
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
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Klasse</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.className || "—"}</div>
            </div>
            <div className="rounded-[4mm] bg-paper p-[4mm]">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Datum</div>
              <div className="mt-1 text-[11pt] font-bold">{plan.date || "—"}</div>
            </div>
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
          <div className="rounded-[4mm] border border-moss/15 bg-sky/10 p-[4mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Globalziel der Unterrichtseinheit</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[9pt] leading-snug">{plan.globalGoal || "—"}</p>
          </div>
          <div className="rounded-[4mm] border border-ink/10 bg-paper/60 p-[4mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] text-moss">Lerninhalte</div>
            <p className="mt-1.5 whitespace-pre-wrap text-[8.5pt] leading-snug text-ink/75">{plan.learningContent || "—"}</p>
          </div>
        </div>
        {plan.observationEnabled && plan.observationTask && (
          <div className="mt-[3mm] rounded-[4mm] border-l-[2mm] border-clay bg-paper px-[4mm] py-[2.5mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-clay">Beobachtungsauftrag für Hospitierende</div>
            <p className="mt-1 whitespace-pre-wrap text-[8pt] leading-snug text-ink/70">{plan.observationTask}</p>
          </div>
        )}
        <div className="mt-[4mm] grid grid-cols-[1fr_auto] items-center gap-[4mm]">
          <div className="rounded-[4mm] border border-ink/10 px-[4mm] py-[3mm]">
            <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-ink/40">Unterrichtsbeginn</div>
            <div className="mt-1 font-display text-[14pt] font-bold">{plan.startTime ? `${plan.startTime} Uhr` : "—"}</div>
          </div>
          <div className="min-w-[92mm] rounded-[4mm] bg-clay px-[5mm] py-[3mm] text-white">
            <div className="text-[7pt] font-bold uppercase tracking-[.15em] opacity-70">Aus den Phasen kalkuliert</div>
            <div className="mt-1 font-display text-[15pt] font-bold leading-none">
              {totalMinutes} Minuten · bis {addMinutes(plan.startTime, totalMinutes)}{plan.startTime ? " Uhr" : ""}
            </div>
          </div>
        </div>
      </section>

      {plan.phases.length > 0 && (
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
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Wir-Lernziel</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.goal || "—"}</p>
                  </div>
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Unterrichtsinhalt</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.content || "—"}</p>
                  </div>
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Methoden & Material</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.methods || "—"}</p>
                  </div>
                  <div>
                    <div className="text-[7pt] font-bold uppercase tracking-[.13em] text-moss">Moderation</div>
                    <p className="mt-1 whitespace-pre-wrap">{phase.moderation || "—"}</p>
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

      <section className="print-page print-competency-page">
        <PrintHeader page="Schlussseite" title="Handlungskompetenz" />
        <div className="mt-6">
          <div className="text-[8pt] font-bold uppercase tracking-[.18em] text-clay">Kompetenzprofil</div>
          <h1 className="mt-1 font-display text-[22pt] font-bold">Kompetenzprofil der Stunde</h1>
          <p className="mt-2 max-w-[155mm] text-[9pt] leading-relaxed text-ink/60">Die Matrix macht sichtbar, welche Facetten beruflicher Handlungskompetenz in den einzelnen Unterrichtsphasen angebahnt werden. Die Tiefe markiert das gewählte Niveau 1–4, die Farben verweisen auf die Phasen.</p>
        </div>
        <div className="mt-5"><CompetencyLandscape phases={plan.phases} compact /></div>
        <div className="mt-7 grid grid-cols-3 gap-[4mm]">
          {dimensions.map((dimension, index) => (
            <div key={dimension.key} className="rounded-[4mm] bg-paper p-[5mm]">
              <span className="grid h-[8mm] w-[8mm] place-items-center rounded-full bg-ink text-[9pt] font-bold text-sky">0{index + 1}</span>
              <h3 className="mt-3 font-display text-[14pt] font-bold">{dimension.label}</h3>
              <p className="mt-2 text-[8pt] leading-relaxed text-ink/60">
                {dimension.key === "wissen" && "Kenntnisse verstehen, einordnen und als Grundlage für begründetes Handeln nutzen."}
                {dimension.key === "wollen" && "Motivation, Haltung und Bereitschaft entwickeln, Verantwortung für den Lernprozess zu übernehmen."}
                {dimension.key === "koennen" && "Fähigkeiten praktisch, methodisch und situationsangemessen einsetzen und weiterentwickeln."}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[4mm] border border-ink/10 p-[5mm]">
          <div className="grid grid-cols-4 gap-3 text-[8pt]">
            <strong>Niveaustufen</strong>
            <span><b>1</b> reproduzieren</span><span><b>2</b> anwenden</span><span><b>3</b> transferieren</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-3 text-[8pt]"><span /><span><b>4</b> reflektiert gestalten</span><span className="col-span-2 text-ink/45">0 / leer = in dieser Phase nicht fokussiert</span></div>
        </div>
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
        <div>
          <div className="font-display text-[12pt] font-bold uppercase leading-none text-ink">Seminar Metalltechnik</div>
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
      <span>Erstellt mit UVP Studio – entwickelt von Jan Hacker für die gewerblich-technische Universitätsberufsschule Bayreuth</span>
    </div>
  );
}
