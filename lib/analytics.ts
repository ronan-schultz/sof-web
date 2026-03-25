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

-- Activism backtest: one row per SC 13D filing processed
CREATE TABLE activism_backtest_candidates (
  id SERIAL PRIMARY KEY,
  filing_id TEXT UNIQUE,
  cik TEXT,                        -- target company CIK
  company_name TEXT,               -- target company name
  ticker TEXT,
  investor_name TEXT,              -- activist investor name (e.g. 'Carl Icahn')
  filing_date DATE,
  form_type TEXT,
  ownership_percent REAL,          -- % ownership disclosed
  prior_ownership_percent REAL,
  intent_category TEXT,            -- 'passive', 'active', or 'control'
  intent_score REAL,               -- 0-1 NLP score from Item 4
  activist_prior_wins INTEGER,
  composite_score REAL,            -- 0.45*intent + 0.25*ownership + 0.30*quality
  mcap_tag TEXT DEFAULT 'unknown',
  hold_horizon TEXT,               -- '90d' or '270d'
  created_at TIMESTAMPTZ
);

-- Returns for activism backtest candidates at 6 windows
CREATE TABLE activism_backtest_returns (
  id SERIAL PRIMARY KEY,
  filing_id TEXT REFERENCES activism_backtest_candidates(filing_id),
  ticker TEXT,
  window_days INTEGER,             -- 30, 60, 90, 120, 180, or 270
  price_start REAL,
  price_end REAL,
  raw_return REAL,
  iwm_start REAL,
  iwm_end REAL,
  iwm_return REAL,
  excess_return REAL,              -- raw_return - iwm_return
  is_winner BOOLEAN,               -- excess_return > 0
  data_complete BOOLEAN,
  created_at TIMESTAMPTZ
);

-- Known activist investors with track record
CREATE TABLE activist_registry (
  investor_name TEXT PRIMARY KEY,  -- e.g. 'Elliott Management', 'Carl Icahn'
  prior_wins INTEGER,
  prior_campaigns INTEGER DEFAULT 0,
  first_seen_date DATE,
  last_seen_date DATE,
  notes TEXT
);
`.trim();

export const SYSTEM_PROMPT = `You are a SQL assistant for a PostgreSQL database that tracks SEC filings, market data, and an investment screening pipeline for two strategies: (1) spin-offs — detected via Form 10/10-12B/10-12G filings, scored and tracked in filings/market_data/returns/scored_candidates; (2) activism — SC 13D filings tracked in activism_backtest_candidates with returns in activism_backtest_returns and investor history in activist_registry. Use activism_backtest_candidates for any questions about activists, campaigns, ownership, or intent. Use filings/returns for spinoff questions.

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
