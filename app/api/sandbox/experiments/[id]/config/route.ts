import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ConfigRow {
  id: number;
  experiment_id: number;
  strategy: string;
  category: string;
  key: string;
  value: unknown;
  label: string | null;
}

// GET /api/sandbox/experiments/[id]/config
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await query<ConfigRow>(
      `SELECT * FROM sandbox_configs WHERE experiment_id = $1 ORDER BY category, key`,
      [parseInt(id, 10)]
    );

    return NextResponse.json({ config: rows });
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT /api/sandbox/experiments/[id]/config
// body: [{ strategy, category, key, value, label }]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const experimentId = parseInt(id, 10);

  try {
    const body = await req.json();
    const configs: Array<{
      strategy: string;
      category: string;
      key: string;
      value: unknown;
      label?: string;
    }> = body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json(
        { error: "Body must be a non-empty array of config objects" },
        { status: 400 }
      );
    }

    // Validate weight sums for activism
    const weightConfigs = configs.filter((c) => c.category === "weight");
    if (weightConfigs.length > 0) {
      const intentW = weightConfigs.find((c) => c.key === "intent_weight");
      const ownershipW = weightConfigs.find((c) => c.key === "ownership_weight");
      const qualityW = weightConfigs.find((c) => c.key === "quality_weight");

      if (intentW && ownershipW && qualityW) {
        const sum =
          (intentW.value as number) +
          (ownershipW.value as number) +
          (qualityW.value as number);
        if (Math.abs(sum - 1.0) > 0.001) {
          return NextResponse.json(
            { error: `Weights must sum to 1.0 (got ${sum.toFixed(4)})` },
            { status: 400 }
          );
        }
      }
    }

    // Upsert each config row
    for (const c of configs) {
      await query(
        `INSERT INTO sandbox_configs (experiment_id, strategy, category, key, value, label)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (experiment_id, strategy, key) DO UPDATE
         SET value = EXCLUDED.value, label = EXCLUDED.label`,
        [
          experimentId,
          c.strategy,
          c.category,
          c.key,
          JSON.stringify(c.value),
          c.label || null,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config PUT error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
