// Schema context and SQL validation for the natural-language analytics endpoint.

export const DB_SCHEMA = `
-- IMPORTANT: Date columns (filing_date, effective_date, first_trade_date, signal_date, entry_date, exit_date, etc.)
-- are stored as TEXT in 'YYYY-MM-DD' format. Use ::date casts for any date arithmetic.

CREATE TABLE filings (
    filing_id TEXT PRIMARY KEY,
    form_type TEXT NOT NULL,          -- '10', '10-12B', '10-12G'
    cik TEXT NOT NULL,
    company_name TEXT NOT NULL,
    filing_date TEXT NOT NULL,        -- YYYY-MM-DD (TEXT, not DATE)
    filing_url TEXT NOT NULL,
    sic_code TEXT,
    state_of_inc TEXT,
    parent_cik TEXT,
    parent_name TEXT,
    effective_date TEXT,              -- YYYY-MM-DD (TEXT)
    business_description TEXT,
    filing_status TEXT DEFAULT 'initial', -- 'initial','amended','effective','withdrawn'
    confirmed_8k INTEGER DEFAULT 0,  -- 0 or 1
    parent_8k_url TEXT,
    is_spinoff INTEGER DEFAULT -1,   -- -1=unknown, 0=no, 1=yes
    macro_era TEXT,                   -- 'pre_gfc','gfc','recovery','post_covid'
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE market_data (
    filing_id TEXT PRIMARY KEY REFERENCES filings(filing_id),
    ticker TEXT,
    parent_ticker TEXT,
    ticker_source TEXT,               -- 'edgar_submissions','tiingo_search','filing_text','fuzzy_match','llm_groq'
    tiingo_start_date TEXT,
    tiingo_end_date TEXT,
    first_trade_date TEXT,            -- YYYY-MM-DD (TEXT)
    first_trade_price DOUBLE PRECISION,
    shares_outstanding BIGINT,
    shares_source TEXT,
    market_cap_at_spin DOUBLE PRECISION,
    price_data_source TEXT DEFAULT 'none', -- 'tiingo','yfinance','none'
    data_available INTEGER DEFAULT 0  -- 0 or 1
);

CREATE TABLE returns (
    filing_id TEXT PRIMARY KEY REFERENCES filings(filing_id),
    ret_30d DOUBLE PRECISION, ret_60d DOUBLE PRECISION, ret_90d DOUBLE PRECISION,
    ret_120d DOUBLE PRECISION, ret_180d DOUBLE PRECISION, ret_270d DOUBLE PRECISION,
    bench_30d DOUBLE PRECISION, bench_60d DOUBLE PRECISION, bench_90d DOUBLE PRECISION,
    bench_120d DOUBLE PRECISION, bench_180d DOUBLE PRECISION, bench_270d DOUBLE PRECISION,
    excess_30d DOUBLE PRECISION, excess_60d DOUBLE PRECISION, excess_90d DOUBLE PRECISION,
    excess_120d DOUBLE PRECISION, excess_180d DOUBLE PRECISION, excess_270d DOUBLE PRECISION,
    peak_return DOUBLE PRECISION,
    peak_return_day INTEGER,
    max_drawdown_270d DOUBLE PRECISION,
    days_to_positive INTEGER
);

CREATE TABLE scored_candidates (
    filing_id TEXT PRIMARY KEY REFERENCES filings(filing_id),
    composite_score DOUBLE PRECISION NOT NULL,
    form_type_score DOUBLE PRECISION NOT NULL,
    sector_score DOUBLE PRECISION NOT NULL,
    price_score DOUBLE PRECISION NOT NULL,
    mcap_tag TEXT DEFAULT 'sub_1b_unconfirmed', -- 'sub_1b_confirmed','sub_1b_unconfirmed','above_1b'
    implied_mcap DOUBLE PRECISION,
    sic_division TEXT,
    ticker TEXT,
    first_trade_price DOUBLE PRECISION,
    ai_summary TEXT,
    ai_analysis_json TEXT,
    scored_at TEXT,
    is_backfill BOOLEAN DEFAULT FALSE
);

CREATE TABLE analyst_decisions (
    decision_id SERIAL PRIMARY KEY,
    filing_id TEXT NOT NULL REFERENCES scored_candidates(filing_id),
    analyst_name TEXT NOT NULL,
    decision TEXT NOT NULL,           -- 'invest','reject','watchlist'
    rationale TEXT,
    thesis_kill_conditions TEXT,
    decided_at TEXT,
    is_backfill BOOLEAN DEFAULT FALSE
);

CREATE TABLE paper_portfolio (
    trade_id SERIAL PRIMARY KEY,
    filing_id TEXT NOT NULL REFERENCES filings(filing_id),
    signal_date TEXT NOT NULL,        -- YYYY-MM-DD (TEXT)
    entry_date TEXT,                  -- YYYY-MM-DD (TEXT)
    ticker TEXT NOT NULL,
    entry_price DOUBLE PRECISION,
    simulated_shares DOUBLE PRECISION,
    simulated_notional DOUBLE PRECISION,
    sector TEXT,
    form_type TEXT,
    composite_score DOUBLE PRECISION,
    exit_date TEXT,                   -- YYYY-MM-DD (TEXT)
    exit_price DOUBLE PRECISION,
    return_pct DOUBLE PRECISION,
    hold_days INTEGER,
    exit_reason TEXT
);

CREATE TABLE rejection_log (
    rejection_id SERIAL PRIMARY KEY,
    filing_id TEXT NOT NULL REFERENCES filings(filing_id),
    reason TEXT NOT NULL,             -- e.g. 'above_1b', 'score_below_threshold'
    details TEXT,                     -- JSON context
    rejected_at TEXT
);

CREATE TABLE score_check_events (
    event_id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES paper_portfolio(trade_id),
    filing_id TEXT NOT NULL,
    detected_at TEXT,
    threshold_at_detection DOUBLE PRECISION NOT NULL,
    score_at_detection DOUBLE PRECISION NOT NULL,
    resolved_at TEXT,
    resolved_by TEXT,
    resolution_action TEXT            -- NULL, 'hold', 'exit', 'reduce'
);

CREATE TABLE ticker_resolution (
    cik TEXT PRIMARY KEY,
    ticker TEXT,
    company_name TEXT,
    method TEXT,
    confidence DOUBLE PRECISION,
    resolved_at TIMESTAMP
);

CREATE TABLE scorer_config (
    id SERIAL PRIMARY KEY,
    strategy TEXT NOT NULL,           -- 'global','spinoff','activism'
    category TEXT NOT NULL,           -- 'threshold','weight','config','tier','keyword'
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    label TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ,
    updated_by TEXT DEFAULT 'system',
    UNIQUE (strategy, key)
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    filing_id TEXT,
    details TEXT,
    success INTEGER DEFAULT 1
);
`.trim();

export const SYSTEM_PROMPT = `You are a SQL assistant for a PostgreSQL database that tracks SEC spin-off filings, market data, and an investment screening pipeline.

Given the user's question, return ONLY a valid PostgreSQL SELECT query. No explanation, no markdown, no commentary — just the SQL.

Rules:
- ONLY SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.
- Date columns (filing_date, effective_date, first_trade_date, signal_date, entry_date, exit_date, detected_at, resolved_at, decided_at, rejected_at, scored_at, etc.) are stored as TEXT in 'YYYY-MM-DD' format. Use ::date casts for date arithmetic (e.g., filing_date::date).
- Use standard PostgreSQL functions and syntax.
- Keep queries efficient — avoid unnecessary subqueries.
- If the question is ambiguous, make reasonable assumptions and proceed.

Database schema:
${DB_SCHEMA}`;

const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|EXEC|EXECUTE)\b/i;

export function validateSQL(sql: string): { valid: boolean; sql: string; error?: string } {
  const trimmed = sql.trim().replace(/;+$/, "").trim();

  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    return { valid: false, sql: trimmed, error: "Query contains forbidden keywords. Only SELECT queries are allowed." };
  }

  if (!/^\s*(\(?\s*SELECT|WITH)\b/i.test(trimmed)) {
    return { valid: false, sql: trimmed, error: "Query must be a SELECT statement." };
  }

  // Append LIMIT 500 if no LIMIT clause present
  const hasLimit = /\bLIMIT\s+\d+/i.test(trimmed);
  const finalSQL = hasLimit ? trimmed : `${trimmed}\nLIMIT 500`;

  return { valid: true, sql: finalSQL };
}

export function stripMarkdownFencing(text: string): string {
  // Remove ```sql ... ``` or ``` ... ``` wrappers
  const match = text.match(/```(?:sql)?\s*\n?([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}
