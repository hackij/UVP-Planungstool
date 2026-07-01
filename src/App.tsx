import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronRight, ClipboardCheck, Clock3, Download, FileDown, Grid3X3,
  ImagePlus, LibraryBig, Menu, Plus, Printer, RotateCcw, Save, Trash2, Upload, X,
} from "lucide-react";
import { initialPlan, phaseTemplate } from "./data.ts";
import { EXAM_CRITERIA, EXAM_CRITERIA_COUNT } from "./criteria.ts";
import { VERB_CATALOG } from "./verbCatalog.ts";
import type { CompetencyArea, CompetencyDimension, Phase, Plan } from "./types.ts";

const STORAGE_KEY = "uvp-studio-plan-v1";
const SCHOOL_LOGO = "./bs1-spengler-logo-weiss.png";
const LEGACY_PHASE_COLORS = new Set(["#e97b58", "#89c5d2", "#d9f45f", "#efb95d", "#9fa8dc", "#7fc6a4", "#ef9fbb"]);
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
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const prepareSituationImage = (file: File) => new Promise<string>((resolve, reject) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    reject(new Error("Bitte verwende ein JPEG-, PNG- oder WebP-Bild."));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    reject(new Error("Das Bild darf höchstens 10 MB groß sein."));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Das Bild konnte nicht gelesen werden."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("Das Bild konnte nicht verarbeitet werden."));
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
        reject(new Error("Das Bild konnte nicht verarbeitet werden."));
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

const normalizePlan = (candidate: unknown): Plan => {
  const fallback = initialPlan();
  if (!candidate || typeof candidate !== "object") return fallback;
  const partial = candidate as Partial<Plan>;
  if (!Array.isArray(partial.phases) || partial.phases.length === 0) return fallback;
  return {
    ...fallback,
    ...partial,
    preparation: { ...fallback.preparation, ...(partial.preparation ?? {}) },
    criteriaChecks: { ...fallback.criteriaChecks, ...(partial.criteriaChecks ?? {}) },
    phases: partial.phases.map((phase, index) => {
      const template = phaseTemplate(index);
      return {
        ...template,
        ...phase,
        color: LEGACY_PHASE_COLORS.has(phase.color) ? template.color : phase.color,
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
        if (!raw.globalGoal || !Array.isArray(raw.phases)) throw new Error();
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
    const next = phaseTemplate(plan.phases.length);
    setPlan((old) => ({ ...old, phases: [...old.phases, next] }));
    setSelectedId(next.id);
  };

  const deletePhase = (id: string) => {
    if (plan.phases.length <= 1) return;
    const index = plan.phases.findIndex((p) => p.id === id);
    const next = plan.phases.filter((p) => p.id !== id);
    setPlan((old) => ({ ...old, phases: next }));
    setSelectedId(next[Math.max(0, index - 1)]?.id ?? "");
  };

  return (
    <>
      <div className="app-shell flex min-h-screen flex-col bg-paper">
        <header className="sticky top-0 z-40 border-b-2 border-clay bg-ink text-white shadow-lg shadow-ink/10">
          <div className="mx-auto flex h-[86px] max-w-[1540px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth und Technikerschule" className="h-11 w-auto shrink-0 object-contain sm:h-14" />
              <div className="min-w-0 border-l border-white/20 pl-3 sm:pl-5">
                <div className="font-display truncate text-lg font-bold uppercase leading-none text-white sm:text-2xl">Seminar Metalltechnik</div>
                <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-sky sm:text-[10px]">UVP Studio · Vom Ziel zur Stunde</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/55">
                {saved ? <Check size={14} /> : <Save size={14} className="animate-pulse" />}
                {saved ? "Lokal gespeichert" : "Speichert …"}
              </span>
              <button className="icon-btn border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15" onClick={() => setCriteriaOpen(true)}>
                <ClipboardCheck size={16} />
                Kriterien
                {checkedCriteria > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-ink">{checkedCriteria}/{EXAM_CRITERIA_COUNT}</span>}
              </button>
              <button className="icon-btn border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15" onClick={() => importRef.current?.click()}><Upload size={16} />Import</button>
              <button className="icon-btn border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15" onClick={exportJson}><Download size={16} />JSON</button>
              <button className="icon-btn border-clay bg-clay text-white hover:border-clay hover:bg-[#8d1920]" onClick={() => window.print()}><FileDown size={16} />PDF exportieren</button>
            </div>
            <button aria-label="Menü öffnen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 md:hidden" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X /> : <Menu />}
            </button>
          </div>
          {mobileNav && (
            <div className="grid gap-2 border-t border-ink/10 bg-white p-4 md:hidden">
              <button className="icon-btn" onClick={() => { setCriteriaOpen(true); setMobileNav(false); }}><ClipboardCheck size={16} />Prüfungskriterien</button>
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Plan importieren</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON exportieren</button>
              <button className="icon-btn bg-clay text-white" onClick={() => window.print()}><Printer size={16} />Als PDF drucken</button>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <section className="relative overflow-hidden rounded-[2rem] bg-ink px-5 py-7 text-white shadow-xl shadow-ink/10 sm:px-8 lg:px-10 lg:py-9">
            <div className="absolute inset-x-0 top-0 h-1 bg-clay" />
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-sky/10" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
              <div>
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-sky"><BookOpen size={15} />Unterrichtsentwurf</div>
                <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_210px]">
                  <label>
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/45">Thema / Lernsituation</span>
                    <input
                      aria-label="Thema der Stunde"
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-2 font-display text-2xl font-bold outline-none placeholder:text-white/30 focus:border-lime sm:text-3xl"
                      value={plan.topic} onChange={(e) => updatePlan("topic", e.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/45">Klasse</span>
                    <input
                      aria-label="Klasse"
                      className="w-full border-0 border-b border-white/15 bg-transparent pb-2 text-lg font-bold outline-none placeholder:text-white/25 focus:border-lime sm:text-xl"
                      placeholder="z. B. Bäcker 11"
                      value={plan.className} onChange={(e) => updatePlan("className", e.target.value)}
                    />
                  </label>
                </div>
                <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-white/45">Situationsbeschreibung · berufliche Handlung</span>
                    <textarea
                      aria-label="Situationsbeschreibung"
                      className="min-h-[132px] w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white outline-none backdrop-blur placeholder:text-white/25 focus:border-lime"
                      placeholder="Welche berufliche Handlung bildet den Ausgangspunkt? Beschreibe Betriebssituation, Auftrag, Problem und Handlungsanlass …"
                      value={plan.situationDescription} onChange={(e) => updatePlan("situationDescription", e.target.value)}
                    />
                  </label>
                  <div>
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-white/45">Bild der Einstiegssituation</span>
                    <input
                      ref={situationImageRef}
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Bild der Einstiegssituation auswählen"
                      onChange={(event) => uploadSituationImage(event.target.files?.[0])}
                    />
                    {plan.situationImageDataUrl ? (
                      <div className="group relative h-[132px] overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                        <img
                          src={plan.situationImageDataUrl}
                          alt={plan.situationImageName || "Einstiegssituation"}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-3 pt-8">
                          <span className="min-w-0 truncate text-[10px] font-semibold text-white/80">{plan.situationImageName || "Einstiegsbild"}</span>
                          <span className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              aria-label="Bild der Einstiegssituation ersetzen"
                              className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink transition hover:bg-white"
                              onClick={() => situationImageRef.current?.click()}
                            >
                              <ImagePlus size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label="Bild der Einstiegssituation entfernen"
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
                        className="flex h-[132px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 text-center transition hover:border-lime hover:bg-white/10"
                        onClick={() => situationImageRef.current?.click()}
                        disabled={imageBusy}
                      >
                        <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sky"><ImagePlus size={19} /></span>
                        <span className="text-xs font-bold">{imageBusy ? "Bild wird vorbereitet …" : "Bild hochladen"}</span>
                        <span className="mt-1 text-[10px] leading-snug text-white/40">JPEG, PNG oder WebP · max. 10 MB</span>
                      </button>
                    )}
                    {imageError && <p className="mt-2 text-[10px] font-semibold leading-snug text-clay">{imageError}</p>}
                  </div>
                </div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-white/45">Globalziel der Unterrichtseinheit</label>
                <textarea
                  aria-label="Globalziel"
                  className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-lg leading-relaxed text-white outline-none backdrop-blur focus:border-lime sm:text-xl"
                  value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                />
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[.14em] text-sky">Beobachtungsauftrag</div>
                      <p className="mt-1 text-xs text-white/60">Ich möchte den Hospitierenden einen Beobachtungsauftrag geben.</p>
                    </div>
                    <div className="flex rounded-full bg-white/10 p-1" aria-label="Beobachtungsauftrag auswählen">
                      <button
                        type="button"
                        aria-pressed={plan.observationEnabled}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${plan.observationEnabled ? "bg-clay text-white" : "text-white/55 hover:text-white"}`}
                        onClick={() => updatePlan("observationEnabled", true)}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        aria-pressed={!plan.observationEnabled}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${!plan.observationEnabled ? "bg-white text-ink" : "text-white/55 hover:text-white"}`}
                        onClick={() => updatePlan("observationEnabled", false)}
                      >
                        Nein
                      </button>
                    </div>
                  </div>
                  {plan.observationEnabled && (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/45">Beobachtungsauftrag formulieren</span>
                      <textarea
                        aria-label="Beobachtungsauftrag formulieren"
                        className="min-h-24 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-lime"
                        placeholder="Beobachtet bitte besonders, wie …"
                        value={plan.observationTask}
                        onChange={(event) => updatePlan("observationTask", event.target.value)}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-2xl bg-white/10 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/45">Datum</span>
                  <input type="date" className="w-full bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" value={plan.date} onChange={(e) => updatePlan("date", e.target.value)} />
                </label>
                <label className="rounded-2xl bg-white/10 p-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/45">Beginn</span>
                  <input type="time" className="w-full bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" value={plan.startTime} onChange={(e) => updatePlan("startTime", e.target.value)} />
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
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">Der rote Faden deiner Stunde</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Unterrichtsverlaufsplan</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="icon-btn border-clay/25 text-clay hover:border-clay/50 hover:bg-clay/5 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/25 disabled:hover:bg-white"
                  disabled={!selected || plan.phases.length <= 1}
                  onClick={() => selected && deletePhase(selected.id)}
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Phase entfernen</span>
                  <span className="sm:hidden">Entfernen</span>
                </button>
                <button className="icon-btn" onClick={addPhase}><Plus size={17} /> <span className="hidden sm:inline">Phase</span></button>
              </div>
            </div>
            <div className="timeline-scroll overflow-x-auto pb-5 pt-2">
              <div className="relative flex min-w-max items-center gap-3 px-2 py-4">
                <div className="absolute left-4 right-4 top-1/2 h-px bg-ink/15" />
                {plan.phases.map((phase, index) => {
                  const before = plan.phases.slice(0, index).reduce((s, p) => s + Number(p.minutes || 0), 0);
                  const active = phase.id === selected?.id;
                  const isEntry = index === 0;
                  return (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedId(phase.id)}
                      className={`relative z-10 flex flex-col justify-between overflow-hidden rounded-[2rem] border text-left transition duration-300 ${isEntry ? "h-52 w-64 p-5" : "h-44 w-48 p-4"} ${active ? "scale-[1.025] border-ink bg-white shadow-soft" : "border-ink/10 bg-paper hover:-translate-y-1 hover:bg-white"}`}
                    >
                      <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] opacity-80" style={{ background: phase.color }} />
                      <div className="relative">
                        <span className="text-[10px] font-bold uppercase tracking-[.15em] text-ink/45">{isEntry ? "Einstieg · Fokus" : `Phase ${index + 1}`}</span>
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
                  );
                })}
              </div>
            </div>
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
                  <button title="Phase löschen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/35 transition hover:bg-clay/10 hover:text-clay disabled:opacity-20" disabled={plan.phases.length <= 1} onClick={() => deletePhase(selected.id)}><Trash2 size={18} /></button>
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
              <span className="text-xs text-ink/45">nach dem Modell Wissen · Können · Wollen</span>
            </div>
            <CompetencyLandscape phases={plan.phases} />
          </section>
        </main>
        <footer className="border-t-2 border-clay bg-ink px-4 py-6 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1540px] flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-sky">Seminar Metalltechnik · UVP Studio</span>
            <span className="text-white/60">entwickelt von Jan Hacker für die gewerblich-technische Universitätsberufsschule Bayreuth</span>
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
      <section className="print-page">
        <PrintHeader page="01" title="Unterrichtsverlauf" />
        <div className="mt-6 rounded-[7mm] bg-ink p-[7mm] text-white">
          <div className="text-[8pt] font-bold uppercase tracking-[.16em] text-sky">Thema der Stunde</div>
          <h1 className="mt-2 font-display text-[22pt] font-bold leading-tight">{plan.topic}</h1>
          {(plan.situationDescription || plan.situationImageDataUrl) && (
            <div className={`mt-4 gap-[5mm] border-t border-white/15 pt-3 ${plan.situationImageDataUrl ? "grid grid-cols-[1fr_40mm]" : ""}`}>
              <div>
                <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-white/45">Situationsbeschreibung · berufliche Handlung</div>
                <p className="mt-1 line-clamp-4 text-[8.5pt] leading-snug text-white/75">{plan.situationDescription || "Einstiegssituation zur beruflichen Handlung"}</p>
              </div>
              {plan.situationImageDataUrl && (
                <img
                  src={plan.situationImageDataUrl}
                  alt={plan.situationImageName || "Einstiegssituation"}
                  className="h-[26mm] w-[40mm] rounded-[3mm] object-cover"
                />
              )}
            </div>
          )}
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="text-[8pt] font-bold uppercase tracking-[.14em] text-white/45">Globalziel</div>
            <p className="mt-1 text-[12pt] leading-snug">{plan.globalGoal}</p>
          </div>
          {plan.observationEnabled && plan.observationTask && (
            <div className="mt-3 border-t border-white/15 pt-2.5">
              <div className="text-[7pt] font-bold uppercase tracking-[.14em] text-sky">Beobachtungsauftrag für Hospitierende</div>
              <p className="mt-1 line-clamp-2 text-[8pt] leading-snug text-white/75">{plan.observationTask}</p>
            </div>
          )}
          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-5">
            <div className="text-[8pt] text-white/55">
              <div className="font-bold uppercase tracking-[.13em]">Datum · Klasse</div>
              <div className="mt-1 text-[10pt] font-semibold text-white">{plan.date}{plan.className ? ` · ${plan.className}` : ""}</div>
            </div>
            <div className="min-w-[82mm] rounded-[4mm] bg-clay px-[5mm] py-[3.5mm] text-white">
              <div className="text-[7pt] font-bold uppercase tracking-[.15em] opacity-65">Unterrichtszeit</div>
              <div className="mt-1 font-display text-[17pt] font-bold leading-none">
                {plan.startTime}–{addMinutes(plan.startTime, totalMinutes)} Uhr
              </div>
              <div className="mt-1.5 text-[9pt] font-bold">{totalMinutes} Minuten Gesamtdauer</div>
            </div>
          </div>
        </div>
        <h2 className="mb-3 mt-6 font-display text-[16pt] font-bold">Zeitstrahl</h2>
        <div className="space-y-[2.5mm]">
          {plan.phases.map((phase, index) => {
            const before = plan.phases.slice(0, index).reduce((s, p) => s + Number(p.minutes || 0), 0);
            return (
              <div key={phase.id} className="grid grid-cols-[24mm_1fr_21mm] overflow-hidden rounded-[3mm] border border-ink/10">
                <div className="p-[3mm]" style={{ background: phase.color }}>
                  <div className="text-[7pt] font-bold uppercase opacity-55">Phase {index + 1}</div>
                  <div className="mt-1 font-display text-[10pt] font-bold leading-tight">{phase.title}</div>
                </div>
                <div className="grid grid-cols-3 gap-[3mm] p-[3mm] text-[7.5pt] leading-snug">
                  <div><b>Wir-Lernziel</b><br />{phase.goal || "—"}</div>
                  <div><b>Unterrichtsinhalt</b><br />{phase.content || "—"}</div>
                  <div>
                    <b>Methode / Material</b><br />{phase.methods || "—"}
                    {phase.differentiation === "Ja" && (phase.differentiationDetails.up || phase.differentiationDetails.down) && (
                      <div className="mt-1 text-[6.5pt] text-ink/60">
                        <b>Differenzierung:</b>
                        {phase.differentiationDetails.up && ` ↑ ${phase.differentiationDetails.upHow || "nach oben"}`}
                        {phase.differentiationDetails.down && ` ↓ ${phase.differentiationDetails.downHow || "nach unten"}`}
                      </div>
                    )}
                  </div>
                  {index === 0 && <div className="col-span-3 -mt-1 text-[7pt] text-ink/65"><b>Moderation:</b> {phase.moderation || "—"}</div>}
                </div>
                <div className="flex flex-col items-center justify-center border-l border-ink/10 bg-paper text-center">
                  <strong className="text-[10pt]">{phase.minutes}′</strong>
                  <span className="mt-1 text-[6.5pt] text-ink/50">{addMinutes(plan.startTime, before)}<br />{addMinutes(plan.startTime, before + Number(phase.minutes || 0))}</span>
                </div>
              </div>
            );
          })}
        </div>
        <PrintFooter />
      </section>
      <section className="print-page">
        <PrintHeader page="02" title="Handlungskompetenz" />
        <div className="mt-6">
          <h1 className="font-display text-[22pt] font-bold">Kompetenzprofil der Stunde</h1>
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
    <div className="flex items-center justify-between rounded-[4mm] border-b-2 border-clay bg-ink px-[4mm] py-[2.5mm] text-white">
      <div className="flex items-center gap-[4mm]">
        <img src={SCHOOL_LOGO} alt="Staatliche Berufsschule 1 Bayreuth" className="h-[9mm] w-auto object-contain" />
        <div>
          <div className="font-display text-[12pt] font-bold uppercase leading-none">Seminar Metalltechnik</div>
          <div className="mt-1 text-[6pt] font-bold uppercase tracking-[.18em] text-sky">UVP Studio</div>
        </div>
      </div>
      <div className="text-[7pt] font-bold uppercase tracking-[.16em] text-white/60">{title} · {page}</div>
    </div>
  );
}
function PrintFooter() {
  return (
    <div className="absolute bottom-[8mm] left-[14mm] right-[14mm] flex justify-between gap-5 border-t border-clay/40 pt-2 text-[6.2pt] text-ink/40">
      <span className="font-bold text-moss">Seminar Metalltechnik · UVP Studio</span>
      <span>entwickelt von Jan Hacker für die gewerblich-technische Universitätsberufsschule Bayreuth</span>
    </div>
  );
}
