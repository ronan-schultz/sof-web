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

async function fetchFilingText(filingUrl: string): Promise<string | null> {
  try {
    // Fetch the filing index page to find the main document
    const indexRes = await fetch(filingUrl, {
      headers: { "User-Agent": "SOF-Web ronanschultz35@gmail.com" },
      signal: AbortSignal.timeout(10000),
    });
    if (!indexRes.ok) return null;
    const indexHtml = await indexRes.text();

    // Find the primary document link (usually the .htm or .txt filing)
    const docMatch = indexHtml.match(
      /href="([^"]+\.(?:htm|txt))"[^>]*>(?:[^<]*(?:10-12|10-K|SC 13D|FORM|Registration))/i
    ) ?? indexHtml.match(/href="([^"]+\.htm)"/i);

    if (!docMatch) return null;

    let docUrl = docMatch[1];
    if (!docUrl.startsWith("http")) {
      // Relative URL — resolve against SEC base
      const base = filingUrl.endsWith("/") ? filingUrl : filingUrl + "/";
      docUrl = new URL(docUrl, base).toString();
    }

    const docRes = await fetch(docUrl, {
      headers: { "User-Agent": "SOF-Web ronanschultz35@gmail.com" },
      signal: AbortSignal.timeout(15000),
    });
    if (!docRes.ok) return null;
    const html = await docRes.text();

    // Strip HTML tags to get plain text, take first 80K chars
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#\d+;/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80000);

    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}

function extractBusinessSection(text: string): string | null {
  // Find Item 1 Business section, skip TOC matches
  const patterns = [
    /Item\s*1[\.\s]*[—\-–\s]+Business\s*([\s\S]*)/i,
    /ITEM\s*1[\.\s]*[—\-–\s]+BUSINESS\s*([\s\S]*)/i,
  ];
  for (const pattern of patterns) {
    const matches = text.matchAll(new RegExp(pattern, "gi"));
    for (const m of matches) {
      const content = m[1]?.trim().slice(0, 4000) ?? "";
      // Skip TOC entries (have many "Item N." references)
      const itemRefs = content.slice(0, 500).match(/Item\s*\d+[A-Z]?\./gi);
      if (itemRefs && itemRefs.length >= 3) continue;
      if (content.length >= 100) return content.slice(0, 3000);
    }
  }
  return null;
}

function formatPercent(v: number | null): string {
  if (v === null) return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}

async function generateSummary(row: DetailRow): Promise<string | null> {
  try {
    // Parse ai_analysis_json if available (from pipeline's filing_analyzer.py)
    let analysisContext = "";
    if (row.ai_analysis_json) {
      try {
        const analysis = JSON.parse(row.ai_analysis_json);
        const parts: string[] = [];
        if (analysis.parent_company)
          parts.push(`Parent Company: ${analysis.parent_company}`);
        if (analysis.separation_rationale)
          parts.push(`Separation Rationale: ${analysis.separation_rationale}`);
        if (analysis.sic_description)
          parts.push(`Business: ${analysis.sic_description}`);
        if (analysis.disclosed_financials) {
          const fin = analysis.disclosed_financials;
          const finParts: string[] = [];
          if (fin.revenue) finParts.push(`Revenue: ${fin.revenue}`);
          if (fin.ebitda) finParts.push(`EBITDA: ${fin.ebitda}`);
          if (fin.total_assets) finParts.push(`Total Assets: ${fin.total_assets}`);
          if (finParts.length) parts.push(`Financials: ${finParts.join(", ")}`);
        }
        if (analysis.red_flags?.length)
          parts.push(`Red Flags: ${analysis.red_flags.join("; ")}`);
        if (parts.length) analysisContext = parts.join("\n");
      } catch {
        // ignore parse errors
      }
    }

    // Build returns context
    let returnsContext = "";
    if (row.ret_30d !== null || row.ret_60d !== null) {
      const lines = [
        `Backtest Returns (absolute / excess vs IWM):`,
        `  30d: ${formatPercent(row.ret_30d)} / ${formatPercent(row.excess_30d)}`,
        `  90d: ${formatPercent(row.ret_90d)} / ${formatPercent(row.excess_90d)}`,
        `  180d: ${formatPercent(row.ret_180d)} / ${formatPercent(row.excess_180d)}`,
        `  270d: ${formatPercent(row.ret_270d)} / ${formatPercent(row.excess_270d)}`,
      ];
      if (row.peak_return !== null)
        lines.push(`  Peak return: ${formatPercent(row.peak_return)} (day ${row.peak_return_day})`);
      if (row.max_drawdown_270d !== null)
        lines.push(`  Max drawdown: ${formatPercent(row.max_drawdown_270d)}`);
      returnsContext = lines.join("\n");
    }

    // If business_description is weak (<200 chars), try to fetch from EDGAR
    let businessDesc = row.business_description;
    if (!businessDesc || businessDesc.length < 200) {
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${row.cik}/${row.filing_id.replace(/-/g, "")}/`;
      const filingText = await fetchFilingText(filingUrl);
      if (filingText) {
        const extracted = extractBusinessSection(filingText);
        if (extracted && extracted.length > (businessDesc?.length ?? 0)) {
          businessDesc = extracted;
        }
      }
    }

    const userContent = [
      `Company: ${row.company_name}`,
      `Ticker: ${row.ticker ?? "Unknown"}`,
      `Form Type: ${row.form_type}`,
      `Filing Date: ${row.filing_date}`,
      `Sector: ${row.sic_division ?? "Unknown"}`,
      `Market Cap: ${row.mcap_tag}${row.implied_mcap ? ` ($${(row.implied_mcap / 1e6).toFixed(0)}M)` : ""}`,
      `Composite Score: ${row.composite_score.toFixed(2)} (Form=${row.form_type_score.toFixed(2)}, Sector=${row.sector_score.toFixed(2)}, Price=${row.price_score.toFixed(2)})`,
      "",
      businessDesc
        ? `Business Description (from filing):\n${businessDesc}`
        : "",
      analysisContext ? `\nAI-Extracted Filing Analysis:\n${analysisContext}` : "",
      returnsContext ? `\n${returnsContext}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a senior equity research analyst writing a brief for a growth equity / special situations fund.

Given SEC filing data, backtest returns, and AI-extracted analysis, write a concise 2-3 paragraph investment summary:

Paragraph 1: What the company does, its sector, and scale. If a spin-off, name the parent and separation rationale.
Paragraph 2: Investment thesis — why this is interesting. Reference the backtest returns if available (e.g., "the stock returned X% over 90 days post-filing, outperforming IWM by Y%"). Highlight score drivers.
Paragraph 3: Key risks — red flags from the filing, market cap concerns, sector headwinds, or data gaps.

Be specific and quantitative. Use plain text, no markdown. Write for someone who reads 50 of these a day — lead with what matters.`,
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
