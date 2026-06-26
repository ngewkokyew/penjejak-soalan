"use client";

import { useState, useMemo, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Question = {
  noSoalan: number | null;
  representative: string;
  constituency: string;
  date: string;
  minister: string;
  question: string;
  sourceFile: string;
  dateCorrected?: boolean;
};

type DewanData = {
  meetingTitle: string;
  sessions: string[];
  questions: Question[];
};

type View = "overview" | "by-rep" | "by-minister";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => {
      if (["bin", "binti", "a/l", "anak", "dan", "dan"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function shortMinister(full: string) {
  return full
    .replace(/^PERDANA MENTERI$/, "Perdana Menteri")
    .replace(/^MENTERI\s+/, "")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function parseYear(date: string) {
  const m = date.match(/\b(202[2-9]|20[3-9]\d)\b/);
  return m ? m[1] : "?";
}

function groupByRep(questions: Question[]) {
  const map = new Map<string, { name: string; constituency: string; questions: Question[] }>();
  for (const q of questions) {
    const key = `${q.representative}__${q.constituency}`;
    if (!map.has(key)) map.set(key, { name: q.representative, constituency: q.constituency, questions: [] });
    map.get(key)!.questions.push(q);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.questions.length - a.questions.length || a.name.localeCompare(b.name)
  );
}

function groupByMinister(questions: Question[]) {
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    const k = q.minister || "TIADA";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(q);
  }
  return Array.from(map.entries())
    .map(([minister, qs]) => ({ minister, questions: qs }))
    .sort((a, b) => b.questions.length - a.questions.length);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-3xl font-bold text-blue-800">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = Math.max(4, Math.round((count / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 md:w-48 text-xs text-gray-700 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-xs font-semibold text-gray-600 text-right shrink-0">{count}</div>
    </div>
  );
}

function YearFilter({
  years,
  selected,
  onChange,
}: {
  years: string[];
  selected: string;
  onChange: (y: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onChange("ALL")}
        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          selected === "ALL" ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Semua
      </button>
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            selected === y ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewView({ data }: { data: DewanData }) {
  const years = useMemo(
    () => [...new Set(data.questions.map((q) => parseYear(q.date)))].filter((y) => y !== "?").sort(),
    [data]
  );
  const [year, setYear] = useState("ALL");

  const qs = useMemo(
    () => (year === "ALL" ? data.questions : data.questions.filter((q) => parseYear(q.date) === year)),
    [data, year]
  );

  const reps = useMemo(() => groupByRep(qs), [qs]);
  const byMinister = useMemo(() => groupByMinister(qs), [qs]);
  const maxM = byMinister[0]?.questions.length ?? 1;
  const top10Ministers = byMinister.slice(0, 10);
  const topReps = reps.slice(0, 5);

  const colors = [
    "bg-blue-600", "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
    "bg-green-500", "bg-amber-500", "bg-orange-500", "bg-rose-500", "bg-pink-500",
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tapis mengikut tahun</p>
        <YearFilter years={years} selected={year} onChange={setYear} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Jumlah Soalan" value={qs.length.toLocaleString()} sub={year === "ALL" ? `${data.sessions.length} hari persidangan` : `Tahun ${year}`} />
        <StatCard label="Wakil Rakyat Aktif" value={reps.length.toLocaleString()} sub="Ahli Parlimen" />
        <StatCard label="Kementerian Disasar" value={byMinister.length.toLocaleString()} sub="Kementerian berbeza" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">10 Teratas: Soalan Mengikut Kementerian</h3>
          <div className="space-y-2.5">
            {top10Ministers.map(({ minister, questions }, i) => (
              <MiniBar
                key={minister}
                label={shortMinister(minister)}
                count={questions.length}
                max={maxM}
                color={colors[i % colors.length]}
              />
            ))}
          </div>
          {byMinister.length > 10 && (
            <p className="text-xs text-gray-400 mt-3">+{byMinister.length - 10} kementerian lain</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Wakil Rakyat Paling Aktif</h3>
          <div className="space-y-3">
            {topReps.map((rep, i) => (
              <div key={`${rep.name}__${rep.constituency}`} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{toTitleCase(rep.name)}</p>
                  <p className="text-xs text-gray-500">{rep.constituency}</p>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                  {rep.questions.length}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {reps.filter((r) => r.questions.length === 1).length} daripada {reps.length} wakil rakyat mengemukakan 1 soalan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── By-representative ─────────────────────────────────────────────────────────

function ByRepView({ data }: { data: DewanData }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const years = useMemo(
    () => [...new Set(data.questions.map((q) => parseYear(q.date)))].filter((y) => y !== "?").sort(),
    [data]
  );
  const [year, setYear] = useState("ALL");

  const filteredQuestions = useMemo(
    () => (year === "ALL" ? data.questions : data.questions.filter((q) => parseYear(q.date) === year)),
    [data, year]
  );

  const allReps = useMemo(() => groupByRep(filteredQuestions), [filteredQuestions]);


  const displayReps = useMemo(() => {
    if (!search.trim()) return allReps;
    const q = search.toLowerCase();
    return allReps.filter(
      (r) => r.name.toLowerCase().includes(q) || r.constituency.toLowerCase().includes(q)
    );
  }, [allReps, search]);

  const selectedRep = useMemo(
    () => allReps.find((r) => `${r.name}__${r.constituency}` === selected) ?? null,
    [allReps, selected]
  );

  useEffect(() => { setSelectedMinisters(new Set()); }, [selected]);

  const repByMinister = useMemo(
    () => (selectedRep ? groupByMinister(selectedRep.questions) : []),
    [selectedRep]
  );

  const [selectedMinisters, setSelectedMinisters] = useState<Set<string>>(new Set());

  const toggleMinister = (minister: string) => {
    setSelectedMinisters(prev => {
      const next = new Set(prev);
      if (next.has(minister)) next.delete(minister); else next.add(minister);
      return next;
    });
  };

  const visibleQuestions = useMemo(() => {
    if (!selectedRep) return [];
    if (selectedMinisters.size === 0) return selectedRep.questions;
    return selectedRep.questions.filter(q => selectedMinisters.has(q.minister));
  }, [selectedRep, selectedMinisters]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <YearFilter years={years} selected={year} onChange={(y) => { setYear(y); setSelected(null); }} />
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        <aside className={`w-full md:w-72 md:shrink-0 ${selected ? "hidden md:block" : ""}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Cari nama atau kawasan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p className="text-xs text-gray-400 mt-1.5 px-1">{displayReps.length} wakil rakyat</p>
            </div>
            <div className="overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-340px)]">
              {displayReps.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Tiada keputusan</p>
              ) : (
                displayReps.map((rep) => {
                  const key = `${rep.name}__${rep.constituency}`;
                  const active = selected === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(active ? null : key)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors ${
                        active ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${active ? "text-blue-800" : "text-gray-800"}`}>
                            {toTitleCase(rep.name)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{rep.constituency}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                          active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          {rep.questions.length}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!selectedRep ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
              <div className="text-4xl mb-3">👇</div>
              <p className="text-gray-500 text-sm">Pilih wakil rakyat untuk melihat soalan mereka</p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden flex items-center gap-1.5 text-sm text-blue-700 font-medium"
              >
                ← Kembali ke senarai
              </button>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-900">{toTitleCase(selectedRep.name)}</h2>
                <p className="text-sm text-blue-700 font-medium">Parlimen {selectedRep.constituency}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedRep.questions.length} soalan dikemukakan</p>
                {repByMinister.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Soalan mengikut kementerian
                        {selectedMinisters.size > 0 && (
                          <span className="ml-2 text-blue-600 normal-case font-normal">
                            ({visibleQuestions.length} / {selectedRep!.questions.length} soalan)
                          </span>
                        )}
                      </p>
                      {selectedMinisters.size > 0 && (
                        <button
                          onClick={() => setSelectedMinisters(new Set())}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Padam tapisan
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {repByMinister.map(({ minister, questions }) => {
                        const active = selectedMinisters.has(minister);
                        return (
                          <button
                            key={minister}
                            onClick={() => toggleMinister(minister)}
                            className={`text-xs px-2 py-1 rounded font-medium border transition-colors ${
                              active
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                            }`}
                          >
                            {questions.length}× {shortMinister(minister)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {visibleQuestions.map((q, idx) => (
                <div key={`${q.date}-${q.noSoalan}-${idx}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {shortMinister(q.minister)}
                        </p>
                        <p className="text-xs text-gray-400">
                          📅 {q.date}{q.dateCorrected && <span className="text-amber-500 ml-0.5" title="Tarikh telah diperbetulkan — tahun dalam PDF asal adalah salah taip">*</span>}
                        </p>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{q.question}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── By-minister ───────────────────────────────────────────────────────────────

function ByMinisterView({ data }: { data: DewanData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const years = useMemo(
    () => [...new Set(data.questions.map((q) => parseYear(q.date)))].filter((y) => y !== "?").sort(),
    [data]
  );
  const [year, setYear] = useState("ALL");

  const filteredQuestions = useMemo(
    () => (year === "ALL" ? data.questions : data.questions.filter((q) => parseYear(q.date) === year)),
    [data, year]
  );

  const byMinister = useMemo(() => groupByMinister(filteredQuestions), [filteredQuestions]);
  const max = byMinister[0]?.questions.length ?? 1;
  const colors = [
    "bg-blue-600", "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
    "bg-green-500", "bg-amber-500", "bg-orange-500", "bg-rose-500", "bg-pink-500",
  ];

  const selectedGroup = byMinister.find((g) => g.minister === selected) ?? null;

  // Paginate questions in detail panel
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(0);
  const pagedQs = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.questions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [selectedGroup, page]);
  const totalPages = selectedGroup ? Math.ceil(selectedGroup.questions.length / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <YearFilter years={years} selected={year} onChange={(y) => { setYear(y); setSelected(null); }} />
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        <aside className={`w-full md:w-72 md:shrink-0 ${selected ? "hidden md:block" : ""}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {byMinister.length} Kementerian
              </p>
            </div>
            <div className="overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-320px)]">
              {byMinister.map(({ minister, questions }, i) => {
                const active = selected === minister;
                const pct = Math.max(4, Math.round((questions.length / max) * 100));
                return (
                  <button
                    key={minister}
                    onClick={() => { setSelected(active ? null : minister); setPage(0); }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors ${
                      active ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className={`text-xs font-semibold leading-snug ${active ? "text-blue-800" : "text-gray-700"}`}>
                        {shortMinister(minister)}
                      </p>
                      <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {questions.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!selectedGroup ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-gray-500 text-sm">Pilih kementerian untuk melihat semua soalan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => { setSelected(null); setPage(0); }}
                className="md:hidden flex items-center gap-1.5 text-sm text-blue-700 font-medium"
              >
                ← Kembali ke senarai
              </button>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-900">{toTitleCase(selectedGroup.minister)}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedGroup.questions.length} soalan daripada{" "}
                  {new Set(selectedGroup.questions.map((q) => q.representative)).size} wakil rakyat
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Sebelum
                    </button>
                    <span className="text-xs text-gray-500">
                      Halaman {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page === totalPages - 1}
                      className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      Seterusnya →
                    </button>
                  </div>
                )}
              </div>

              {pagedQs.map((q, idx) => (
                <div key={`${q.date}-${q.noSoalan}-${idx}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-gray-700">
                          {toTitleCase(q.representative)}{" "}
                          <span className="text-blue-600">[{q.constituency}]</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          📅 {q.date}{q.dateCorrected && <span className="text-amber-500 ml-0.5" title="Tarikh telah diperbetulkan — tahun dalam PDF asal adalah salah taip">*</span>}
                        </p>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{q.question}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function DewanRakyatPage() {
  const [data, setData] = useState<DewanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("overview");

  useEffect(() => {
    fetch("/data/dewan-rakyat.json")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tabs: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Ringkasan", icon: "📊" },
    { id: "by-rep", label: "Mengikut Wakil Rakyat", icon: "👤" },
    { id: "by-minister", label: "Mengikut Kementerian", icon: "🏢" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-5 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-bold tracking-tight">Penjejak Soalan Dewan Rakyat</h1>
          </div>
          <p className="text-blue-200 text-sm ml-9">
            Parlimen Kelima Belas (2022 – Sekarang)
            {data && ` · ${data.questions.length.toLocaleString()} soalan · ${data.sessions.length} hari persidangan`}
          </p>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  view === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <div className="text-3xl mb-3 animate-pulse">🏛️</div>
            <p className="text-gray-500 text-sm">Memuatkan data soalan parlimen...</p>
          </div>
        ) : !data ? (
          <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
            <p className="text-red-600 text-sm">Gagal memuatkan data.</p>
          </div>
        ) : (
          <>
            {view === "overview" && <OverviewView data={data} />}
            {view === "by-rep" && <ByRepView data={data} />}
            {view === "by-minister" && <ByMinisterView data={data} />}
          </>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 mt-4 border-t border-gray-200 space-y-2">
        <p className="text-xs text-gray-400">
          <span className="text-amber-500 font-medium">*</span> Tarikh bertanda asterisk telah diperbetulkan secara automatik — tahun dalam PDF asal adalah salah taip (contoh: &ldquo;2022&rdquo; dalam fail bertarikh 2023). Tarikh yang betul diambil daripada nama fail sumber.
        </p>
        <p className="text-xs text-gray-400">
          <span className="font-medium text-gray-500">Penafian:</span> Laman ini adalah kuratif dan dibangunkan dengan bantuan Claude AI. Data yang dipaparkan mungkin tidak mencerminkan rekod rasmi sebenar. Untuk data muktamad, sila rujuk minit mesyuarat rasmi yang diterbitkan oleh{" "}
          <a href="https://www.parlimen.gov.my" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
            Parlimen Malaysia
          </a>.
        </p>
      </footer>
    </div>
  );
}
