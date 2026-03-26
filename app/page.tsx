"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { type Column } from "@/components/ui/DataTable";
import { RefreshCw } from "lucide-react";

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

// ── Helpers ──────────────────────────────────────────────────────────

const ACTIVISM_FORMS = ["SC 13D", "SC 13G", "DFAN14A", "DEFA14A", "DEFC14A"];

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

// ── Page ─────────────────────────────────────────────────────────────

export default function CandidatesDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("composite_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [alertDismissed, setAlertDismissed] = useState(false);

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

  const sorted = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const aVal = a[sortKey as keyof Candidate];
      const bVal = b[sortKey as keyof Candidate];
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [candidates, sortKey, sortDir]);

  const highConviction = candidates.filter(
    (c) => c.composite_score >= 0.75
  ).length;

  const avgScore = candidates.length
    ? (
        candidates.reduce((s, c) => s + c.composite_score, 0) /
        candidates.length
      ).toFixed(2)
    : "\u2014";

  const pendingCount = candidates.filter((c) => {
    const elapsed = Date.now() - new Date(c.scored_at).getTime();
    return elapsed > 24 * 60 * 60 * 1000;
  }).length;

  // ── Sort handler ─────────────────────────────────────────────────

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "composite_score" ? "desc" : "asc");
    }
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
            onClick={() =>
              window.open(r.filing_url, "_blank", "noopener,noreferrer")
            }
          >
            View
          </Button>
        ) : null,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────

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
            <Stat label="Total Candidates" value={String(candidates.length)} />
            <Stat label="High Conviction" value={String(highConviction)} />
            <Stat label="Avg Score" value={avgScore} />
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
              data={sorted as unknown as Record<string, unknown>[]}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
