import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ExperimentRow {
  id: number;
  name: string;
  description: string | null;
  strategy: string;
  created_by: string;
  forked_from: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_job_status: string | null;
  last_run_at: string | null;
  sharpe_270d: string | null;
  win_rate_270d: string | null;
  mean_excess_270d: string | null;
}

// GET /api/sandbox/experiments?student=X
export async function GET(req: NextRequest) {
  const student = req.nextUrl.searchParams.get("student");
  if (!student) {
    return NextResponse.json(
      { error: "student query param required" },
      { status: 400 }
    );
  }

  try {
    // My experiments
    const mine = await query<ExperimentRow>(
      `SELECT e.*,
              j.status as last_job_status,
              j.queued_at as last_run_at,
              r.metrics->'test'->>'sharpe_270d' as sharpe_270d,
              r.metrics->'test'->>'win_rate_270d' as win_rate_270d,
              r.metrics->'test'->>'mean_excess_270d' as mean_excess_270d
       FROM sandbox_experiments e
       LEFT JOIN LATERAL (
         SELECT * FROM sandbox_jobs WHERE experiment_id = e.id ORDER BY queued_at DESC LIMIT 1
       ) j ON true
       LEFT JOIN LATERAL (
         SELECT * FROM sandbox_results WHERE experiment_id = e.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE e.created_by = $1 AND e.status != 'archived'
       ORDER BY e.updated_at DESC`,
      [student]
    );

    // Team experiments (other students' completed experiments)
    const team = await query<ExperimentRow>(
      `SELECT e.*,
              j.status as last_job_status,
              j.queued_at as last_run_at,
              r.metrics->'test'->>'sharpe_270d' as sharpe_270d,
              r.metrics->'test'->>'win_rate_270d' as win_rate_270d,
              r.metrics->'test'->>'mean_excess_270d' as mean_excess_270d
       FROM sandbox_experiments e
       LEFT JOIN LATERAL (
         SELECT * FROM sandbox_jobs WHERE experiment_id = e.id ORDER BY queued_at DESC LIMIT 1
       ) j ON true
       LEFT JOIN LATERAL (
         SELECT * FROM sandbox_results WHERE experiment_id = e.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE e.created_by != $1 AND e.status = 'complete'
       ORDER BY e.updated_at DESC`,
      [student]
    );

    return NextResponse.json({ mine, team });
  } catch (error) {
    console.error("Experiments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
  }
}

// POST /api/sandbox/experiments
// body: { name, description?, strategy, created_by, fork_from? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, strategy, created_by, fork_from } = body;

    if (!name || !strategy || !created_by) {
      return NextResponse.json(
        { error: "name, strategy, and created_by are required" },
        { status: 400 }
      );
    }

    // Create experiment
    const rows = await query<{ id: number }>(
      `INSERT INTO sandbox_experiments (name, description, strategy, created_by, forked_from)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, description || null, strategy, created_by, fork_from || null]
    );

    const experimentId = rows[0].id;

    if (fork_from) {
      // Copy configs from forked experiment
      await query(
        `INSERT INTO sandbox_configs (experiment_id, strategy, category, key, value, label)
         SELECT $1, strategy, category, key, value, label
         FROM sandbox_configs
         WHERE experiment_id = $2`,
        [experimentId, fork_from]
      );
    } else {
      // Seed from live scorer_config
      await query(
        `INSERT INTO sandbox_configs (experiment_id, strategy, category, key, value, label)
         SELECT $1, strategy, category, key, value, label
         FROM scorer_config
         WHERE strategy = $2 OR strategy = 'global'`,
        [experimentId, strategy]
      );
    }

    return NextResponse.json({ id: experimentId }, { status: 201 });
  } catch (error) {
    console.error("Experiments POST error:", error);
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 });
  }
}
