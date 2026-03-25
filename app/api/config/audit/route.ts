import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface AuditRow {
  id: number;
  strategy: string;
  key: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
  changed_by: string | null;
}

// GET /api/config/audit?strategy=spinoff&limit=50
export async function GET(req: NextRequest) {
  const strategy = req.nextUrl.searchParams.get("strategy");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);

  try {
    let sql = `
      SELECT id, strategy, key, old_value, new_value,
             changed_at::TEXT, changed_by
      FROM scorer_config_audit
    `;
    const params: unknown[] = [];

    if (strategy) {
      sql += ` WHERE strategy = $1`;
      params.push(strategy);
    }

    sql += ` ORDER BY changed_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await query<AuditRow>(sql, params);
    return NextResponse.json({ audit: rows });
  } catch (error) {
    console.error("Config audit error:", error);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
