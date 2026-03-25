# SOF Web — Spin-Off Monitor Dashboard

Displays scored spin-off candidates from the SOF Postgres database.

## Setup

```bash
cd sof-web
npm install
```

Copy the environment template and fill in your Postgres connection string:

```bash
cp .env.local.template .env.local
```

Edit `.env.local`:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What it shows

- All scored candidates with composite score >= 0.50, ordered by score descending
- Resolved tickers from `ticker_resolution` where available, falling back to `scored_candidates.ticker`
- Linked EDGAR filing buttons
- Score color-coded: green >= 0.75, amber 0.50-0.74
- Auto-refreshes every 60 seconds
