import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ConfigRow {
  key: string;
  value: unknown;
}

// POST /api/sandbox/experiments/[id]/run — queue a backtest job
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const experimentId = parseInt(id, 10);

  try {
    // Verify experiment exists and is not already running
    const experiments = await query<{ id: number; status: string }>(
      `SELECT id, status FROM sandbox_experiments WHERE id = $1`,
      [experimentId]
    );

    if (experiments.length === 0) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    if (experiments[0].status === "running") {
      return NextResponse.json({ error: "Experiment already has a running job" }, { status: 409 });
    }

    // Fetch current configs and build snapshot
    const configs = await query<ConfigRow>(
      `SELECT key, value FROM sandbox_configs WHERE experiment_id = $1`,
      [experimentId]
    );

    const configSnapshot: Record<string, unknown> = {};
    for (const c of configs) {
      configSnapshot[c.key] = c.value;
    }

    // Insert job
    const jobs = await query<{ id: number }>(
      `INSERT INTO sandbox_jobs (experiment_id, status, config_snapshot)
       VALUES ($1, 'queued', $2)
       RETURNING id`,
      [experimentId, JSON.stringify(configSnapshot)]
    );

    // Update experiment status
    await query(
      `UPDATE sandbox_experiments SET status = 'running', updated_at = NOW() WHERE id = $1`,
      [experimentId]
    );

    return NextResponse.json({ job_id: jobs[0].id }, { status: 201 });
  } catch (error) {
    console.error("Run POST error:", error);
    return NextResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }
}
