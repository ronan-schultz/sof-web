"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Card,
  Button,
  Stat,
  StatusBadge,
  Divider,
  EmptyState,
} from "@/components/ui";

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

export default function SandboxPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [mine, setMine] = useState<Experiment[]>([]);
  const [team, setTeam] = useState<Experiment[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "team">("mine");

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
        fetch(
          `/api/sandbox/experiments?student=${encodeURIComponent(studentName)}`
        ),
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

  const handleFork = (experimentId: number) => {
    router.push(`/sandbox/new?fork_from=${experimentId}`);
  };

  const bm = baseline?.metrics?.test;

  // ── Name entry gate ─────────────────────────────────────────────
  if (!studentName) {
    return (
      <AppLayout>
        <div className="p-6 max-w-md mx-auto mt-16">
          <Card title="Enter your name to get started">
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                placeholder="Your name"
                className="flex-1 px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary"
              />
              <Button variant="primary" size="md" onClick={handleSetName}>
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // ── Experiment card ─────────────────────────────────────────────
  function ExperimentCard({
    exp,
    showFork,
  }: {
    exp: Experiment;
    showFork?: boolean;
  }) {
    const hasSharpe = exp.sharpe_270d !== null;
    const hasWinRate = exp.win_rate_270d !== null;
    const hasExcess = exp.mean_excess_270d !== null;
    const hasMetrics = hasSharpe || hasWinRate || hasExcess;

    return (
      <Card>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-base font-semibold text-ink-primary">
              {exp.name}
            </p>
            {exp.description && (
              <p className="text-sm text-ink-secondary">{exp.description}</p>
            )}
          </div>
          <StatusBadge
            variant={exp.status === "archived" ? "pending" : "confirmed"}
          />
        </div>

        <p className="text-xs text-ink-tertiary mb-3">
          {exp.strategy}
          {exp.last_run_at &&
            ` \u00b7 Last run ${new Date(exp.last_run_at).toLocaleDateString()}`}
          {showFork && ` \u00b7 by ${exp.created_by}`}
        </p>

        {hasMetrics && (
          <>
            <div className="flex gap-6 mb-3">
              <Stat
                label="Sharpe"
                value={
                  hasSharpe ? parseFloat(exp.sharpe_270d!).toFixed(3) : "\u2014"
                }
                delta={
                  hasSharpe && bm?.sharpe_270d != null
                    ? parseFloat(exp.sharpe_270d!) - bm.sharpe_270d
                    : undefined
                }
                deltaFormat="decimal"
              />
              <Stat
                label="Win Rate"
                value={
                  hasWinRate
                    ? `${(parseFloat(exp.win_rate_270d!) * 100).toFixed(1)}%`
                    : "\u2014"
                }
                delta={
                  hasWinRate && bm?.win_rate_270d != null
                    ? parseFloat(exp.win_rate_270d!) - bm.win_rate_270d
                    : undefined
                }
                deltaFormat="percent"
              />
              <Stat
                label="Mean Excess"
                value={
                  hasExcess
                    ? `${(parseFloat(exp.mean_excess_270d!) * 100).toFixed(1)}%`
                    : "\u2014"
                }
                delta={
                  hasExcess && bm?.mean_excess_270d != null
                    ? parseFloat(exp.mean_excess_270d!) - bm.mean_excess_270d
                    : undefined
                }
                deltaFormat="percent"
              />
            </div>
            <Divider />
          </>
        )}

        <div className="flex gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/sandbox/${exp.id}`)}
          >
            Open
          </Button>
          {showFork && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFork(exp.id)}
            >
              Fork
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ── Main render ─────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />
        )}

        <div className="p-6 max-w-6xl">
          <PageHeader
            title="Sandbox"
            subtitle={`Experiment with scoring model parameters \u00b7 signed in as ${studentName}`}
            actions={
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    localStorage.removeItem("sof_student_name");
                    setStudentName(null);
                  }}
                  className="text-xs text-ink-tertiary underline"
                >
                  change
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/sandbox/new")}
                >
                  New Experiment
                </Button>
              </div>
            }
          />

          {/* Baseline reference */}
          {bm && (
            <div className="mb-6">
              <Card title="Live Baseline">
                <div className="flex gap-8">
                  <Stat
                    label="Sharpe (270d)"
                    value={bm.sharpe_270d?.toFixed(3) ?? "\u2014"}
                  />
                  <Stat
                    label="Win Rate (270d)"
                    value={
                      bm.win_rate_270d !== null
                        ? `${(bm.win_rate_270d * 100).toFixed(1)}%`
                        : "\u2014"
                    }
                  />
                  <Stat
                    label="Mean Excess (270d)"
                    value={
                      bm.mean_excess_270d !== null
                        ? `${(bm.mean_excess_270d * 100).toFixed(1)}%`
                        : "\u2014"
                    }
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "mine" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("mine")}
            >
              My Experiments
            </Button>
            <Button
              variant={activeTab === "team" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("team")}
            >
              Team Experiments
            </Button>
          </div>

          {/* Experiment list */}
          {activeTab === "mine" && (
            <>
              {mine.length === 0 ? (
                <EmptyState
                  title="No experiments yet"
                  subtitle="Create your first experiment to test scoring parameter changes"
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push("/sandbox/new")}
                    >
                      New Experiment
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                  {mine.map((exp) => (
                    <ExperimentCard key={exp.id} exp={exp} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "team" && (
            <>
              {team.length === 0 ? (
                <EmptyState
                  title="No team experiments"
                  subtitle="Other students' completed experiments will appear here."
                />
              ) : (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                  {team.map((exp) => (
                    <ExperimentCard key={exp.id} exp={exp} showFork />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
