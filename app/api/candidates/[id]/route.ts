import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { query } from "@/lib/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface DetailRow {
  filing_id: string;
  company_name: string;
  ticker: string | null;
  form_type: string;
  filing_date: string;
  cik: string;
  sic_code: string | null;
  business_description: string | null;
  composite_score: number;
  form_type_score: number;
  sector_score: number;
  price_score: number;
  mcap_tag: string;
  implied_mcap: number | null;
  sic_division: string | null;
  ai_summary: string | null;
  ai_analysis_json: string | null;
  scored_at: string;
  // returns columns (nullable — LEFT JOIN)
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

async function generateSummary(row: DetailRow): Promise<string | null> {
  try {
    const userContent = [
      `Company: ${row.company_name}`,
      `Ticker: ${row.ticker ?? "Unknown"}`,
      `Form Type: ${row.form_type}`,
      `Filing Date: ${row.filing_date}`,
      `Sector: ${row.sic_division ?? "Unknown"}`,
      `Market Cap Tag: ${row.mcap_tag}`,
      `Composite Score: ${row.composite_score.toFixed(2)}`,
      `Sub-scores: Form=${row.form_type_score.toFixed(2)}, Sector=${row.sector_score.toFixed(2)}, Price=${row.price_score.toFixed(2)}`,
      row.business_description
        ? `Business Description: ${row.business_description}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content:
            "You are an investment analyst assistant. Given company filing data, write a concise 2-3 paragraph summary covering: (1) what the company does, (2) why this filing is significant for investors, (3) key risks or considerations. Be factual and specific. Do not use markdown formatting.",
        },
        { role: "user", content: userContent },
      ],
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("Groq summary generation failed:", err);
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await query<DetailRow>(`
      SELECT
        sc.filing_id,
        f.company_name,
        COALESCE(tr.ticker, sc.ticker) AS ticker,
        f.form_type,
        f.filing_date,
        f.cik,
        f.sic_code,
        f.business_description,
        sc.composite_score,
        sc.form_type_score,
        sc.sector_score,
        sc.price_score,
        sc.mcap_tag,
        sc.implied_mcap,
        sc.sic_division,
        sc.ai_summary,
        sc.ai_analysis_json,
        sc.scored_at,
        r.ret_30d, r.ret_60d, r.ret_90d, r.ret_120d, r.ret_180d, r.ret_270d,
        r.bench_30d, r.bench_60d, r.bench_90d, r.bench_120d, r.bench_180d, r.bench_270d,
        r.excess_30d, r.excess_60d, r.excess_90d, r.excess_120d, r.excess_180d, r.excess_270d,
        r.peak_return,
        r.peak_return_day,
        r.max_drawdown_270d,
        r.days_to_positive
      FROM scored_candidates sc
      JOIN filings f ON sc.filing_id = f.filing_id
      LEFT JOIN ticker_resolution tr ON f.cik = tr.cik
      LEFT JOIN returns r ON sc.filing_id = r.filing_id
      WHERE sc.filing_id = $1
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const row = rows[0];
    let aiSummary = row.ai_summary;
    let summaryGenerated = false;

    // Generate AI summary on-demand if missing
    if (!aiSummary) {
      aiSummary = await generateSummary(row);
      summaryGenerated = true;

      if (aiSummary) {
        await query(
          `UPDATE scored_candidates SET ai_summary = $1 WHERE filing_id = $2`,
          [aiSummary, id]
        );
      }
    }

    // Build returns object (null if no returns row)
    const hasReturns = row.ret_30d !== null || row.ret_60d !== null;
    const returns = hasReturns
      ? {
          ret_30d: row.ret_30d,
          ret_60d: row.ret_60d,
          ret_90d: row.ret_90d,
          ret_120d: row.ret_120d,
          ret_180d: row.ret_180d,
          ret_270d: row.ret_270d,
          bench_30d: row.bench_30d,
          bench_60d: row.bench_60d,
          bench_90d: row.bench_90d,
          bench_120d: row.bench_120d,
          bench_180d: row.bench_180d,
          bench_270d: row.bench_270d,
          excess_30d: row.excess_30d,
          excess_60d: row.excess_60d,
          excess_90d: row.excess_90d,
          excess_120d: row.excess_120d,
          excess_180d: row.excess_180d,
          excess_270d: row.excess_270d,
          peak_return: row.peak_return,
          peak_return_day: row.peak_return_day,
          max_drawdown_270d: row.max_drawdown_270d,
          days_to_positive: row.days_to_positive,
        }
      : null;

    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${row.cik}/${row.filing_id.replace(/-/g, "")}/`;

    return NextResponse.json({
      filing_id: row.filing_id,
      company_name: row.company_name,
      ticker: row.ticker,
      form_type: row.form_type,
      filing_date: row.filing_date,
      filing_url: filingUrl,
      sic_division: row.sic_division,
      business_description: row.business_description,
      composite_score: row.composite_score,
      form_type_score: row.form_type_score,
      sector_score: row.sector_score,
      price_score: row.price_score,
      mcap_tag: row.mcap_tag,
      implied_mcap: row.implied_mcap,
      ai_summary: aiSummary,
      ai_analysis_json: row.ai_analysis_json
        ? JSON.parse(row.ai_analysis_json)
        : null,
      ai_summary_generated: summaryGenerated,
      returns,
    });
  } catch (error) {
    console.error("Candidate detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate detail" },
      { status: 500 }
    );
  }
}
