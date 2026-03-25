import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { query } from "@/lib/db";
import { SYSTEM_PROMPT, validateSQL, stripMarkdownFencing } from "@/lib/analytics";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    // Generate SQL via Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
    });

    const rawSQL = completion.choices[0]?.message?.content ?? "";
    const sql = stripMarkdownFencing(rawSQL);

    // Validate
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return NextResponse.json({ sql, error: validation.error }, { status: 400 });
    }

    // Execute
    const rows = await query(validation.sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return NextResponse.json({ sql: validation.sql, columns, rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { sql: "", error: `Query failed: ${message}` },
      { status: 500 }
    );
  }
}
