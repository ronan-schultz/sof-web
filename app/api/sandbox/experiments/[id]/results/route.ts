import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ResultRow {
  id: number;
  job_id: number;
  experiment_id: number;
  metrics: Record<string, unknown>;
  distributions: Record<string, unknown>;
  created_at: string;
}

// GET /api/sandbox/experiments/[id]/results
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const experimentId = parseInt(id, 10);

  try {
    // Get all results for this experiment, newest first
    const results = await query<ResultRow>(
      `SELECT r.*, j.config_snapshot
       FROM sandbox_results r
       JOIN sandbox_jobs j ON j.id = r.job_id
       WHERE r.experiment_id = $1
       ORDER BY r.created_at DESC`,
      [experimentId]
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Results GET error:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
