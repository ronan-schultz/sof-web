"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Card,
  Button,
  Stat,
  AlertBanner,
  Divider,
  EmptyState,
} from "@/components/ui";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// ── Types ────────────────────────────────────────────────────────────────

interface Experiment {
  id: number;
  name: string;
  description: string | null;
  strategy: string;
  created_by: string;
  status: string;
}

interface ConfigItem {
  id: number;
  experiment_id: number;
  strategy: string;
  category: string;
  key: string;
  value: unknown;
  label: string | null;
}

interface SplitMetrics {
  n_total: number;
  n_qualified: number;
  qualification_rate: number;
  [key: string]: number | null;
}

interface ResultMetrics {
  n_total: number;
  n_train: number;
  n_test: number;
  cutoff_year: number;
  train: SplitMetrics;
  test: SplitMetrics;
}

interface ResultRow {
  id: number;
  job_id: number;
  metrics: ResultMetrics;
  distributions: {
    score_histogram?: Array<{ bin_start: number; bin_end: number; count: number }>;
    threshold_sensitivity?: Array<{
      threshold: number;
      n_qualified: number;
      mean_excess_90d: number | null;
    }>;
    intent_breakdown?: Record<string, { n: number; mean_excess_90d: number | null }>;
    ic_90d?: { ic: number; pval: number; n: number } | null;
    ic_270d?: { ic: number; pval: number; n: number } | null;
    quintiles_90d?: Array<{ quintile: number; score_lo: number; score_hi: number; n: number; mean_excess_return: number | null }>;
    quintiles_270d?: Array<{ quintile: number; score_lo: number; score_hi: number; n: number; mean_excess_return: number | null }>;
    factor_correlations?: Record<string, number>;
  };
  created_at: string;
  config_snapshot: Record<string, unknown>;
}

interface LiveConfig {
  strategy: string;
  config: Array<{ key: string; value: unknown; category: string }>;
}

interface Baseline {
  metrics: {
    n_total: number;
    n_train: number;
    n_test: number;
    cutoff_year: number;
    train: Record<string, number | null>;
    test: Record<string, number | null>;
  };
}

// ── Metric display ──────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  n_qualified: "Candidates qualified",
  qualification_rate: "Qualification rate",
  mean_excess_90d: "Mean excess return (90d)",
  mean_excess_270d: "Mean excess return (270d)",
  sharpe_90d: "Sharpe ratio (90d)",
  sharpe_270d: "Sharpe ratio (270d)",
  win_rate_90d: "Win rate (90d)",
  win_rate_270d: "Win rate (270d)",
  max_drawdown_270d: "Max drawdown (270d)",
};

const PCT_METRICS = new Set([
  "qualification_rate",
  "mean_excess_90d",
  "mean_excess_270d",
  "win_rate_90d",
  "win_rate_270d",
  "max_drawdown_270d",
]);

const POSITIVE_IS_GOOD = new Set([
  "mean_excess_90d",
  "mean_excess_270d",
  "sharpe_90d",
  "sharpe_270d",
  "win_rate_90d",
  "win_rate_270d",
]);

const WEIGHT_KEYS = ["intent_weight", "ownership_weight", "quality_weight"];

const THRESHOLD_BOUNDS: Record<string, { min: number; max: number; step: number }> = {
  score_threshold: { min: 0, max: 1, step: 0.01 },
  ownership_minimum: { min: 0, max: 100, step: 1 },
};

function fmtMetric(key: string, val: number | null | undefined): string {
  if (val === null || val === undefined) return "\u2014";
  if (key === "n_qualified") return val.toString();
  if (PCT_METRICS.has(key)) return `${(val * 100).toFixed(1)}%`;
  return val.toFixed(3);
}

function deltaColor(key: string, delta: number): string {
  if (Math.abs(delta) < 0.0001) return "text-ink-tertiary";
  const good = POSITIVE_IS_GOOD.has(key) ? delta > 0 : delta < 0;
  return good ? "text-signal-high" : "text-signal-low";
}

// ── Component ────────────────────────────────────────────────────────────

export default function ExperimentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [liveConfig, setLiveConfig] = useState<Record<string, unknown>>({});
  const [showLiveCompare, setShowLiveCompare] = useState(false);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchExperiment = useCallback(async () => {
    const res = await fetch(`/api/sandbox/experiments/${id}`);
    if (res.ok) setExperiment(await res.json());
  }, [id]);

  const fetchConfig = useCallback(async () => {
    const res = await fetch(`/api/sandbox/experiments/${id}/config`);
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.config);
      const vals: Record<string, unknown> = {};
      for (const c of data.config) vals[c.key] = c.value;
      setLocalValues(vals);
    }
  }, [id]);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/sandbox/experiments/${id}/results`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
    }
  }, [id]);

  const fetchBaseline = useCallback(async () => {
    const res = await fetch("/api/sandbox/baseline");
    if (res.ok) setBaseline(await res.json());
  }, []);

  const fetchLiveConfig = useCallback(async () => {
    const res = await fetch("/api/config?strategy=activism");
    if (res.ok) {
      const data: LiveConfig = await res.json();
      const map: Record<string, unknown> = {};
      for (const c of data.config) map[c.key] = c.value;
      setLiveConfig(map);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchExperiment(),
      fetchConfig(),
      fetchResults(),
      fetchBaseline(),
      fetchLiveConfig(),
    ]).finally(() => setLoading(false));
  }, [fetchExperiment, fetchConfig, fetchResults, fetchBaseline, fetchLiveConfig]);

  // ── Weight sum validation ─────────────────────────────────────────────

  const weightSum = useMemo(() => {
    let sum = 0;
    for (const k of WEIGHT_KEYS) {
      const v = localValues[k];
      sum += typeof v === "number" ? v : parseFloat(String(v ?? 0));
    }
    return sum;
  }, [localValues]);

  const weightsValid = Math.abs(weightSum - 1.0) <= 0.001;

  // ── Config persistence (debounced) ────────────────────────────────────

  const persistConfigs = useCallback(
    (vals: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const items = configs.map((c) => ({
          strategy: c.strategy,
          category: c.category,
          key: c.key,
          value: vals[c.key] ?? c.value,
          label: c.label,
        }));
        await fetch(`/api/sandbox/experiments/${id}/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        });
      }, 800);
    },
    [configs, id]
  );

  const updateValue = (key: string, value: unknown) => {
    const next = { ...localValues, [key]: value };
    setLocalValues(next);
    persistConfigs(next);
  };

  // ── Run backtest ──────────────────────────────────────────────────────

  const runBacktest = async () => {
    setJobError(null);
    const res = await fetch(`/api/sandbox/experiments/${id}/run`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setJobError(data.error || "Failed to start run");
      return;
    }
    const data = await res.json();
    setRunningJobId(data.job_id);
    setElapsed(0);
    setExperiment((prev) => (prev ? { ...prev, status: "running" } : prev));
  };

  useEffect(() => {
    if (!runningJobId) return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    const poll = setInterval(async () => {
      const res = await fetch(`/api/sandbox/jobs/${runningJobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "complete") {
        setRunningJobId(null);
        fetchResults();
        fetchExperiment();
      } else if (data.status === "error") {
        setRunningJobId(null);
        setJobError(data.error_message || "Job failed");
        fetchExperiment();
      }
    }, 3000);
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [runningJobId, fetchResults, fetchExperiment]);

  // ── Grouped configs ───────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map: Record<string, ConfigItem[]> = {};
    for (const c of configs) {
      (map[c.category] ??= []).push(c);
    }
    return map;
  }, [configs]);

  // ── Selected result ───────────────────────────────────────────────────

  const result = results[selectedResultIdx] ?? null;
  const metrics = result?.metrics;
  const trainMetrics = metrics?.train;
  const testMetrics = metrics?.test;
  const dist = result?.distributions;
  const bm = baseline?.metrics;
  const bmTest = bm?.test;

  // ── Chart data ────────────────────────────────────────────────────────

  const currentThreshold =
    typeof localValues.score_threshold === "number"
      ? localValues.score_threshold
      : parseFloat(String(localValues.score_threshold ?? 0.5));

  const histogramData = useMemo(() => {
    if (!dist?.score_histogram) return null;
    return {
      labels: dist.score_histogram.map((b) => `${b.bin_start.toFixed(2)}`),
      datasets: [
        {
          label: "Candidates",
          data: dist.score_histogram.map((b) => b.count),
          backgroundColor: dist.score_histogram.map((b) =>
            b.bin_start >= currentThreshold
              ? "rgba(34,197,94,0.6)"
              : "rgba(156,163,175,0.4)"
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [dist?.score_histogram, currentThreshold]);

  const sensitivityData = useMemo(() => {
    if (!dist?.threshold_sensitivity) return null;
    return {
      labels: dist.threshold_sensitivity.map((s) => s.threshold.toFixed(2)),
      datasets: [
        {
          label: "Mean excess return (90d)",
          data: dist.threshold_sensitivity.map((s) =>
            s.mean_excess_90d !== null ? s.mean_excess_90d * 100 : null
          ),
          borderColor: "rgb(59,130,246)",
          backgroundColor: "rgba(59,130,246,0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [dist?.threshold_sensitivity]);

  const quintileData = useMemo(() => {
    if (!dist?.quintiles_90d) return null;
    return {
      labels: dist.quintiles_90d.map((q) => `Q${q.quintile}`),
      datasets: [
        {
          label: "Mean excess return (90d)",
          data: dist.quintiles_90d.map((q) =>
            q.mean_excess_return !== null ? q.mean_excess_return * 100 : 0
          ),
          backgroundColor: dist.quintiles_90d.map((q) =>
            q.mean_excess_return !== null && q.mean_excess_return > 0
              ? "rgba(34,197,94,0.6)"
              : "rgba(239,68,68,0.5)"
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [dist?.quintiles_90d]);

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <span className="text-sm text-ink-tertiary">Loading workspace...</span>
        </div>
      </AppLayout>
    );
  }

  if (!experiment) {
    return (
      <AppLayout>
        <div className="p-6">
          <AlertBanner variant="critical" message="Experiment not found" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative">
        {runningJobId && (
          <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />
        )}

        <div className="p-6">
          <PageHeader
            title={experiment.name}
            subtitle="vs baseline"
            actions={
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push("/sandbox")}>
                  \u2190 Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={runBacktest}
                  disabled={!weightsValid || !!runningJobId}
                >
                  {runningJobId ? `Running... ${elapsed}s` : "Run Backtest"}
                </Button>
              </div>
            }
          />

          {jobError && (
            <div className="mb-4">
              <AlertBanner variant="warning" message={`Backtest failed \u2014 ${jobError}`} />
            </div>
          )}

          {!weightsValid && !runningJobId && (
            <div className="mb-4">
              <AlertBanner
                variant="critical"
                message={`Weights must sum to 1.0 (currently ${weightSum.toFixed(3)})`}
              />
            </div>
          )}

          <div className="grid gap-6" style={{ gridTemplateColumns: "340px 1fr" }}>
            {/* Left panel — Parameter editor */}
            <Card title="Parameters">
              <div className="space-y-6">
                {/* Compare toggle */}
                <label className="flex items-center gap-2 text-xs text-ink-tertiary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLiveCompare}
                    onChange={(e) => setShowLiveCompare(e.target.checked)}
                    className="rounded"
                  />
                  Compare to live model
                </label>

                {/* Weights */}
                {grouped.weight && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                      Weights
                    </p>
                    {grouped.weight.map((c) => {
                      const val =
                        typeof localValues[c.key] === "number"
                          ? (localValues[c.key] as number)
                          : parseFloat(String(localValues[c.key] ?? 0));
                      const liveVal =
                        showLiveCompare && liveConfig.weights
                          ? (liveConfig.weights as Record<string, number>)[
                              c.key
                                .replace("_weight", "")
                                .replace("quality", "activist_quality")
                            ]
                          : undefined;

                      return (
                        <div key={c.key} className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-ink-secondary">
                              {c.label || c.key}
                            </span>
                            <span className="font-mono text-ink-primary">
                              {val.toFixed(2)}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={val}
                              onChange={(e) =>
                                updateValue(c.key, parseFloat(e.target.value))
                              }
                              className="w-full"
                            />
                            {liveVal !== undefined && (
                              <div
                                className="absolute top-0 h-5 w-0.5 bg-accent-default pointer-events-none"
                                style={{ left: `${liveVal * 100}%` }}
                                title={`Live: ${liveVal.toFixed(2)}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className={`text-xs font-mono px-2 py-1 rounded-md ${
                        weightsValid
                          ? "bg-signal-high/10 text-signal-high"
                          : "bg-signal-low/10 text-signal-low"
                      }`}
                    >
                      Sum: {weightSum.toFixed(3)}{" "}
                      {weightsValid ? "" : "(must be 1.0)"}
                    </div>
                  </div>
                )}

                {/* Thresholds */}
                {grouped.threshold && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                      Thresholds
                    </p>
                    {grouped.threshold.map((c) => {
                      const val =
                        typeof localValues[c.key] === "number"
                          ? (localValues[c.key] as number)
                          : parseFloat(String(localValues[c.key] ?? 0));
                      const bounds = THRESHOLD_BOUNDS[c.key] || {
                        min: 0,
                        max: 1,
                        step: 0.01,
                      };

                      return (
                        <div key={c.key} className="mb-3">
                          <label className="block text-xs text-ink-secondary mb-1">
                            {c.label || c.key}
                          </label>
                          <input
                            type="number"
                            min={bounds.min}
                            max={bounds.max}
                            step={bounds.step}
                            value={val}
                            onChange={(e) =>
                              updateValue(c.key, parseFloat(e.target.value))
                            }
                            className="w-full px-2 py-1 rounded-md text-sm font-mono bg-surface-sunken text-ink-primary"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Keywords */}
                {grouped.keyword && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                      Keywords
                    </p>
                    {grouped.keyword.map((c) => {
                      const tags: Array<Record<string, string>> = Array.isArray(
                        localValues[c.key]
                      )
                        ? (localValues[c.key] as Array<Record<string, string>>)
                        : [];

                      return (
                        <div key={c.key} className="mb-3">
                          <p className="text-xs text-ink-secondary mb-1">
                            {c.label || c.key}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 bg-surface-sunken text-xs px-2 py-0.5 rounded-md text-ink-secondary"
                              >
                                {tag.phrase || JSON.stringify(tag)}
                                <button
                                  onClick={() => {
                                    const next = tags.filter(
                                      (_, j) => j !== i
                                    );
                                    updateValue(c.key, next);
                                  }}
                                  className="text-ink-tertiary hover:text-ink-primary"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Other categories */}
                {Object.entries(grouped)
                  .filter(
                    ([cat]) => !["weight", "threshold", "keyword"].includes(cat)
                  )
                  .map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        {cat}
                      </p>
                      {items.map((c) => (
                        <div key={c.key} className="mb-2 text-xs">
                          <span className="text-ink-tertiary">
                            {c.label || c.key}:
                          </span>{" "}
                          <span className="font-mono text-ink-secondary">
                            {typeof localValues[c.key] === "object"
                              ? JSON.stringify(localValues[c.key])
                              : String(localValues[c.key] ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </Card>

            {/* Right panel — Results */}
            <Card title="Results">
              {runningJobId && (
                <p className="text-sm text-ink-tertiary mb-4">
                  Running backtest...
                </p>
              )}

              {!result ? (
                <EmptyState
                  title="No runs yet"
                  subtitle="Configure parameters and click Run Backtest."
                />
              ) : (
                <div className="space-y-6">
                  {/* Run selector */}
                  {results.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-ink-tertiary">Run:</span>
                      <select
                        value={selectedResultIdx}
                        onChange={(e) =>
                          setSelectedResultIdx(parseInt(e.target.value, 10))
                        }
                        className="px-2 py-1 rounded-md text-xs bg-surface-sunken text-ink-primary"
                      >
                        {results.map((r, i) => (
                          <option key={r.id} value={i}>
                            {new Date(r.created_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Summary stats */}
                  {testMetrics && (
                    <div className="flex gap-6">
                      <Stat
                        label="Sharpe (270d)"
                        value={fmtMetric(
                          "sharpe_270d",
                          testMetrics.sharpe_270d as number | null
                        )}
                      />
                      <Stat
                        label="Win Rate (270d)"
                        value={fmtMetric(
                          "win_rate_270d",
                          testMetrics.win_rate_270d as number | null
                        )}
                      />
                      <Stat
                        label="Mean Excess (270d)"
                        value={fmtMetric(
                          "mean_excess_270d",
                          testMetrics.mean_excess_270d as number | null
                        )}
                      />
                      {bmTest?.sharpe_270d != null &&
                        testMetrics.sharpe_270d != null && (
                          <Stat
                            label="vs Baseline"
                            value={`${((testMetrics.sharpe_270d as number) - (bmTest.sharpe_270d as number)) > 0 ? "+" : ""}${((testMetrics.sharpe_270d as number) - (bmTest.sharpe_270d as number)).toFixed(3)}`}
                            delta={(testMetrics.sharpe_270d as number) - (bmTest.sharpe_270d as number)}
                            deltaFormat="decimal"
                          />
                        )}
                    </div>
                  )}

                  <Divider />

                  {/* Full metrics table */}
                  {metrics && (
                    <div>
                      <p className="text-xs text-ink-tertiary mb-2">
                        Train: &lt;{metrics.cutoff_year} (N={metrics.n_train}){" "}
                        &middot; Test: &ge;{metrics.cutoff_year} (N=
                        {metrics.n_test})
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-ink-tertiary">
                            <th className="py-1">Metric</th>
                            <th className="py-1">Train</th>
                            <th className="py-1">Test</th>
                            <th className="py-1">Baseline</th>
                            <th className="py-1">Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(METRIC_LABELS).map(([key, label]) => {
                            const trainVal = trainMetrics?.[key];
                            const testVal = testMetrics?.[key];
                            const baseVal = bmTest?.[key];
                            const delta =
                              testVal != null && baseVal != null
                                ? (testVal as number) - (baseVal as number)
                                : null;

                            return (
                              <tr
                                key={key}
                                className="border-b border-surface-sunken"
                              >
                                <td className="py-1.5 text-xs text-ink-secondary">
                                  {label}
                                </td>
                                <td className="py-1.5 font-mono text-xs text-ink-tertiary">
                                  {fmtMetric(key, trainVal as number | null)}
                                </td>
                                <td className="py-1.5 font-mono text-xs text-ink-primary">
                                  {fmtMetric(key, testVal as number | null)}
                                </td>
                                <td className="py-1.5 font-mono text-xs text-ink-tertiary">
                                  {fmtMetric(key, baseVal as number | null)}
                                </td>
                                <td
                                  className={`py-1.5 font-mono text-xs ${
                                    delta !== null ? deltaColor(key, delta) : ""
                                  }`}
                                >
                                  {delta !== null
                                    ? `${delta > 0 ? "+" : ""}${fmtMetric(key, delta)}`
                                    : "\u2014"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Score distribution chart */}
                  {histogramData && (
                    <div>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        Score Distribution
                      </p>
                      <div className="h-48">
                        <Bar
                          data={histogramData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { title: { display: true, text: "Score" } },
                              y: { title: { display: true, text: "Count" } },
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Threshold sensitivity chart */}
                  {sensitivityData && (
                    <div>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        Threshold Sensitivity
                      </p>
                      <div className="h-48">
                        <Line
                          data={sensitivityData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: {
                                title: { display: true, text: "Threshold" },
                              },
                              y: {
                                title: {
                                  display: true,
                                  text: "Mean excess return (90d) %",
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Intent breakdown */}
                  {dist?.intent_breakdown && (
                    <div>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        Intent Breakdown
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-ink-tertiary">
                            <th className="py-1">Tier</th>
                            <th className="py-1">N candidates</th>
                            <th className="py-1">Mean excess (90d)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {["passive", "active", "control"].map((tier) => {
                            const d = dist.intent_breakdown?.[tier];
                            return (
                              <tr
                                key={tier}
                                className="border-b border-surface-sunken"
                              >
                                <td className="py-1.5 text-xs capitalize text-ink-primary">
                                  {tier}
                                </td>
                                <td className="py-1.5 font-mono text-xs text-ink-primary">
                                  {d?.n ?? 0}
                                </td>
                                <td className="py-1.5 font-mono text-xs">
                                  {d?.mean_excess_90d != null
                                    ? `${(d.mean_excess_90d * 100).toFixed(1)}%`
                                    : "\u2014"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Information Coefficient */}
                  {(dist?.ic_90d || dist?.ic_270d) && (
                    <div>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        Information Coefficient
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "IC (90d)", data: dist.ic_90d },
                          { label: "IC (270d)", data: dist.ic_270d },
                        ].map(({ label, data }) => {
                          if (!data) return null;
                          const sig = data.pval < 0.05;
                          const color = sig
                            ? data.ic > 0
                              ? "text-signal-high"
                              : "text-signal-low"
                            : "text-ink-tertiary";
                          return (
                            <Card key={label}>
                              <p className="text-xs text-ink-tertiary mb-1">
                                {label}
                              </p>
                              <p
                                className={`text-lg font-mono font-semibold ${color}`}
                              >
                                {data.ic.toFixed(4)}
                              </p>
                              <p className="text-xs text-ink-tertiary">
                                p={data.pval.toFixed(4)} &middot; n={data.n}
                                {sig && (
                                  <span className="ml-1 text-signal-high">
                                    *
                                  </span>
                                )}
                              </p>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quintile returns chart */}
                  {quintileData && (
                    <div>
                      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                        Quintile Returns (90d)
                      </p>
                      <div className="h-48">
                        <Bar
                          data={quintileData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: {
                                title: {
                                  display: true,
                                  text: "Score Quintile",
                                },
                              },
                              y: {
                                title: {
                                  display: true,
                                  text: "Mean excess return %",
                                },
                              },
                            },
                          }}
                        />
                      </div>
                      {dist?.quintiles_90d && (
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-left text-ink-tertiary">
                              <th className="py-1">Quintile</th>
                              <th className="py-1">Score range</th>
                              <th className="py-1">N</th>
                              <th className="py-1">Mean excess (90d)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dist.quintiles_90d.map((q) => (
                              <tr
                                key={q.quintile}
                                className="border-b border-surface-sunken"
                              >
                                <td className="py-1 text-ink-primary">
                                  Q{q.quintile}
                                </td>
                                <td className="py-1 font-mono text-ink-secondary">
                                  {q.score_lo.toFixed(3)}-
                                  {q.score_hi.toFixed(3)}
                                </td>
                                <td className="py-1 font-mono text-ink-primary">
                                  {q.n}
                                </td>
                                <td
                                  className={`py-1 font-mono ${
                                    q.mean_excess_return !== null &&
                                    q.mean_excess_return > 0
                                      ? "text-signal-high"
                                      : "text-signal-low"
                                  }`}
                                >
                                  {q.mean_excess_return !== null
                                    ? `${(q.mean_excess_return * 100).toFixed(1)}%`
                                    : "\u2014"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Factor correlation matrix */}
                  {dist?.factor_correlations &&
                    Object.keys(dist.factor_correlations).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                          Factor Correlations
                        </p>
                        {(() => {
                          const factors = [
                            "intent_score",
                            "ownership_normalized",
                            "quality_normalized",
                          ];
                          const labels: Record<string, string> = {
                            intent_score: "Intent",
                            ownership_normalized: "Ownership",
                            quality_normalized: "Quality",
                          };
                          const corr = dist.factor_correlations!;
                          return (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-ink-tertiary">
                                  <th className="py-1"></th>
                                  {factors.map((f) => (
                                    <th key={f} className="py-1">
                                      {labels[f]}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {factors.map((f1) => (
                                  <tr
                                    key={f1}
                                    className="border-b border-surface-sunken"
                                  >
                                    <td className="py-1 text-ink-secondary font-medium">
                                      {labels[f1]}
                                    </td>
                                    {factors.map((f2) => {
                                      const val = corr[`${f1}_x_${f2}`];
                                      const abs = Math.abs(val ?? 0);
                                      const bg =
                                        abs > 0.7
                                          ? "bg-accent-default/20"
                                          : abs > 0.4
                                            ? "bg-accent-default/10"
                                            : "";
                                      return (
                                        <td
                                          key={f2}
                                          className={`py-1 font-mono text-center text-ink-primary ${bg}`}
                                        >
                                          {val !== undefined
                                            ? val.toFixed(3)
                                            : "\u2014"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
