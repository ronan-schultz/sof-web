# sof-web — SOF Frontend

## Stack

- **Next.js 15** (App Router) / **React 19** / **TypeScript 5.7**
- **TailwindCSS 4** (via `@tailwindcss/postcss`)
- **pg 8.x** — native PostgreSQL driver, singleton pool via `lib/db.ts`
- **chart.js 4 + react-chartjs-2** — backtest visualizations

## Database Connection

`lib/db.ts` creates a singleton `pg.Pool` on `globalThis` (survives Next.js hot reloads):
- Reads `DATABASE_URL` from env (Supabase PgBouncer pooler)
- SSL: `rejectUnauthorized: false` (required for Supabase pooler)
- Max 5 connections (appropriate for Vercel serverless)

## Route Map

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — sortable table of scored_candidates (composite_score >= 0.50) |
| `/admin` | Config editor — weights, thresholds, keywords per strategy; audit log |
| `/sandbox` | Experiment list (mine / team tabs); baseline metrics comparison |
| `/sandbox/new` | Create new experiment or fork from existing |
| `/sandbox/[id]` | Experiment workspace — parameter sliders + backtest results + charts |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/candidates` | GET | Scored candidates + filing URLs |
| `/api/config` | GET | Fetch scorer_config by strategy |
| `/api/config` | PUT | Update config + write audit trail (validates weights sum = 1.0) |
| `/api/config/audit` | GET | scorer_config_audit log |
| `/api/sandbox/baseline` | GET | Live model metrics on activism_backtest_candidates (cached 1h) |
| `/api/sandbox/experiments` | GET | List experiments (mine / team) |
| `/api/sandbox/experiments` | POST | Create or fork experiment |
| `/api/sandbox/experiments/[id]` | GET | Experiment detail |
| `/api/sandbox/experiments/[id]` | DELETE | Archive (soft delete) |
| `/api/sandbox/experiments/[id]/config` | GET/PUT | Per-experiment config |
| `/api/sandbox/experiments/[id]/results` | GET | Backtest run results |
| `/api/sandbox/experiments/[id]/run` | POST | Queue sandbox_job |
| `/api/sandbox/jobs/[id]` | GET | Poll job status + results |

## Critical Gotchas

### 1. pg returns DATE columns as JS Date objects, not strings

The `pg` driver automatically parses PostgreSQL `DATE` and `TIMESTAMP` columns into JavaScript `Date` objects. If you call `.slice()` on one expecting a string, it will throw.

**Always** either:
- Cast to `::TEXT` in the SQL query (preferred: `filing_date::TEXT`)
- Check with `instanceof Date` before string operations

### 2. scorer_config stores activism weights as a single nested row

The `scorer_config` table has one row with `key="weights"` whose `value` is:
```json
{"intent": 0.45, "ownership": 0.25, "activist_quality": 0.3}
```

**Never copy this row directly into `sandbox_configs`.** The sandbox system expects flat, individual weight rows.

### 3. sandbox_configs expects flat weight keys

When seeding a new experiment from scorer_config, decompose the nested weights object:

| scorer_config | sandbox_configs |
|---------------|-----------------|
| `weights.intent` | `key="intent_weight"`, `category="weight"` |
| `weights.ownership` | `key="ownership_weight"`, `category="weight"` |
| `weights.activist_quality` | `key="quality_weight"`, `category="weight"` |

This decomposition is implemented in `POST /api/sandbox/experiments` — any new code touching sandbox config creation must follow this pattern.

### 4. Temporal split is hardcoded

`CUTOFF_YEAR = 2018` in the baseline route. Train: filing_year < 2018, Test: >= 2018. Changing this requires updating the baseline route + potentially the sandbox worker.

### 5. No auth

Student identity is stored in `localStorage` (`sof_student_name`). No authentication system — not suitable for multi-tenant production.

## Git & Deploy

This repo has its **own `.git`** (separate from parent SOF/):
- Remote: `https://github.com/ronan-schultz/sof-web.git`
- Push: `git push origin master:main` (local branch is `master`, remote is `main`)
- Deploy: push to GitHub triggers **Vercel auto-deploy** to `sof-web.vercel.app`
- Do NOT push the parent SOF/ repo from here

## Key Files

```
lib/db.ts                              # Database pool + query<T>() helper
app/layout.tsx                         # Root layout (header nav)
app/page.tsx                           # Dashboard
app/admin/page.tsx                     # Config admin
app/sandbox/page.tsx                   # Experiment list
app/sandbox/[id]/page.tsx              # Experiment workspace (most complex page)
app/api/sandbox/baseline/route.ts      # Live model metrics computation
app/api/sandbox/experiments/route.ts   # Experiment CRUD
app/api/config/route.ts                # Live config tuning
```
