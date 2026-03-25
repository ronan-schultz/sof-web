import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ConfigRow {
  key: string;
  value: unknown;
}

interface BacktestCandidate {
  filing_id: string;
  filing_date: string | null;
  intent_score: number | null;
  ownership_percent: number | null;
  activist_prior_wins: number | null;
  composite_score: number | null;
  intent_category: string | null;
}

interface ReturnRow {
  filing_id: string;
  window_days: number;
  excess_return: number;
  is_winner: boolean;
}

function normalizeOwnership(pct: number | null): number {
  if (pct === null || pct < 5) return 0.0;
  if (pct < 10) return 0.4;
  if (pct < 20) return 0.7;
  return 1.0;
}

function normalizeQuality(priorWins: number | null): number {
  if (priorWins === null) return 0.3;
  if (priorWins === 0) return 0.1;
  if (priorWins <= 2) return 0.5;
  if (priorWins <= 5) return 0.8;
  return 1.0;
}

// GET /api/sandbox/baseline — compute live model metrics for comparison
export async function GET() {
  try {
    // Load live config weights
    const configs = await query<ConfigRow>(
      `SELECT key, value FROM scorer_config WHERE strategy = 'activism' OR strategy = 'global'`
    );

    const configMap: Record<string, unknown> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    const weights = (configMap["weights"] as Record<string, number>) || {
      intent: 0.45,
      ownership: 0.25,
      activist_quality: 0.3,
    };
    const intentW = weights.intent ?? 0.45;
    const ownershipW = weights.ownership ?? 0.25;
    const qualityW = weights.activist_quality ?? 0.3;
    const threshold = (configMap["score_threshold"] as number) ?? 0.5;

    const CUTOFF_YEAR = 2018;

    // Load all historical candidates
    const candidates = await query<BacktestCandidate>(
      `SELECT filing_id, filing_date, intent_score, ownership_percent,
              activist_prior_wins, composite_score, intent_category
       FROM activism_backtest_candidates`
    );

    // Re-score with live weights
    const scored = candidates.map((row) => {
      const intent = Number(row.intent_score || 0);
      const ownership = normalizeOwnership(row.ownership_percent);
      const quality = normalizeQuality(row.activist_prior_wins);
      let score = intentW * intent + ownershipW * ownership + qualityW * quality;
      score = Math.max(0, Math.min(1, score));
      return { ...row, sandbox_score: score };
    });

    // Temporal split
    function filingYear(d: string | null): number {
      if (!d) return 0;
      return parseInt(String(d).slice(0, 4), 10);
    }

    const scoredTrain = scored.filter((c) => filingYear(c.filing_date) < CUTOFF_YEAR);
    const scoredTest = scored.filter((c) => filingYear(c.filing_date) >= CUTOFF_YEAR);
    const qualTrain = scoredTrain.filter((c) => c.sandbox_score >= threshold);
    const qualTest = scoredTest.filter((c) => c.sandbox_score >= threshold);

    // Fetch returns for all qualified (train + test)
    const allQualified = [...qualTrain, ...qualTest];
    const filingIds = allQualified.map((c) => c.filing_id);

    const returns: Record<string, Record<number, ReturnRow>> = {};
    if (filingIds.length > 0) {
      const placeholders = filingIds.map((_, i) => `$${i + 1}`).join(",");
      const returnRows = await query<ReturnRow>(
        `SELECT filing_id, window_days, excess_return, is_winner
         FROM activism_backtest_returns
         WHERE filing_id IN (${placeholders})`,
        filingIds
      );
      for (const r of returnRows) {
        if (!returns[r.filing_id]) returns[r.filing_id] = {};
        returns[r.filing_id][r.window_days] = r;
      }
    }

    // Metric computation helper
    function mean(arr: number[]): number | null {
      if (arr.length === 0) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    function sharpe(arr: number[]): number | null {
      if (arr.length < 2) return null;
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance =
        arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
      const std = Math.sqrt(variance);
      return std > 0 ? m / std : null;
    }

    function winRate(arr: number[]): number | null {
      if (arr.length === 0) return null;
      return arr.filter((r) => r > 0).length / arr.length;
    }

    type ScoredCandidate = (typeof scored)[number];

    function computeSplitMetrics(
      qualified: ScoredCandidate[],
      totalCandidates: number
    ) {
      function excessReturnsAt(window: number): number[] {
        return qualified
          .filter((c) => returns[c.filing_id]?.[window])
          .map((c) => returns[c.filing_id][window].excess_return);
      }
      const er30 = excessReturnsAt(30);
      const er90 = excessReturnsAt(90);
      const er270 = excessReturnsAt(270);

      return {
        n_total: totalCandidates,
        n_qualified: qualified.length,
        qualification_rate:
          totalCandidates > 0 ? qualified.length / totalCandidates : 0,
        mean_excess_30d: mean(er30),
        mean_excess_90d: mean(er90),
        mean_excess_270d: mean(er270),
        sharpe_90d: sharpe(er90),
        sharpe_270d: sharpe(er270),
        win_rate_90d: winRate(er90),
        win_rate_270d: winRate(er270),
        max_drawdown_270d: er270.length > 0 ? Math.min(...er270) : null,
      };
    }

    const metrics = {
      n_total: scored.length,
      n_train: scoredTrain.length,
      n_test: scoredTest.length,
      cutoff_year: CUTOFF_YEAR,
      train: computeSplitMetrics(qualTrain, scoredTrain.length),
      test: computeSplitMetrics(qualTest, scoredTest.length),
    };

    return NextResponse.json(
      { metrics },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (error) {
    console.error("Baseline GET error:", error);
    return NextResponse.json(
      { error: "Failed to compute baseline" },
      { status: 500 }
    );
  }
}
