"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Stat,
  AlertBanner,
  DataTable,
  EmptyState,
  Button,
  ScoreIndicator,
  StatusBadge,
} from "@/components/ui";
import { type Column, type SortEntry } from "@/components/ui/DataTable";
import { RefreshCw, X } from "lucide-react";
import CandidateDetailPanel from "@/app/components/CandidateDetailPanel";

// ── Types ────────────────────────────────────────────────────────────

interface Candidate {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  composite_score: number;
  event_type: "spinoff" | "activism";
  form_type: string;
  sic_division: string | null;
  mcap_tag: string;
  scored_at: string;
  filing_year: number;
  filing_url?: string;
}

interface ApiCandidate {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  form_type: string;
  composite_score: number;
  sector: string | null;
  mcap_tag: string;
  filing_date: string;
  filing_url?: string;
}

interface ApiResponse {
  candidates: ApiCandidate[];
  row_count: number;
  last_updated: string | null;
}

interface CandidateFilters {
  eventTypes: Set<"spinoff" | "activism">;
  mcapTags: Set<string>;
  minScore: number;
  sectors: Set<string>;
  yearMin: number | null;
  yearMax: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

const ACTIVISM_FORMS = ["SC 13D", "SC 13G", "DFAN14A", "DEFA14A", "DEFC14A"];

const DEFAULT_SORTS: SortEntry[] = [{ key: "composite_score", dir: "desc" }];

const INITIAL_FILTERS: CandidateFilters = {
  eventTypes: new Set(),
  mcapTags: new Set(),
  minScore: 0,
  sectors: new Set(),
  yearMin: null,
  yearMax: null,
};

function inferEventType(formType: string): "spinoff" | "activism" {
  const upper = formType.toUpperCase();
  return ACTIVISM_FORMS.some((f) => upper.includes(f)) ? "activism" : "spinoff";
}

function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMcap(tag: string): string {
  const labels: Record<string, string> = {
    sub_1b_confirmed: "< $1B \u2713",
    sub_1b_unconfirmed: "< $1B",
    above_1b: "> $1B",
  };
  return labels[tag] ?? tag;
}

function mapCandidate(c: ApiCandidate): Candidate {
  const filingDate =
    typeof c.filing_date === "string"
      ? c.filing_date
      : (c.filing_date as unknown as Date).toISOString();
  return {
    filing_id: c.filing_id,
    company_name: c.company_name,
    ticker: c.ticker,
    composite_score: c.composite_score,
    event_type: inferEventType(c.form_type),
    form_type: c.form_type,
    sic_division: c.sector,
    mcap_tag: c.mcap_tag,
    scored_at: filingDate,
    filing_year: new Date(filingDate).getFullYear(),
    filing_url: c.filing_url,
  };
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function filtersActive(f: CandidateFilters): boolean {
  return (
    f.eventTypes.size > 0 ||
    f.mcapTags.size > 0 ||
    f.minScore > 0 ||
    f.sectors.size > 0 ||
    f.yearMin !== null ||
    f.yearMax !== null
  );
}

// ── Sector Dropdown ──────────────────────────────────────────────────

function SectorDropdown({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 text-xs rounded-md bg-surface-elevated text-ink-secondary hover:text-ink-primary"
      >
        Sector{selected.size > 0 ? ` (${selected.size})` : ""}
        <svg className="inline w-3 h-3 ml-1" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3 5L6 8L9 5" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 max-h-48 overflow-y-auto bg-surface-elevated border border-surface-sunken rounded-lg shadow-lg z-20 py-1">
          {options.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-secondary hover:bg-surface-sunken cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(s)}
                onChange={() => onChange(toggleSet(selected, s))}
                className="rounded border-surface-sunken"
              />
              {s}
            </label>
          ))}
          {options.length === 0 && (
            <span className="block px-3 py-1.5 text-xs text-ink-tertiary">No sectors</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function CandidatesDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorts, setSorts] = useState<SortEntry[]>(DEFAULT_SORTS);
  const [filters, setFilters] = useState<CandidateFilters>(INITIAL_FILTERS);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setCandidates(json.candidates.map(mapCandidate));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Derived data ─────────────────────────────────────────────────

  const sectorOptions = useMemo(
    () => [...new Set(candidates.map((c) => c.sic_division).filter(Boolean) as string[])].sort(),
    [candidates]
  );

  const yearRange = useMemo(() => {
    if (candidates.length === 0) return { min: 2000, max: 2026 };
    const years = candidates.map((c) => c.filing_year);
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [candidates]);

  const yearOptions = useMemo(() => {
    const opts: number[] = [];
    for (let y = yearRange.min; y <= yearRange.max; y++) opts.push(y);
    return opts;
  }, [yearRange]);

  const processed = useMemo(() => {
    let result = candidates;

    if (filters.eventTypes.size > 0) {
      result = result.filter((c) => filters.eventTypes.has(c.event_type));
    }
    if (filters.mcapTags.size > 0) {
      result = result.filter((c) => filters.mcapTags.has(c.mcap_tag));
    }
    if (filters.minScore > 0) {
      result = result.filter((c) => c.composite_score >= filters.minScore);
    }
    if (filters.sectors.size > 0) {
      result = result.filter((c) => c.sic_division !== null && filters.sectors.has(c.sic_division));
    }
    if (filters.yearMin !== null) {
      result = result.filter((c) => c.filing_year >= filters.yearMin!);
    }
    if (filters.yearMax !== null) {
      result = result.filter((c) => c.filing_year <= filters.yearMax!);
    }

    return [...result].sort((a, b) => {
      for (const { key, dir } of sorts) {
        const aVal = a[key as keyof Candidate];
        const bVal = b[key as keyof Candidate];
        let cmp: number;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        }
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [candidates, filters, sorts]);

  const isFiltered = filtersActive(filters);

  const highConviction = processed.filter(
    (c) => c.composite_score >= 0.75
  ).length;

  const avgScore = processed.length
    ? (
        processed.reduce((s, c) => s + c.composite_score, 0) /
        processed.length
      ).toFixed(2)
    : "\u2014";

  const pendingCount = candidates.filter((c) => {
    const elapsed = Date.now() - new Date(c.scored_at).getTime();
    return elapsed > 24 * 60 * 60 * 1000;
  }).length;

  // ── Sort handler ─────────────────────────────────────────────────

  const handleSort = (key: string) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { key, dir: updated[idx].dir === "asc" ? "desc" : "asc" };
        return updated;
      }
      const defaultDir = key === "composite_score" ? "desc" : "asc";
      return [...prev, { key, dir: defaultDir }];
    });
  };

  const handleClearAll = () => {
    setFilters(INITIAL_FILTERS);
    setSorts(DEFAULT_SORTS);
  };

  // ── Filter updaters ────────────────────────────────────────────

  const updateFilter = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Columns ──────────────────────────────────────────────────────

  const columns: Column<Candidate>[] = [
    {
      key: "company_name",
      label: "Company",
      sortable: true,
      render: (r) => (
        <div>
          <span className="text-sm font-medium text-ink-primary">
            {r.company_name}
          </span>
          <span className="block text-xs text-ink-tertiary font-mono">
            {r.filing_id}
          </span>
        </div>
      ),
    },
    {
      key: "ticker",
      label: "Ticker",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-sm">{r.ticker ?? "\u2014"}</span>
      ),
    },
    {
      key: "composite_score",
      label: "Score",
      sortable: true,
      render: (r) => <ScoreIndicator score={r.composite_score} size="sm" />,
    },
    {
      key: "event_type",
      label: "Type",
      sortable: true,
      render: (r) => <StatusBadge variant={r.event_type} />,
    },
    {
      key: "form_type",
      label: "Form",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-ink-secondary font-mono">
          {r.form_type}
        </span>
      ),
    },
    {
      key: "sic_division",
      label: "Sector",
      sortable: true,
      render: (r) => (
        <span className="text-sm text-ink-secondary">
          {r.sic_division ?? "\u2014"}
        </span>
      ),
    },
    {
      key: "mcap_tag",
      label: "Market Cap",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-ink-tertiary">
          {formatMcap(r.mcap_tag)}
        </span>
      ),
    },
    {
      key: "filing_year",
      label: "Year",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-ink-tertiary">{r.filing_year}</span>
      ),
    },
    {
      key: "scored_at",
      label: "Filed",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-ink-tertiary">
          {formatDate(r.scored_at)}
        </span>
      ),
    },
    {
      key: "filing_url",
      label: "EDGAR",
      render: (r) =>
        r.filing_url ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              window.open(r.filing_url, "_blank", "noopener,noreferrer");
            }}
          >
            View
          </Button>
        ) : null,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────

  const chipClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded-md cursor-pointer transition-fast ${
      active
        ? "bg-ink-primary/10 text-ink-primary ring-1 ring-ink-primary/30"
        : "bg-surface-elevated text-ink-tertiary hover:text-ink-secondary"
    }`;

  return (
    <AppLayout>
      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />
        )}

        <div className="p-6 max-w-7xl">
          <PageHeader
            title="Candidates"
            subtitle="Screened from sub-$1B public equity universe"
            actions={
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={fetchData}
              >
                Refresh
              </Button>
            }
          />

          <div className="grid grid-cols-3 gap-8 mb-6">
            <Stat
              label="Total Candidates"
              value={isFiltered ? `${processed.length} / ${candidates.length}` : String(candidates.length)}
            />
            <Stat label="High Conviction" value={String(highConviction)} />
            <Stat label="Avg Score" value={avgScore} />
          </div>

          {/* ── Filter Bar ──────────────────────────────────────── */}
          <div className="bg-surface-sunken rounded-lg px-4 py-2 flex flex-wrap items-center gap-3 mb-4">
            {/* Event Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-tertiary mr-1">Type</span>
              <button
                className={chipClass(filters.eventTypes.has("spinoff"))}
                onClick={() => updateFilter("eventTypes", toggleSet(filters.eventTypes, "spinoff"))}
              >
                Spinoff
              </button>
              <button
                className={chipClass(filters.eventTypes.has("activism"))}
                onClick={() => updateFilter("eventTypes", toggleSet(filters.eventTypes, "activism"))}
              >
                Activism
              </button>
            </div>

            <div className="border-l border-surface-elevated h-5" />

            {/* Market Cap */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-tertiary mr-1">MCap</span>
              {(["sub_1b_confirmed", "sub_1b_unconfirmed", "above_1b"] as const).map((tag) => (
                <button
                  key={tag}
                  className={chipClass(filters.mcapTags.has(tag))}
                  onClick={() => updateFilter("mcapTags", toggleSet(filters.mcapTags, tag))}
                >
                  {formatMcap(tag)}
                </button>
              ))}
            </div>

            <div className="border-l border-surface-elevated h-5" />

            {/* Score Threshold */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-tertiary">Score &ge;</span>
              <select
                value={filters.minScore}
                onChange={(e) => updateFilter("minScore", Number(e.target.value))}
                className="px-1.5 py-1 text-xs rounded-md bg-surface-elevated text-ink-secondary border-none focus:ring-1 focus:ring-ink-primary/30"
              >
                <option value={0}>Any</option>
                <option value={0.25}>0.25</option>
                <option value={0.5}>0.50</option>
                <option value={0.75}>0.75</option>
              </select>
            </div>

            <div className="border-l border-surface-elevated h-5" />

            {/* Sector */}
            <SectorDropdown
              options={sectorOptions}
              selected={filters.sectors}
              onChange={(next) => updateFilter("sectors", next)}
            />

            <div className="border-l border-surface-elevated h-5" />

            {/* Year Range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-tertiary">Year</span>
              <select
                value={filters.yearMin ?? ""}
                onChange={(e) => updateFilter("yearMin", e.target.value ? Number(e.target.value) : null)}
                className="px-1.5 py-1 text-xs rounded-md bg-surface-elevated text-ink-secondary border-none focus:ring-1 focus:ring-ink-primary/30"
              >
                <option value="">Min</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="text-ink-tertiary text-xs">&ndash;</span>
              <select
                value={filters.yearMax ?? ""}
                onChange={(e) => updateFilter("yearMax", e.target.value ? Number(e.target.value) : null)}
                className="px-1.5 py-1 text-xs rounded-md bg-surface-elevated text-ink-secondary border-none focus:ring-1 focus:ring-ink-primary/30"
              >
                <option value="">Max</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Clear */}
            {(isFiltered || sorts.length > 1 || sorts[0]?.key !== "composite_score") && (
              <>
                <div className="border-l border-surface-elevated h-5" />
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-ink-tertiary hover:text-ink-secondary rounded-md"
                >
                  <X size={12} />
                  Clear
                </button>
              </>
            )}
          </div>

          {pendingCount > 0 && !alertDismissed && (
            <div className="mb-6">
              <AlertBanner
                variant="warning"
                message={`${pendingCount} candidate${pendingCount === 1 ? "" : "s"} pending review past 24h SLA`}
                onDismiss={() => setAlertDismissed(true)}
              />
            </div>
          )}

          {error && (
            <div className="mb-6">
              <AlertBanner variant="critical" message={`Error: ${error}`} />
            </div>
          )}

          {!loading && candidates.length === 0 ? (
            <EmptyState
              title="No candidates"
              subtitle="The screening model hasn't surfaced any qualifying names yet."
            />
          ) : (
            <DataTable
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              data={processed as unknown as Record<string, unknown>[]}
              sorts={sorts}
              onSort={handleSort}
              onRowClick={(row) =>
                setSelectedFilingId(
                  (row as unknown as Candidate).filing_id
                )
              }
            />
          )}
        </div>
      </div>

      <CandidateDetailPanel
        filingId={selectedFilingId}
        onClose={() => setSelectedFilingId(null)}
      />
    </AppLayout>
  );
}
