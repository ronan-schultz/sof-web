"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Card,
  Button,
  AlertBanner,
} from "@/components/ui";

function NewExperimentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forkFrom = searchParams.get("fork_from");

  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("activism");
  const [description, setDescription] = useState("");
  const [forkName, setForkName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (forkFrom) {
      fetch(`/api/sandbox/experiments/${forkFrom}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.name) {
            setForkName(data.name);
            setName(`Fork of ${data.name}`);
            setStrategy(data.strategy);
          }
        })
        .catch(() => {});
    }
  }, [forkFrom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentName = localStorage.getItem("sof_student_name");
    if (!studentName) {
      router.push("/sandbox");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sandbox/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          strategy,
          created_by: studentName,
          fork_from: forkFrom ? parseInt(forkFrom, 10) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create experiment");
      }

      const data = await res.json();
      router.push(`/sandbox/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-lg mx-auto">
        <PageHeader title="New Experiment" />

        {forkName && (
          <div className="mb-4">
            <AlertBanner
              variant="warning"
              message={`Forking from: ${forkName}. Config will be copied as a starting point.`}
            />
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary"
                placeholder="e.g. High intent weight test"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary resize-none"
                placeholder="What are you testing?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Strategy
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={strategy === "spinoff" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setStrategy("spinoff")}
                >
                  Spinoff
                </Button>
                <Button
                  type="button"
                  variant={strategy === "activism" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setStrategy("activism")}
                >
                  Activism
                </Button>
              </div>
            </div>

            {error && (
              <AlertBanner variant="critical" message={error} />
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={submitting || !name.trim()}
              >
                {submitting ? "Creating..." : "Create Experiment"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => router.push("/sandbox")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function NewExperimentPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="p-6">
            <span className="text-sm text-ink-tertiary">Loading...</span>
          </div>
        </AppLayout>
      }
    >
      <NewExperimentForm />
    </Suspense>
  );
}
