"use client";

import { useEffect, useState } from "react";
import {
  Card,
  ScoreIndicator,
  StatusBadge,
  MetricCell,
  Divider,
  Button,
  EmptyState,
} from "@/components/ui";
import SlidePanel from "@/components/ui/SlidePanel";
import { ExternalLink } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface Returns {
  ret_30d: number | null;
  ret_60d: number | null;
  ret_90d: number | null;
  ret_120d: number | null;
  ret_180d: number | null;
  ret_270d: number | null;
  bench_30d: number | null;
  bench_60d: number | null;
  bench_90d: number | null;
  bench_120d: number | null;
  bench_180d: number | null;
  bench_270d: number | null;
  excess_30d: number | null;
  excess_60d: number | null;
  excess_90d: number | null;
  excess_120d: number | null;
  excess_180d: number | null;
  excess_270d: number | null;
  peak_return: number | null;
  peak_return_day: number | null;
  max_drawdown_270d: number | null;
  days_to_positive: number | null;
}

interface CandidateDetail {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  form_type: string;
  filing_date: string;
  filing_url: string;
  sic_division: string | null;
  composite_score: number;
  form_type_score: number;
  sector_score: number;
  price_score: number;
  mcap_tag: string;
  implied_mcap: number | null;
  ai_summary: string | null;
  ai_summary_generated: boolean;
  returns: Returns | null;
}

interface CandidateDetailPanelProps {
  filingId: string | null;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

const ACTIVISM_FORMS = ["SC 13D", "SC 13G", "DFAN14A", "DEFA14A", "DEFC14A"];
const WINDOWS = [30, 60, 90, 120, 180, 270] as const;

function inferEventType(formType: string): "spinoff" | "activism" {
  const upper = formType.toUpperCase();
  return ACTIVISM_FORMS.some((f) => upper.includes(f)) ? "activism" : "spinoff";
}

// ── Skeleton ─────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="h-4 bg-surface-sunken rounded animate-pulse w-full" />
      <div className="h-4 bg-surface-sunken rounded animate-pulse w-11/12" />
      <div className="h-4 bg-surface-sunken rounded animate-pulse w-full" />
      <div className="h-4 bg-surface-sunken rounded animate-pulse w-9/12" />
      <p className="text-xs text-ink-tertiary mt-3">Generating summary...</p>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function CandidateDetailPanel({
  filingId,
  onClose,
}: CandidateDetailPanelProps) {
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filingId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/candidates/${encodeURIComponent(filingId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filingId]);

  const open = filingId !== null;

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={data?.company_name ?? "Loading..."}
    >
      {loading && !data && (
        <div className="space-y-6">
          <div className="h-8 bg-surface-sunken rounded animate-pulse w-2/3" />
          <SummarySkeleton />
        </div>
      )}

      {error && (
        <div className="text-sm text-signal-low bg-signal-low/10 rounded-md p-3">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* ── Header ──────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {data.ticker && (
                  <span className="font-mono text-sm font-medium text-ink-primary">
                    {data.ticker}
                  </span>
                )}
                <StatusBadge variant={inferEventType(data.form_type)} />
              </div>
              <p className="text-xs text-ink-tertiary">
                {data.form_type} &middot; {data.filing_date} &middot;{" "}
                {data.sic_division ?? "Unknown sector"}
              </p>
            </div>
            <ScoreIndicator score={data.composite_score} size="md" />
          </div>

          <Divider />

          {/* ── Score Breakdown ─────────────────────── */}
          <div>
            <h4 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">
              Score Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Form Type", value: data.form_type_score },
                { label: "Sector", value: data.sector_score },
                { label: "Price", value: data.price_score },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-surface-sunken rounded-md p-3 text-center"
                >
                  <p className="text-xs text-ink-tertiary mb-1">{item.label}</p>
                  <MetricCell value={item.value} format="decimal" />
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* ── AI Summary ──────────────────────────── */}
          <div>
            <h4 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">
              AI Summary
            </h4>
            {loading && !data.ai_summary ? (
              <SummarySkeleton />
            ) : data.ai_summary ? (
              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">
                {data.ai_summary}
              </p>
            ) : (
              <p className="text-sm text-ink-tertiary italic">
                Summary unavailable
              </p>
            )}
          </div>

          <Divider />

          {/* ── Returns ─────────────────────────────── */}
          <div>
            <h4 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">
              Backtest Returns
            </h4>
            {data.returns ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {WINDOWS.map((w) => {
                    const ret = data.returns![`ret_${w}d` as keyof Returns] as number | null;
                    const bench = data.returns![`bench_${w}d` as keyof Returns] as number | null;
                    const excess = data.returns![`excess_${w}d` as keyof Returns] as number | null;
                    return (
                      <div
                        key={w}
                        className="bg-surface-sunken rounded-md p-3"
                      >
                        <p className="text-xs font-medium text-ink-tertiary uppercase mb-1.5">
                          {w}D
                        </p>
                        <MetricCell
                          value={ret}
                          format="percent"
                          showArrow
                        />
                        {bench !== null && (
                          <p className="text-xs text-ink-tertiary mt-1">
                            IWM: {(bench * 100).toFixed(1)}%
                          </p>
                        )}
                        <div className="mt-0.5">
                          <span className="text-xs text-ink-tertiary">
                            Excess:{" "}
                          </span>
                          <MetricCell value={excess} format="percent" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary mb-1">Peak</p>
                    <MetricCell
                      value={data.returns.peak_return}
                      format="percent"
                      showArrow
                    />
                    {data.returns.peak_return_day !== null && (
                      <p className="text-xs text-ink-tertiary">
                        day {data.returns.peak_return_day}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary mb-1">
                      Max Drawdown
                    </p>
                    <MetricCell
                      value={data.returns.max_drawdown_270d}
                      format="percent"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary mb-1">
                      Days to +
                    </p>
                    <span className="font-mono text-sm text-ink-primary tabular-nums">
                      {data.returns.days_to_positive ?? "\u2014"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title="No return data"
                subtitle="Backtest returns are not available for this candidate."
              />
            )}
          </div>

          <Divider />

          {/* ── Footer Actions ──────────────────────── */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() =>
                window.open(data.filing_url, "_blank", "noopener,noreferrer")
              }
            >
              View on EDGAR
            </Button>
          </div>
        </div>
      )}
    </SlidePanel>
  );
}
