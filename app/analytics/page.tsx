"use client";

import { useState, useMemo, FormEvent } from "react";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  AlertBanner,
  DataTable,
  MetricCell,
} from "@/components/ui";
import { type Column } from "@/components/ui/DataTable";

interface AnalyticsResult {
  sql: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

export default function AnalyticsPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [sqlExpanded, setSqlExpanded] = useState(false);

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
    const maxVal = Math.max(...values.map(Math.abs));
    return { labelKey, valueKey, labels, values, maxVal };
  }, [result?.rows]);

  // Build DataTable columns from result
  const tableColumns: Column<Record<string, unknown>>[] = useMemo(() => {
    if (!result?.columns) return [];
    return result.columns.map((col) => ({
      key: col,
      label: col,
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const val = row[col];
        if (typeof val === "number") {
          return <MetricCell value={val} format="decimal" />;
        }
        return (
          <span className="text-sm text-ink-primary">{formatCell(val)}</span>
        );
      },
    }));
  }, [result?.columns]);

  return (
    <AppLayout>
      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />
        )}

        <div className="p-6 max-w-4xl">
          <PageHeader
            title="Analytics"
            subtitle="Natural language queries against the SOF database"
          />

          {/* Query input */}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                placeholder="e.g. What is the average excess return for activism candidates by intent category?"
                className="w-full px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary resize-none"
                disabled={loading}
              />
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={loading || !question.trim()}
              >
                {loading ? "Running..." : "Run Query"}
              </Button>
            </form>
          </Card>

          {/* Error */}
          {result?.error && (
            <div className="mt-4">
              <AlertBanner variant="critical" message={result.error} />
            </div>
          )}

          {/* Results */}
          {result && !result.error && (
            <div className="mt-6 space-y-4">
              {/* Single value result */}
              {isSingleValue && result.rows && result.columns && (
                <Card>
                  <p className="text-xs text-ink-tertiary uppercase tracking-wider mb-1">
                    {result.columns[0]}
                  </p>
                  <p className="text-3xl font-semibold font-mono text-ink-primary">
                    {formatCell(result.rows[0][result.columns[0]])}
                  </p>
                </Card>
              )}

              {/* CSS bar chart */}
              {chartInfo && !isSingleValue && (
                <Card title="Chart">
                  <div className="space-y-1">
                    {chartInfo.labels.map((label, i) => {
                      const val = chartInfo.values[i];
                      const width =
                        chartInfo.maxVal > 0
                          ? Math.abs(val) / chartInfo.maxVal
                          : 0;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-32 text-xs text-ink-secondary truncate text-right">
                            {label}
                          </span>
                          <div className="flex-1 h-5 bg-surface-sunken rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-signal-high/40 rounded-sm"
                              style={{ width: `${width * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-xs font-mono text-ink-tertiary text-right">
                            {formatCell(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Table result */}
              {!isSingleValue && result.rows && result.rows.length > 0 && result.columns && (
                <Card
                  title="Results"
                  action={
                    result.sql ? (
                      <button
                        onClick={() => setSqlExpanded(!sqlExpanded)}
                        className="text-xs text-ink-tertiary font-mono truncate max-w-xs"
                      >
                        {sqlExpanded ? result.sql : result.sql.slice(0, 60) + (result.sql.length > 60 ? "..." : "")}
                      </button>
                    ) : undefined
                  }
                >
                  <p className="text-xs text-ink-tertiary mb-3">
                    {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
                  </p>
                  <DataTable
                    columns={tableColumns}
                    data={result.rows}
                  />
                </Card>
              )}

              {/* No rows */}
              {result.rows && result.rows.length === 0 && (
                <Card>
                  <EmptyState
                    title="No rows returned"
                    subtitle="The query executed successfully but returned no data."
                  />
                </Card>
              )}
            </div>
          )}

          {/* Initial empty state */}
          {!result && !loading && (
            <div className="mt-8">
              <EmptyState
                title="Ask a question"
                subtitle="Query the SOF database in plain English"
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
