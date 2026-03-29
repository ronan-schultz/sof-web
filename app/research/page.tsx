"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/AppLayout";
import { PageHeader, Card, Stat, DataTable } from "@/components/ui";
import { type Column } from "@/components/ui/DataTable";

// ── Types ────────────────────────────────────────────────────────────

interface Metrics {
  id: number;
  run_at: string;
  n_observations: number;
  ff5_alpha: number | null;
  ff5_alpha_tstat: number | null;
  ff5_alpha_pval: number | null;
  ff5mom_alpha: number | null;
  ff5mom_alpha_tstat: number | null;
  ff5mom_alpha_pval: number | null;
  smb_loading: number | null;
  full_sample_median_30d: number | null;
  full_sample_median_90d: number | null;
  full_sample_median_180d: number | null;
  filtered_median_30d: number | null;
  filtered_median_90d: number | null;
  filtered_median_180d: number | null;
  hit_rate: number | null;
  avg_winner: number | null;
  avg_loser: number | null;
  payoff_ratio: number | null;
  jackknife_p05_pct: number | null;
  jackknife_p10_pct: number | null;
  spearman_rho: number | null;
  spearman_pval: number | null;
  permutation_pval: number | null;
  era_pre2013_n: number | null;
  era_pre2013_alpha: number | null;
  era_pre2013_pval: number | null;
  era_2013_2019_n: number | null;
  era_2013_2019_alpha: number | null;
  era_2013_2019_pval: number | null;
  era_post2019_n: number | null;
  era_post2019_alpha: number | null;
  era_post2019_pval: number | null;
}

interface Funnel {
  total_filings: number;
  form_10_12b_count: number;
  scored_count: number;
  usable_returns_count: number;
}

interface Bucket {
  score_range: string;
  n: number;
  median_excess_180d: number | null;
  hit_rate: number | null;
}

interface ResearchData {
  metrics: Metrics | null;
  funnel: Funnel | null;
  buckets: Bucket[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtPct(v: number | null, decimals = 1): string {
  if (v === null) return "\u2014";
  return `${(v * 100).toFixed(decimals)}%`;
}

function fmtPval(v: number | null): string {
  if (v === null) return "\u2014";
  if (v < 0.001) return "<0.001";
  return v.toFixed(3);
}

interface ValidationCard {
  name: string;
  value: string;
  pass: boolean;
  note: string;
}

function buildValidationCards(m: Metrics): ValidationCard[] {
  return [
    {
      name: "FF5 Alpha",
      value: fmtPct(m.ff5_alpha),
      pass: m.ff5_alpha_pval !== null && m.ff5_alpha_pval < 0.15,
      note: `t=${m.ff5_alpha_tstat?.toFixed(2) ?? "\u2014"}, p=${fmtPval(m.ff5_alpha_pval)}`,
    },
    {
      name: "FF3 Alpha",
      value: fmtPct(m.ff5mom_alpha),
      pass: m.ff5mom_alpha_pval !== null && m.ff5mom_alpha_pval < 0.15,
      note: `t=${m.ff5mom_alpha_tstat?.toFixed(2) ?? "\u2014"}, p=${fmtPval(m.ff5mom_alpha_pval)}`,
    },
    {
      name: "SMB Loading",
      value: m.smb_loading?.toFixed(3) ?? "\u2014",
      pass: m.smb_loading !== null && Math.abs(m.smb_loading) < 0.5,
      note: "Small-cap tilt within tolerance",
    },
    {
      name: "Hit Rate (180d)",
      value: fmtPct(m.hit_rate),
      pass: m.hit_rate !== null && m.hit_rate > 0.55,
      note: `W/L: ${fmtPct(m.avg_winner)} / ${fmtPct(m.avg_loser)}`,
    },
    {
      name: "Payoff Ratio",
      value: m.payoff_ratio?.toFixed(2) ?? "\u2014",
      pass: m.payoff_ratio !== null && m.payoff_ratio > 1.0,
      note: "Avg winner / avg loser magnitude",
    },
    {
      name: "Jackknife p<0.05",
      value: fmtPct(m.jackknife_p05_pct, 0),
      pass: m.jackknife_p05_pct !== null && m.jackknife_p05_pct > 0.5,
      note: `p<0.10: ${fmtPct(m.jackknife_p10_pct, 0)}`,
    },
    {
      name: "Spearman Rank",
      value: m.spearman_rho?.toFixed(3) ?? "\u2014",
      pass: m.spearman_pval !== null && m.spearman_pval < 0.10,
      note: `p=${fmtPval(m.spearman_pval)}`,
    },
    {
      name: "Permutation Test",
      value: `p=${fmtPval(m.permutation_pval)}`,
      pass: m.permutation_pval !== null && m.permutation_pval < 0.05,
      note: "Top-quintile excess vs shuffled",
    },
  ];
}

// ── Era table ────────────────────────────────────────────────────────

interface EraRow {
  period: string;
  n: number | null;
  alpha: number | null;
  pval: number | null;
}

function buildEraRows(m: Metrics): EraRow[] {
  return [
    { period: "Pre-2013", n: m.era_pre2013_n, alpha: m.era_pre2013_alpha, pval: m.era_pre2013_pval },
    { period: "2013\u20132019", n: m.era_2013_2019_n, alpha: m.era_2013_2019_alpha, pval: m.era_2013_2019_pval },
    { period: "Post-2019", n: m.era_post2019_n, alpha: m.era_post2019_alpha, pval: m.era_post2019_pval },
  ];
}

// ── Component ────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then((d: ResearchData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const m = data?.metrics;

  const eraColumns = [
    { key: "period", label: "Period", render: (r: EraRow) => <span className="text-sm font-medium text-ink-primary">{r.period}</span> },
    { key: "n", label: "N", render: (r: EraRow) => <span className="text-sm font-mono tabular-nums text-ink-primary">{r.n ?? "\u2014"}</span> },
    { key: "alpha", label: "Alpha (ann.)", render: (r: EraRow) => <span className={`text-sm font-mono tabular-nums ${r.alpha && r.alpha > 0 ? "text-signal-high" : "text-signal-low"}`}>{fmtPct(r.alpha)}</span> },
    { key: "pval", label: "p-value", render: (r: EraRow) => <span className="text-sm font-mono tabular-nums text-ink-secondary">{fmtPval(r.pval)}</span> },
  ] as unknown as Column<Record<string, unknown>>[];

  const bucketColumns = [
    { key: "score_range", label: "Score Range", render: (r: Bucket) => <span className="text-sm font-medium text-ink-primary">{r.score_range}</span> },
    { key: "n", label: "N", render: (r: Bucket) => <span className="text-sm font-mono tabular-nums text-ink-primary">{r.n}</span> },
    { key: "median_excess_180d", label: "Median 180d Excess", render: (r: Bucket) => <span className={`text-sm font-mono tabular-nums ${r.median_excess_180d && r.median_excess_180d > 0 ? "text-signal-high" : "text-signal-low"}`}>{fmtPct(r.median_excess_180d)}</span> },
    { key: "hit_rate", label: "Hit Rate", render: (r: Bucket) => <span className="text-sm font-mono tabular-nums text-ink-primary">{fmtPct(r.hit_rate)}</span> },
  ] as unknown as Column<Record<string, unknown>>[];

  return (
    <AppLayout>
      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />
        )}

        <div className="p-6 max-w-5xl">
          <PageHeader
            title="Research"
            subtitle="Backtest results and factor regression diagnostics"
          />

          {m && (
            <>
              {/* Section 1: Stats row */}
              <div className="grid grid-cols-4 gap-8 mb-6">
                <Stat
                  label="N Observations"
                  value={String(m.n_observations)}
                />
                <div>
                  <p className="text-xs text-ink-tertiary font-medium uppercase tracking-wider">FF5+MOM Alpha</p>
                  <p className="mt-1 text-xl font-semibold text-ink-primary font-mono tabular-nums">{fmtPct(m.ff5mom_alpha)}</p>
                  <p className="mt-1 text-xs text-ink-tertiary font-mono tabular-nums">p={fmtPval(m.ff5mom_alpha_pval)}</p>
                </div>
                <Stat
                  label="Median 180d Excess"
                  value={fmtPct(m.filtered_median_180d)}
                />
                <Stat
                  label="Hit Rate"
                  value={fmtPct(m.hit_rate)}
                />
              </div>

              {/* Section 2: Two-column layout */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Left: Era Breakdown */}
                <Card title="Era Breakdown">
                  <DataTable
                    columns={eraColumns}
                    data={buildEraRows(m) as unknown as Record<string, unknown>[]}
                  />
                </Card>

                {/* Right: Horizon Returns */}
                <Card title="Horizon Returns">
                  <p className="text-xs text-ink-tertiary font-medium uppercase tracking-wider mb-3">Full Sample</p>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Stat label="30d" value={fmtPct(m.full_sample_median_30d)} />
                    <Stat label="90d" value={fmtPct(m.full_sample_median_90d)} />
                    <Stat label="180d" value={fmtPct(m.full_sample_median_180d)} />
                  </div>
                  <p className="text-xs text-ink-tertiary font-medium uppercase tracking-wider mb-3">Score &ge; 0.65</p>
                  <div className="grid grid-cols-3 gap-4">
                    <Stat label="30d" value={fmtPct(m.filtered_median_30d)} />
                    <Stat label="90d" value={fmtPct(m.filtered_median_90d)} />
                    <Stat label="180d" value={fmtPct(m.filtered_median_180d)} />
                  </div>
                </Card>
              </div>

              {/* Section 3: Validation grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {buildValidationCards(m).map((card) => (
                  <Card key={card.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ink-tertiary font-medium uppercase tracking-wider">
                        {card.name}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          card.pass
                            ? "bg-signal-high/10 text-signal-high"
                            : "bg-signal-mid/10 text-signal-mid"
                        }`}
                      >
                        {card.pass ? "PASS" : "WARN"}
                      </span>
                    </div>
                    <p className="text-xl font-semibold font-mono tabular-nums text-ink-primary">
                      {card.value}
                    </p>
                    <p className="text-xs text-ink-tertiary mt-1">{card.note}</p>
                  </Card>
                ))}
              </div>

              {/* Section 4: Score bucket breakdown */}
              {data?.buckets && data.buckets.length > 0 && (
                <Card title="Score Bucket Breakdown" className="mb-6">
                  <DataTable
                    columns={bucketColumns}
                    data={data.buckets as unknown as Record<string, unknown>[]}
                  />
                </Card>
              )}

              {/* Section 5: Footer */}
              <p className="text-xs text-ink-tertiary">
                Last regression run: {m.run_at}
              </p>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
