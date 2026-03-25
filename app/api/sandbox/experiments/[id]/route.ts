import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ExperimentDetail {
  id: number;
  name: string;
  description: string | null;
  strategy: string;
  created_by: string;
  forked_from: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// GET /api/sandbox/experiments/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await query<ExperimentDetail>(
      `SELECT * FROM sandbox_experiments WHERE id = $1`,
      [parseInt(id, 10)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Experiment GET error:", error);
    return NextResponse.json({ error: "Failed to fetch experiment" }, { status: 500 });
  }
}

// DELETE /api/sandbox/experiments/[id] — soft delete (archive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await query<{ id: number }>(
      `UPDATE sandbox_experiments SET status = 'archived', updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [parseInt(id, 10)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Experiment DELETE error:", error);
    return NextResponse.json({ error: "Failed to archive experiment" }, { status: 500 });
  }
}
