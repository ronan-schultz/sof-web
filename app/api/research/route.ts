import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ResearchMetricsRow {
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

interface FunnelRow {
  total_filings: number;
  form_10_12b_count: number;
  scored_count: number;
  usable_returns_count: number;
}

interface BucketRow {
  score_range: string;
  n: number;
  median_excess_180d: number | null;
  hit_rate: number | null;
}

export async function GET() {
  try {
    // Latest research_metrics row
    const metricsRows = await query<ResearchMetricsRow>(`
      SELECT *, run_at::TEXT AS run_at
      FROM research_metrics
      ORDER BY run_at DESC
      LIMIT 1
    `);

    // Funnel counts
    const funnelRows = await query<FunnelRow>(`
      SELECT
        (SELECT COUNT(*) FROM filings) AS total_filings,
        (SELECT COUNT(*) FROM filings WHERE form_type IN ('10-12B', '10-12G')) AS form_10_12b_count,
        (SELECT COUNT(*) FROM scored_candidates WHERE mcap_tag = 'sub_1b_confirmed') AS scored_count,
        (SELECT COUNT(*) FROM scored_candidates sc
           JOIN filings f ON sc.filing_id = f.filing_id
           JOIN returns r ON sc.filing_id = r.filing_id
           WHERE sc.mcap_tag = 'sub_1b_confirmed'
             AND f.is_primary_filing = TRUE
             AND r.excess_30d IS NOT NULL
        ) AS usable_returns_count
    `);

    // Score bucket breakdown
    const bucketRows = await query<BucketRow>(`
      WITH scored AS (
        SELECT
          sc.composite_score,
          r.excess_180d
        FROM scored_candidates sc
        JOIN filings f ON sc.filing_id = f.filing_id
        JOIN returns r ON sc.filing_id = r.filing_id
        WHERE sc.mcap_tag = 'sub_1b_confirmed'
          AND f.is_primary_filing = TRUE
          AND r.excess_180d IS NOT NULL
      ),
      bucketed AS (
        SELECT
          CASE
            WHEN composite_score >= 0.85 THEN '[0.85+]'
            WHEN composite_score >= 0.75 THEN '[0.75-0.85)'
            WHEN composite_score >= 0.65 THEN '[0.65-0.75)'
            ELSE '[0.50-0.65)'
          END AS score_range,
          CASE
            WHEN composite_score >= 0.85 THEN 4
            WHEN composite_score >= 0.75 THEN 3
            WHEN composite_score >= 0.65 THEN 2
            ELSE 1
          END AS sort_order,
          excess_180d
        FROM scored
        WHERE composite_score >= 0.50
      )
      SELECT
        score_range,
        COUNT(*)::INTEGER AS n,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY excess_180d) AS median_excess_180d,
        AVG(CASE WHEN excess_180d > 0 THEN 1.0 ELSE 0.0 END) AS hit_rate
      FROM bucketed
      GROUP BY score_range, sort_order
      ORDER BY sort_order
    `);

    return NextResponse.json({
      metrics: metricsRows[0] ?? null,
      funnel: funnelRows[0] ?? null,
      buckets: bucketRows,
    });
  } catch (error) {
    console.error("Research API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch research data", detail: message },
      { status: 500 }
    );
  }
}
