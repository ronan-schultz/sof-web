"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

type SortKey = "composite_score" | "filing_date" | "company_name";
type SortDir = "asc" | "desc";

interface Candidate {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  form_type: string;
  composite_score: number;
  sector: string | null;
  mcap_tag: string;
  filing_date: string;
  filing_url: string;
  sic_code: string | null;
}

interface ApiResponse {
  candidates: Candidate[];
  row_count: number;
  last_updated: string | null;
}

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-green-600 font-semibold";
  return "text-amber-600 font-semibold";
}

function formatMcap(tag: string): string {
  const labels: Record<string, string> = {
    sub_1b_confirmed: "< $1B",
    sub_1b_unconfirmed: "< $1B (est.)",
    above_1b: "> $1B",
  };
  return labels[tag] ?? tag;
}

function SortArrow({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 opacity-30">&#8597;</span>;
  return <span className="ml-1">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("composite_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "composite_score" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.candidates].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "composite_score":
          cmp = a.composite_score - b.composite_score;
          break;
        case "filing_date":
          cmp = a.filing_date.localeCompare(b.filing_date);
          break;
        case "company_name":
          cmp = a.company_name.localeCompare(b.company_name);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
      setError(null);
      setRefreshedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error && !data) {
    return <p className="text-red-600 mt-8">Error: {error}</p>;
  }

  if (!data) {
    return <p className="text-gray-500 mt-8">Loading candidates...</p>;
  }

  return (
    <div>
      {/* Header stats */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-4 text-sm text-gray-500">
        <span>
          <span className="font-medium text-gray-900">
            {data.candidates.length}
          </span>{" "}
          candidates
        </span>
        <span>
          Audit log entries:{" "}
          <span className="font-medium text-gray-900">{data.row_count}</span>
        </span>
        {data.last_updated && (
          <span>Last audit: {data.last_updated}</span>
        )}
        {refreshedAt && (
          <span>Refreshed: {refreshedAt.toLocaleTimeString()}</span>
        )}
        {error && <span className="text-amber-600">Refresh error: {error}</span>}
      </div>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-left">
              <th
                className="sticky-col bg-gray-800 px-4 py-3 font-medium whitespace-nowrap cursor-pointer select-none hover:bg-gray-700 transition-colors"
                onClick={() => toggleSort("company_name")}
              >
                Company
                <SortArrow col="company_name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Form</th>
              <th
                className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-700 transition-colors"
                onClick={() => toggleSort("composite_score")}
              >
                Score
                <SortArrow col="composite_score" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Mkt Cap</th>
              <th
                className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-700 transition-colors"
                onClick={() => toggleSort("filing_date")}
              >
                Filed
                <SortArrow col="filing_date" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3 font-medium">EDGAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((c) => (
              <tr key={c.filing_id} className="hover:bg-gray-50">
                <td className="sticky-col bg-white px-4 py-2.5 font-medium whitespace-nowrap">
                  {c.company_name}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {c.ticker ?? "-"}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{c.form_type}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${scoreColor(c.composite_score)}`}>
                  {c.composite_score.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {c.sector ?? "-"}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {formatMcap(c.mcap_tag)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {c.filing_date}
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={c.filing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700 transition-colors"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
