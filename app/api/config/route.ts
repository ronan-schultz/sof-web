import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ConfigRow {
  id: number;
  strategy: string;
  category: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  updated_at: string;
  updated_by: string;
}

// GET /api/config?strategy=spinoff
export async function GET(req: NextRequest) {
  const strategy = req.nextUrl.searchParams.get("strategy");
  if (!strategy) {
    return NextResponse.json(
      { error: "strategy query param required (spinoff|activism|global)" },
      { status: 400 }
    );
  }

  try {
    const rows = await query<ConfigRow>(
      `SELECT id, strategy, category, key, value, label, description,
              updated_at::TEXT, updated_by
       FROM scorer_config
       WHERE strategy = $1
       ORDER BY category, key`,
      [strategy]
    );

    return NextResponse.json({ strategy, config: rows });
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT /api/config
// body: { strategy, key, value, changed_by? }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { strategy, key, value, changed_by = "admin" } = body;

    if (!strategy || !key || value === undefined) {
      return NextResponse.json(
        { error: "strategy, key, and value are required" },
        { status: 400 }
      );
    }

    // Read current row to get category and old value
    const existing = await query<ConfigRow>(
      `SELECT category, value FROM scorer_config WHERE strategy = $1 AND key = $2`,
      [strategy, key]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: `Config key not found: ${strategy}/${key}` }, { status: 404 });
    }

    const category = existing[0].category;
    const oldValue = existing[0].value;

    // Validate weights sum to 1.0
    if (category === "weight") {
      const weights = value as Record<string, number>;
      const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.001) {
        return NextResponse.json(
          { error: `Weights must sum to 1.0 (got ${sum.toFixed(4)})` },
          { status: 400 }
        );
      }
    }

    // Write audit row
    await query(
      `INSERT INTO scorer_config_audit (strategy, key, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [strategy, key, JSON.stringify(oldValue), JSON.stringify(value), changed_by]
    );

    // Update config
    await query(
      `UPDATE scorer_config SET value = $1, updated_at = NOW(), updated_by = $2
       WHERE strategy = $3 AND key = $4`,
      [JSON.stringify(value), changed_by, strategy, key]
    );

    return NextResponse.json({ success: true, strategy, key, value });
  } catch (error) {
    console.error("Config PUT error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
