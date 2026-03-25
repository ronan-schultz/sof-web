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

// ── Metric display map ──────────────────────────────────────────────────

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

// ── Weight slider config ────────────────────────────────────────────────

const WEIGHT_KEYS = ["intent_weight", "ownership_weight", "quality_weight"];

const THRESHOLD_BOUNDS: Record<string, { min: number; max: number; step: number }> = {
  score_threshold: { min: 0, max: 1, step: 0.01 },
  ownership_minimum: { min: 0, max: 100, step: 1 },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function fmtMetric(key: string, val: number | null | undefined): string {
  if (val === null || val === undefined) return "--";
  if (key === "n_qualified") return val.toString();
  if (PCT_METRICS.has(key)) return `${(val * 100).toFixed(1)}%`;
  return val.toFixed(3);
}

function deltaColor(key: string, delta: number): string {
  if (Math.abs(delta) < 0.0001) return "text-gray-500";
  const good = POSITIVE_IS_GOOD.has(key) ? delta > 0 : delta < 0;
  return good ? "text-green-600" : "text-red-600";
}

// ── Component ────────────────────────────────────────────────────────────

export default function ExperimentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // State
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

  // Poll running job
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

  const currentThreshold = typeof localValues.score_threshold === "number"
    ? localValues.score_threshold
    : parseFloat(String(localValues.score_threshold ?? 0.5));

  const histogramData = useMemo(() => {
    if (!dist?.score_histogram) return null;
    return {
      labels: dist.score_histogram.map(
        (b) => `${b.bin_start.toFixed(2)}`
      ),
      datasets: [
        {
          label: "Candidates",
          data: dist.score_histogram.map((b) => b.count),
          backgroundColor: dist.score_histogram.map((b) =>
            b.bin_start >= currentThreshold ? "rgba(34,197,94,0.6)" : "rgba(156,163,175,0.4)"
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
    return <div className="text-sm text-gray-500 mt-8">Loading workspace...</div>;
  }

  if (!experiment) {
    return <div className="text-sm text-red-500 mt-8">Experiment not found</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-88px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => router.push("/sandbox")}
            className="text-xs text-gray-400 hover:text-gray-600 mb-1"
          >
            &larr; Back to experiments
          </button>
          <h2 className="text-lg font-semibold">{experiment.name}</h2>
          {experiment.description && (
            <p className="text-sm text-gray-500">{experiment.description}</p>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Left panel — Parameter editor */}
        <div className="overflow-y-auto border border-gray-200 rounded bg-white p-4 space-y-6">
          {/* Compare toggle */}
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
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
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Weights</h3>
              {grouped.weight.map((c) => {
                const val = typeof localValues[c.key] === "number"
                  ? (localValues[c.key] as number)
                  : parseFloat(String(localValues[c.key] ?? 0));
                const liveVal =
                  showLiveCompare && liveConfig.weights
                    ? (liveConfig.weights as Record<string, number>)[
                        c.key.replace("_weight", "").replace("quality", "activist_quality")
                      ]
                    : undefined;

                return (
                  <div key={c.key} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{c.label || c.key}</span>
                      <span className="font-mono">{val.toFixed(2)}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={val}
                        onChange={(e) => updateValue(c.key, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      {liveVal !== undefined && (
                        <div
                          className="absolute top-0 h-5 w-0.5 bg-blue-400 pointer-events-none"
                          style={{ left: `${liveVal * 100}%` }}
                          title={`Live: ${liveVal.toFixed(2)}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              <div
                className={`text-xs font-mono px-2 py-1 rounded ${
                  weightsValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                Sum: {weightSum.toFixed(3)} {weightsValid ? "" : "(must be 1.0)"}
              </div>
            </section>
          )}

          {/* Thresholds */}
          {grouped.threshold && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Thresholds</h3>
              {grouped.threshold.map((c) => {
                const val = typeof localValues[c.key] === "number"
                  ? (localValues[c.key] as number)
                  : parseFloat(String(localValues[c.key] ?? 0));
                const bounds = THRESHOLD_BOUNDS[c.key] || { min: 0, max: 1, step: 0.01 };

                return (
                  <div key={c.key} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{c.label || c.key}</span>
                    </div>
                    <input
                      type="number"
                      min={bounds.min}
                      max={bounds.max}
                      step={bounds.step}
                      value={val}
                      onChange={(e) => updateValue(c.key, parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                    />
                  </div>
                );
              })}
            </section>
          )}

          {/* Keywords */}
          {grouped.keyword && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Keywords</h3>
              {grouped.keyword.map((c) => {
                const tags: Array<Record<string, string>> = Array.isArray(localValues[c.key])
                  ? (localValues[c.key] as Array<Record<string, string>>)
                  : [];

                return (
                  <div key={c.key} className="mb-3">
                    <div className="text-xs mb-1">{c.label || c.key}</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 text-xs px-2 py-0.5 rounded flex items-center gap-1"
                        >
                          {tag.phrase || JSON.stringify(tag)}
                          <button
                            onClick={() => {
                              const next = tags.filter((_, j) => j !== i);
                              updateValue(c.key, next);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Other config categories */}
          {Object.entries(grouped)
            .filter(([cat]) => !["weight", "threshold", "keyword"].includes(cat))
            .map(([cat, items]) => (
              <section key={cat}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{cat}</h3>
                {items.map((c) => (
                  <div key={c.key} className="mb-2 text-xs">
                    <span className="text-gray-500">{c.label || c.key}:</span>{" "}
                    <span className="font-mono">
                      {typeof localValues[c.key] === "object"
                        ? JSON.stringify(localValues[c.key])
                        : String(localValues[c.key] ?? "")}
                    </span>
                  </div>
                ))}
              </section>
            ))}
        </div>

        {/* Right panel — Results */}
        <div className="overflow-y-auto border border-gray-200 rounded bg-white p-4 space-y-6">
          {!result ? (
            <div className="text-sm text-gray-400 mt-8 text-center">
              No runs yet. Configure parameters and click Run backtest.
            </div>
          ) : (
            <>
              {/* Run history selector */}
              {results.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Run:</span>
                  <select
                    value={selectedResultIdx}
                    onChange={(e) => setSelectedResultIdx(parseInt(e.target.value, 10))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    {results.map((r, i) => (
                      <option key={r.id} value={i}>
                        {new Date(r.created_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Results</h3>
                {metrics && (
                  <div className="text-xs text-gray-500 mb-2 flex gap-4">
                    <span>Train: &lt;{metrics.cutoff_year} (N={metrics.n_train})</span>
                    <span>Test: &ge;{metrics.cutoff_year} (N={metrics.n_test})</span>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
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
                        testVal !== null && testVal !== undefined && baseVal !== null && baseVal !== undefined
                          ? (testVal as number) - (baseVal as number)
                          : null;

                      return (
                        <tr key={key} className="border-b border-gray-100">
                          <td className="py-1.5 text-xs text-gray-600">{label}</td>
                          <td className="py-1.5 font-mono text-xs text-gray-400">
                            {fmtMetric(key, trainVal as number | null)}
                          </td>
                          <td className="py-1.5 font-mono text-xs">
                            {fmtMetric(key, testVal as number | null)}
                          </td>
                          <td className="py-1.5 font-mono text-xs text-gray-400">
                            {fmtMetric(key, baseVal as number | null)}
                          </td>
                          <td className={`py-1.5 font-mono text-xs ${delta !== null ? deltaColor(key, delta) : ""}`}>
                            {delta !== null
                              ? `${delta > 0 ? "+" : ""}${fmtMetric(key, delta)}`
                              : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Score distribution chart */}
              {histogramData && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Score Distribution
                  </h3>
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
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Threshold Sensitivity
                  </h3>
                  <div className="h-48">
                    <Line
                      data={sensitivityData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { title: { display: true, text: "Threshold" } },
                          y: { title: { display: true, text: "Mean excess return (90d) %" } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Intent breakdown */}
              {dist?.intent_breakdown && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Intent Breakdown
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500">
                        <th className="py-1">Tier</th>
                        <th className="py-1">N candidates</th>
                        <th className="py-1">Mean excess (90d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["passive", "active", "control"].map((tier) => {
                        const d = dist.intent_breakdown?.[tier];
                        return (
                          <tr key={tier} className="border-b border-gray-100">
                            <td className="py-1.5 text-xs capitalize">{tier}</td>
                            <td className="py-1.5 font-mono text-xs">{d?.n ?? 0}</td>
                            <td className="py-1.5 font-mono text-xs">
                              {d?.mean_excess_90d !== null && d?.mean_excess_90d !== undefined
                                ? `${(d.mean_excess_90d * 100).toFixed(1)}%`
                                : "--"}
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
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Information Coefficient
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "IC (90d)", data: dist.ic_90d },
                      { label: "IC (270d)", data: dist.ic_270d },
                    ].map(({ label, data }) => {
                      if (!data) return null;
                      const sig = data.pval < 0.05;
                      const color = sig
                        ? data.ic > 0
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-gray-500";
                      return (
                        <div key={label} className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className={`text-lg font-mono font-semibold ${color}`}>
                            {data.ic.toFixed(4)}
                          </div>
                          <div className="text-xs text-gray-400">
                            p={data.pval.toFixed(4)} &middot; n={data.n}
                            {sig && <span className="ml-1 text-green-600">*</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quintile returns chart */}
              {quintileData && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Quintile Returns (90d)
                  </h3>
                  <div className="h-48">
                    <Bar
                      data={quintileData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { title: { display: true, text: "Score Quintile" } },
                          y: { title: { display: true, text: "Mean excess return %" } },
                        },
                      }}
                    />
                  </div>
                  {dist?.quintiles_90d && (
                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="py-1">Quintile</th>
                          <th className="py-1">Score range</th>
                          <th className="py-1">N</th>
                          <th className="py-1">Mean excess (90d)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dist.quintiles_90d.map((q) => (
                          <tr key={q.quintile} className="border-b border-gray-100">
                            <td className="py-1">Q{q.quintile}</td>
                            <td className="py-1 font-mono">{q.score_lo.toFixed(3)}-{q.score_hi.toFixed(3)}</td>
                            <td className="py-1 font-mono">{q.n}</td>
                            <td className={`py-1 font-mono ${q.mean_excess_return !== null && q.mean_excess_return > 0 ? "text-green-600" : "text-red-600"}`}>
                              {q.mean_excess_return !== null ? `${(q.mean_excess_return * 100).toFixed(1)}%` : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Factor correlation matrix */}
              {dist?.factor_correlations && Object.keys(dist.factor_correlations).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Factor Correlations
                  </h3>
                  {(() => {
                    const factors = ["intent_score", "ownership_normalized", "quality_normalized"];
                    const labels: Record<string, string> = {
                      intent_score: "Intent",
                      ownership_normalized: "Ownership",
                      quality_normalized: "Quality",
                    };
                    const corr = dist.factor_correlations!;
                    return (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-1"></th>
                            {factors.map((f) => (
                              <th key={f} className="py-1">{labels[f]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {factors.map((f1) => (
                            <tr key={f1} className="border-b border-gray-100">
                              <td className="py-1 text-gray-600 font-medium">{labels[f1]}</td>
                              {factors.map((f2) => {
                                const val = corr[`${f1}_x_${f2}`];
                                const abs = Math.abs(val ?? 0);
                                const bg =
                                  abs > 0.7
                                    ? "bg-blue-100"
                                    : abs > 0.4
                                      ? "bg-blue-50"
                                      : "";
                                return (
                                  <td key={f2} className={`py-1 font-mono text-center ${bg}`}>
                                    {val !== undefined ? val.toFixed(3) : "--"}
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
            </>
          )}
        </div>
      </div>

      {/* Bottom bar — Run controls */}
      <div className="mt-4 border border-gray-200 rounded bg-white px-4 py-3 flex items-center gap-4">
        <button
          onClick={runBacktest}
          disabled={!weightsValid || !!runningJobId}
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          {runningJobId ? "Running..." : "Run backtest"}
        </button>

        {runningJobId && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="font-mono">{elapsed}s</span>
          </div>
        )}

        {jobError && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">{jobError}</div>
        )}

        {!weightsValid && !runningJobId && (
          <span className="text-xs text-red-500">
            Weights must sum to 1.0 (currently {weightSum.toFixed(3)})
          </span>
        )}
      </div>
    </div>
  );
}
