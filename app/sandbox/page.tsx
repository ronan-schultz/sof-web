"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Experiment {
  id: number;
  name: string;
  description: string | null;
  strategy: string;
  created_by: string;
  status: string;
  updated_at: string;
  last_job_status: string | null;
  last_run_at: string | null;
  sharpe_270d: string | null;
  win_rate_270d: string | null;
  mean_excess_270d: string | null;
}

interface Baseline {
  metrics: {
    n_total: number;
    n_train: number;
    n_test: number;
    cutoff_year: number;
    train: Record<string, number | null>;
    test: Record<string, number | null>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

function DeltaCell({
  value,
  baseline,
  format,
}: {
  value: string | null;
  baseline: number | null;
  format?: "pct" | "ratio";
}) {
  if (value === null || value === undefined) return <span className="text-gray-400">--</span>;
  const num = parseFloat(value);
  if (isNaN(num)) return <span className="text-gray-400">--</span>;

  const formatted = format === "pct" ? `${(num * 100).toFixed(1)}%` : num.toFixed(3);

  if (baseline === null || baseline === undefined) return <span>{formatted}</span>;

  const delta = num - baseline;
  const deltaFormatted =
    format === "pct" ? `${(delta * 100).toFixed(1)}%` : delta.toFixed(3);
  const color = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-500";

  return (
    <span>
      {formatted}{" "}
      <span className={`text-xs ${color}`}>
        ({delta > 0 ? "+" : ""}
        {deltaFormatted})
      </span>
    </span>
  );
}

export default function SandboxPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [mine, setMine] = useState<Experiment[]>([]);
  const [team, setTeam] = useState<Experiment[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sof_student_name");
    if (stored) setStudentName(stored);
    else setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    if (!studentName) return;
    setLoading(true);
    try {
      const [expRes, baseRes] = await Promise.all([
        fetch(`/api/sandbox/experiments?student=${encodeURIComponent(studentName)}`),
        fetch("/api/sandbox/baseline"),
      ]);
      if (expRes.ok) {
        const data = await expRes.json();
        setMine(data.mine);
        setTeam(data.team);
      }
      if (baseRes.ok) {
        setBaseline(await baseRes.json());
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [studentName]);

  useEffect(() => {
    if (studentName) fetchData();
  }, [studentName, fetchData]);

  const handleSetName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("sof_student_name", trimmed);
    setStudentName(trimmed);
  };

  const handleFork = async (experimentId: number) => {
    router.push(`/sandbox/new?fork_from=${experimentId}`);
  };

  if (!studentName) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <h2 className="text-lg font-semibold mb-4">Enter your name to get started</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSetName()}
            placeholder="Your name"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleSetName}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500 mt-8">Loading experiments...</div>;
  }

  const bm = baseline?.metrics?.test;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sandbox</h2>
          <p className="text-sm text-gray-500">
            Signed in as <span className="font-medium">{studentName}</span>
            <button
              onClick={() => {
                localStorage.removeItem("sof_student_name");
                setStudentName(null);
              }}
              className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              change
            </button>
          </p>
        </div>
        <button
          onClick={() => router.push("/sandbox/new")}
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
        >
          New experiment
        </button>
      </div>

      {/* Baseline reference */}
      {bm && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Live Baseline
          </h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Sharpe (270d):</span>{" "}
              <span className="font-mono">{bm.sharpe_270d?.toFixed(3) ?? "--"}</span>
            </div>
            <div>
              <span className="text-gray-500">Win rate (270d):</span>{" "}
              <span className="font-mono">
                {bm.win_rate_270d !== null ? `${(bm.win_rate_270d * 100).toFixed(1)}%` : "--"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Mean excess (270d):</span>{" "}
              <span className="font-mono">
                {bm.mean_excess_270d !== null
                  ? `${(bm.mean_excess_270d * 100).toFixed(1)}%`
                  : "--"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* My experiments */}
      <section>
        <h3 className="text-sm font-semibold mb-3">My Experiments</h3>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-400">No experiments yet. Create one to get started.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mine.map((exp) => (
              <div
                key={exp.id}
                onClick={() => router.push(`/sandbox/${exp.id}`)}
                className="bg-white border border-gray-200 rounded p-4 hover:border-gray-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm truncate">{exp.name}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[exp.status] || "bg-gray-100"}`}
                  >
                    {exp.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {exp.strategy} &middot;{" "}
                  {exp.last_run_at
                    ? `Last run ${new Date(exp.last_run_at).toLocaleDateString()}`
                    : "No runs"}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Sharpe</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.sharpe_270d}
                        baseline={bm?.sharpe_270d ?? null}
                        format="ratio"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Win rate</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.win_rate_270d}
                        baseline={bm?.win_rate_270d ?? null}
                        format="pct"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Excess</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.mean_excess_270d}
                        baseline={bm?.mean_excess_270d ?? null}
                        format="pct"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Team experiments */}
      {team.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3">Team Experiments</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {team.map((exp) => (
              <div
                key={exp.id}
                className="bg-white border border-gray-200 rounded p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm truncate">{exp.name}</h4>
                  <span className="text-xs text-gray-500">{exp.created_by}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{exp.strategy}</div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div>
                    <div className="text-gray-400">Sharpe</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.sharpe_270d}
                        baseline={bm?.sharpe_270d ?? null}
                        format="ratio"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Win rate</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.win_rate_270d}
                        baseline={bm?.win_rate_270d ?? null}
                        format="pct"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Excess</div>
                    <div className="font-mono">
                      <DeltaCell
                        value={exp.mean_excess_270d}
                        baseline={bm?.mean_excess_270d ?? null}
                        format="pct"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleFork(exp.id)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
                >
                  Fork
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
