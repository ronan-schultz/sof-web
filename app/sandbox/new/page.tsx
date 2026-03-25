"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="max-w-lg mx-auto mt-8">
      <h2 className="text-lg font-semibold mb-4">New Experiment</h2>

      {forkName && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700 mb-4">
          Forking from: <span className="font-medium">{forkName}</span>. Config will be copied as a starting point.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="e.g. High intent weight test"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="activism">Activism (SC 13D)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="What are you testing?"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {submitting ? "Creating..." : "Create experiment"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/sandbox")}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewExperimentPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500 mt-8">Loading...</div>}>
      <NewExperimentForm />
    </Suspense>
  );
}
