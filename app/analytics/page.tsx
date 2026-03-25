"use client";

import { useState, useMemo, FormEvent } from "react";
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

interface AnalyticsResult {
  sql: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
}

export default function AnalyticsPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data: AnalyticsResult = await res.json();
      setResult(data);
    } catch {
      setResult({ sql: "", error: "Failed to reach the server." });
    } finally {
      setLoading(false);
    }
  }

  const isSingleValue =
    result?.rows?.length === 1 && result.columns?.length === 1;

  const chartInfo = useMemo(() => {
    const rows = result?.rows;
    if (!rows || rows.length < 2 || rows.length > 50) return null;
    const keys = Object.keys(rows[0]);
    if (keys.length !== 2) return null;
    const [labelKey, valueKey] = keys;
    const values = rows.map((r) => Number(r[valueKey]));
    if (!values.every((v) => isFinite(v))) return null;
    const labels = rows.map((r) => String(r[labelKey]));
    const isYearLike = labels.every((l) => {
      const n = Number(l);
      return Number.isInteger(n) && n >= 1990 && n <= 2040;
    });
    return { labelKey, valueKey, labels, values, isYearLike };
  }, [result?.rows]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-1">Analytics</h2>
      <p className="text-sm text-gray-500 mb-6">
        Ask a question about the database in plain English.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "What is the average days from filing to first trade?"'
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Running..." : "Ask"}
        </button>
      </form>

      {loading && (
        <div className="text-sm text-gray-500 animate-pulse">
          Generating and executing query...
        </div>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-4">
          {/* Single value result */}
          {isSingleValue && result.rows && result.columns && (
            <div className="bg-white border border-gray-200 rounded-lg px-6 py-5">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                {result.columns[0]}
              </div>
              <div className="text-3xl font-semibold">
                {formatCell(result.rows[0][result.columns[0]])}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartInfo && !isSingleValue && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Chart</div>
              <div className="h-64">
                {chartInfo.isYearLike ? (
                  <Line
                    data={{
                      labels: chartInfo.labels,
                      datasets: [
                        {
                          data: chartInfo.values,
                          borderColor: "rgb(59, 130, 246)",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          tension: 0.3,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { title: { display: true, text: chartInfo.labelKey } },
                        y: { title: { display: true, text: chartInfo.valueKey } },
                      },
                    }}
                  />
                ) : (
                  <Bar
                    data={{
                      labels: chartInfo.labels,
                      datasets: [
                        {
                          data: chartInfo.values,
                          backgroundColor: "rgba(59, 130, 246, 0.7)",
                          borderColor: "rgb(59, 130, 246)",
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { title: { display: true, text: chartInfo.labelKey } },
                        y: { title: { display: true, text: chartInfo.valueKey } },
                      },
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Table result */}
          {!isSingleValue && result.rows && result.rows.length > 0 && result.columns && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white text-left">
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-2.5 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        {result.columns!.map((col) => (
                          <td key={col} className="px-4 py-2 whitespace-nowrap">
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">
                {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} returned
              </div>
            </div>
          )}

          {/* No rows */}
          {result.rows && result.rows.length === 0 && (
            <div className="text-sm text-gray-500">No rows returned.</div>
          )}

          {/* Generated SQL */}
          {result.sql && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
                View generated SQL
              </summary>
              <pre className="mt-2 bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed">
                <code>{result.sql}</code>
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    // Format decimals nicely
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}
