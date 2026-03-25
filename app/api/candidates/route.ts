import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface CandidateRow {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  form_type: string;
  composite_score: number;
  sector: string | null;
  mcap_tag: string;
  filing_date: string;
  cik: string;
  sic_code: string | null;
}

interface StatsRow {
  row_count: string;
  last_updated: string | null;
}

export async function GET() {
  try {
    const candidates = await query<CandidateRow>(`
      SELECT sc.filing_id,
             f.company_name,
             COALESCE(tr.ticker, sc.ticker) AS ticker,
             f.form_type,
             sc.composite_score,
             sc.sic_division AS sector,
             sc.mcap_tag,
             f.filing_date,
             f.cik,
             f.sic_code
      FROM scored_candidates sc
      JOIN filings f ON sc.filing_id = f.filing_id
      LEFT JOIN ticker_resolution tr ON f.cik = tr.cik
      WHERE sc.composite_score >= 0.50
      ORDER BY sc.composite_score DESC
    `);

    const stats = await query<StatsRow>(`
      SELECT COUNT(*) AS row_count,
             MAX(timestamp) AS last_updated
      FROM audit_log
    `);

    const withUrls = candidates.map((row) => ({
      ...row,
      filing_url: `https://www.sec.gov/Archives/edgar/data/${row.cik}/${row.filing_id.replace(/-/g, "")}/`,
    }));

    return NextResponse.json({
      candidates: withUrls,
      row_count: parseInt(stats[0]?.row_count ?? "0", 10),
      last_updated: stats[0]?.last_updated ?? null,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}
