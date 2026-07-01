import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronRight, Clock3, Download, FileDown, Grid3X3,
  Menu, Plus, Printer, Save, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { initialPlan, phaseTemplate } from "./data.ts";
import type { CompetencyArea, CompetencyDimension, Phase, Plan } from "./types.ts";

const STORAGE_KEY = "uvp-studio-plan-v1";
const areas: { key: CompetencyArea; label: string; short: string }[] = [
  { key: "fach", label: "Fachkompetenz", short: "Fach" },
  { key: "selbst", label: "Selbstkompetenz", short: "Selbst" },
  { key: "sozial", label: "Sozialkompetenz", short: "Sozial" },
];
const dimensions: { key: CompetencyDimension; label: string }[] = [
  { key: "wissen", label: "Wissen" }, { key: "wollen", label: "Wollen" }, { key: "koennen", label: "Können" },
];

const addMinutes = (time: string, minutes: number) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const readStoredPlan = (): Plan => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : initialPlan();
  } catch { return initialPlan(); }
};

export default function App() {
  const [plan, setPlan] = useState<Plan>(readStoredPlan);
  const [selectedId, setSelectedId] = useState(plan.phases[0]?.id ?? "");
  const [matrixOpen, setMatrixOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [saved, setSaved] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const totalMinutes = useMemo(() => plan.phases.reduce((sum, p) => sum + Number(p.minutes || 0), 0), [plan.phases]);
  const selected = plan.phases.find((p) => p.id === selectedId) ?? plan.phases[0];

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setSaved(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [plan]);

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
        const next = JSON.parse(String(reader.result)) as Plan;
        if (!next.globalGoal || !Array.isArray(next.phases)) throw new Error();
        setPlan(next);
        setSelectedId(next.phases[0]?.id ?? "");
      } catch { window.alert("Die Datei ist keine gültige UVP-Planung."); }
    };
    reader.readAsText(file);
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
      <div className="app-shell min-h-screen bg-paper">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1540px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-lime"><Sparkles size={19} /></div>
              <div>
                <div className="font-display text-xl font-bold leading-none">UVP Studio</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-ink/45">Vom Ziel zur Stunde</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink/50">
                {saved ? <Check size={14} /> : <Save size={14} className="animate-pulse" />}
                {saved ? "Lokal gespeichert" : "Speichert …"}
              </span>
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Import</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON</button>
              <button className="icon-btn border-ink bg-ink text-white hover:bg-moss" onClick={() => window.print()}><FileDown size={16} />PDF exportieren</button>
            </div>
            <button aria-label="Menü öffnen" className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 md:hidden" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X /> : <Menu />}
            </button>
          </div>
          {mobileNav && (
            <div className="grid gap-2 border-t border-ink/10 bg-white p-4 md:hidden">
              <button className="icon-btn" onClick={() => importRef.current?.click()}><Upload size={16} />Plan importieren</button>
              <button className="icon-btn" onClick={exportJson}><Download size={16} />JSON exportieren</button>
              <button className="icon-btn bg-ink text-white" onClick={() => window.print()}><Printer size={16} />Als PDF drucken</button>
            </div>
          )}
          <input ref={importRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => importJson(e.target.files?.[0])} />
        </header>

        <main className="mx-auto max-w-[1540px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <section className="relative overflow-hidden rounded-[2rem] bg-ink px-5 py-7 text-white sm:px-8 lg:px-10 lg:py-9">
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-lime/10" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
              <div>
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-lime"><BookOpen size={15} />Unterrichtsentwurf</div>
                <input
                  aria-label="Thema der Stunde"
                  className="mb-5 w-full border-0 border-b border-white/15 bg-transparent pb-2 font-display text-2xl font-bold outline-none placeholder:text-white/30 focus:border-lime sm:text-3xl"
                  value={plan.topic} onChange={(e) => updatePlan("topic", e.target.value)}
                />
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-white/45">Globalziel der Unterrichtseinheit</label>
                <textarea
                  aria-label="Globalziel"
                  className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-lg leading-relaxed text-white outline-none backdrop-blur focus:border-lime sm:text-xl"
                  value={plan.globalGoal} onChange={(e) => updatePlan("globalGoal", e.target.value)}
                />
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
                <div className="col-span-2 flex items-center justify-between rounded-2xl bg-lime px-4 py-3 text-ink">
                  <span className="text-xs font-bold uppercase tracking-wider">Gesamt</span>
                  <span className="font-display text-xl font-bold">{totalMinutes} Min · bis {addMinutes(plan.startTime, totalMinutes)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="label">Planungsverlauf</div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Der rote Faden deiner Stunde</h2>
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
                  <label><span className="label">Methoden & Material</span><textarea className="field min-h-28" placeholder="z. B. Think–Pair–Share, Impulskarte …" value={selected.methods} onChange={(e) => updatePhase(selected.id, { methods: e.target.value })} /></label>
                  <label><span className="label">Moderation</span><textarea className="field min-h-28" placeholder="Leitfragen, Übergänge, Impulse …" value={selected.moderation} onChange={(e) => updatePhase(selected.id, { moderation: e.target.value })} /></label>
                  <div className="sm:col-span-2">
                    <span className="label">Differenzierung</span>
                    <div className="flex flex-wrap gap-2">
                      {(["Ja", "Nein", "Nicht vorgesehen"] as const).map((value) => (
                        <button key={value} onClick={() => updatePhase(selected.id, { differentiation: value })} className={`rounded-full px-4 py-2 text-xs font-bold transition ${selected.differentiation === value ? "bg-ink text-white" : "bg-paper text-ink/55 hover:text-ink"}`}>{value}</button>
                      ))}
                    </div>
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
                    <p className="mb-5 text-xs leading-relaxed text-ink/50">Wähle je Kompetenzfeld die angestrebte DQR-Niveaustufe. 0 bedeutet: in dieser Phase nicht fokussiert.</p>
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
                              {[0, 1, 2, 3, 4].map((level) => <option value={level} key={level}>{level === 0 ? "–" : `DQR ${level}`}</option>)}
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

          <section className="mt-8">
            <div className="mb-4"><div className="label">Organisation</div><h2 className="font-display text-2xl font-bold sm:text-3xl">Vorbereitet durch die Stunde</h2></div>
            <div className="grid gap-4 lg:grid-cols-3">
              {([
                ["before", "Vor der Stunde", "Raum, Technik, Material, Ausdrucke …"],
                ["during", "Während der Stunde", "Beobachtungsaufträge, Zeitwächter, Plan B …"],
                ["after", "Nach der Stunde", "Ergebnisse sichern, Feedback, Anschluss …"],
              ] as const).map(([key, title, placeholder], index) => (
                <label key={key} className="card p-5">
                  <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-lime">0{index + 1}</span>
                  <span className="font-display text-xl font-bold">{title}</span>
                  <textarea className="field mt-4 min-h-32 border-0 bg-paper" placeholder={placeholder} value={plan.preparation[key]} onChange={(e) => updatePlan("preparation", { ...plan.preparation, [key]: e.target.value })} />
                </label>
              ))}
            </div>
          </section>

          <section className="mb-8 mt-8 overflow-hidden rounded-[2rem] border border-ink/10 bg-white p-5 sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><div className="label">Gesamtbild</div><h2 className="font-display text-2xl font-bold sm:text-3xl">Handlungskompetenzmatrix</h2></div>
              <span className="text-xs text-ink/45">nach dem Modell Wissen · Wollen · Können</span>
            </div>
            <MatrixVisualization phases={plan.phases} />
          </section>
        </main>
      </div>
      <PrintDocument plan={plan} totalMinutes={totalMinutes} />
    </>
  );
}

function MatrixVisualization({ phases, compact = false }: { phases: Phase[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <div className={`${compact ? "min-w-[650px]" : "min-w-[760px]"} grid grid-cols-[130px_repeat(9,minmax(58px,1fr))] gap-px overflow-hidden rounded-2xl bg-ink/10`}>
        <div className="bg-ink p-3 text-xs font-bold text-white">Phase</div>
        {areas.map((area) => dimensions.map((dimension) => (
          <div key={`${area.key}-${dimension.key}`} className="bg-ink p-2 text-center text-white">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/45">{area.short}</div>
            <div className="text-[10px] font-semibold">{dimension.label}</div>
          </div>
        )))}
        {phases.map((phase) => (
          <Fragment key={phase.id}>
            <div className="flex items-center gap-2 bg-white p-3 text-xs font-bold"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: phase.color }} />{phase.title}</div>
            {areas.flatMap((area) => dimensions.map((dimension) => {
              const value = phase.competencies?.[area.key]?.[dimension.key] ?? 0;
              return (
                <div key={`${phase.id}-${area.key}-${dimension.key}`} className="grid min-h-12 place-items-center bg-white">
                  {value ? <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold text-ink" style={{ background: phase.color, opacity: .45 + value * .12 }}>{value}</span> : <span className="h-1.5 w-1.5 rounded-full bg-ink/10" />}
                </div>
              );
            }))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function PrintDocument({ plan, totalMinutes }: { plan: Plan; totalMinutes: number }) {
  return (
    <div className="print-only">
      <section className="print-page">
        <PrintHeader page="01" title="Unterrichtsverlauf" />
        <div className="mt-6 rounded-[7mm] bg-ink p-[7mm] text-white">
          <div className="text-[8pt] font-bold uppercase tracking-[.16em] text-lime">Thema der Stunde</div>
          <h1 className="mt-2 font-display text-[22pt] font-bold leading-tight">{plan.topic}</h1>
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="text-[8pt] font-bold uppercase tracking-[.14em] text-white/45">Globalziel</div>
            <p className="mt-1 text-[12pt] leading-snug">{plan.globalGoal}</p>
          </div>
          <div className="mt-4 flex gap-5 text-[9pt] text-white/70"><span>{plan.date}</span><span>{plan.startTime}–{addMinutes(plan.startTime, totalMinutes)} Uhr</span><strong className="text-lime">{totalMinutes} Minuten</strong></div>
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
                <div className="grid grid-cols-2 gap-[3mm] p-[3mm] text-[7.5pt] leading-snug">
                  <div><b>Wir-Lernziel</b><br />{phase.goal || "—"}</div>
                  <div><b>Methode / Material</b><br />{phase.methods || "—"}</div>
                  {index === 0 && <div className="col-span-2 -mt-1 text-[7pt] text-ink/65"><b>Moderation:</b> {phase.moderation || "—"}</div>}
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
          <p className="mt-2 max-w-[155mm] text-[9pt] leading-relaxed text-ink/60">Die Matrix macht sichtbar, welche Facetten beruflicher Handlungskompetenz in den einzelnen Unterrichtsphasen angebahnt werden. Die Zahlen markieren die gewählte DQR-Niveaustufe 1–4.</p>
        </div>
        <div className="mt-6"><MatrixVisualization phases={plan.phases} compact /></div>
        <div className="mt-7 grid grid-cols-3 gap-[4mm]">
          {dimensions.map((dimension, index) => (
            <div key={dimension.key} className="rounded-[4mm] bg-paper p-[5mm]">
              <span className="grid h-[8mm] w-[8mm] place-items-center rounded-full bg-ink text-[9pt] font-bold text-lime">0{index + 1}</span>
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
            <strong>DQR-Niveaus</strong>
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
  return <div className="flex items-center justify-between border-b border-ink/15 pb-3"><div className="font-display text-[14pt] font-bold">UVP Studio</div><div className="text-[8pt] font-bold uppercase tracking-[.16em] text-ink/45">{title} · {page}</div></div>;
}
function PrintFooter() {
  return <div className="absolute bottom-[8mm] left-[14mm] right-[14mm] flex justify-between border-t border-ink/10 pt-2 text-[6.5pt] text-ink/35"><span>UVP Studio · Unterrichtsplanung</span><span>Lokal erstellt</span></div>;
}
