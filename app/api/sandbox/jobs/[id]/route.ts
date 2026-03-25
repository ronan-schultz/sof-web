import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface JobRow {
  id: number;
  experiment_id: number;
  status: string;
  config_snapshot: Record<string, unknown>;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface ResultRow {
  metrics: Record<string, unknown>;
  distributions: Record<string, unknown>;
}

// GET /api/sandbox/jobs/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const jobs = await query<JobRow>(
      `SELECT * FROM sandbox_jobs WHERE id = $1`,
      [parseInt(id, 10)]
    );

    if (jobs.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobs[0];

    // If complete, include results
    let results: ResultRow | null = null;
    if (job.status === "complete") {
      const resultRows = await query<ResultRow>(
        `SELECT metrics, distributions FROM sandbox_results WHERE job_id = $1 LIMIT 1`,
        [parseInt(id, 10)]
      );
      if (resultRows.length > 0) {
        results = resultRows[0];
      }
    }

    return NextResponse.json({
      id: job.id,
      experiment_id: job.experiment_id,
      status: job.status,
      queued_at: job.queued_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      error_message: job.error_message,
      results: results
        ? { metrics: results.metrics, distributions: results.distributions }
        : null,
    });
  } catch (error) {
    console.error("Job GET error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
