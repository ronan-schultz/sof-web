"use client";

import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/app/components/AppLayout";
import {
  PageHeader,
  Card,
  Button,
  AlertBanner,
  StatusBadge,
  Divider,
  EmptyState,
} from "@/components/ui";

// ── Types ────────────────────────────────────────────────────────────
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

interface AuditRow {
  id: number;
  strategy: string;
  key: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
  changed_by: string | null;
}

type Strategy = "spinoff" | "activism" | "global";

// ── Toast ────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-4 right-4 z-50">
      <AlertBanner
        variant={type === "ok" ? "warning" : "critical"}
        message={msg}
        onDismiss={onClose}
      />
    </div>
  );
}

// ── Weight Editor ────────────────────────────────────────────────────
function WeightEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const weights = row.value as Record<string, number>;
  const [draft, setDraft] = useState<Record<string, number>>({ ...weights });
  const sum = Object.values(draft).reduce((a, b) => a + b, 0);
  const valid = Math.abs(sum - 1.0) < 0.001;

  return (
    <div className="space-y-3">
      {Object.entries(draft).map(([k, v]) => (
        <Card key={k}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-secondary capitalize">
              {k.replace("_", " ")}
            </span>
            <span className="font-mono text-sm text-ink-primary">{v.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={v}
            onChange={(e) => setDraft({ ...draft, [k]: parseFloat(e.target.value) })}
            className="w-full"
          />
        </Card>
      ))}
      {!valid && (
        <AlertBanner
          variant="critical"
          message={`Weights must sum to 1.0 \u2014 current sum: ${sum.toFixed(2)}`}
        />
      )}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" size="sm" disabled={!valid} onClick={() => onSave(draft)}>
          Save Weights
        </Button>
      </div>
    </div>
  );
}

// ── Scalar Editor ─────────────────────────────────────────────────────
function ScalarEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const [draft, setDraft] = useState(String(row.value));
  const save = () => {
    const num = Number(draft);
    onSave(isNaN(num) ? draft : num);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-40 px-2 py-1 rounded-md text-sm font-mono tabular-nums bg-surface-sunken text-ink-primary"
      />
      <Button variant="secondary" size="sm" onClick={save}>
        Save
      </Button>
    </div>
  );
}

// ── Dict Editor ──────────────────────────────────────────────────────
function DictEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const obj = row.value as Record<string, number | string>;
  const [draft, setDraft] = useState<Record<string, number | string>>({ ...obj });

  const update = (k: string, v: string) => {
    const num = Number(v);
    setDraft({ ...draft, [k]: isNaN(num) ? v : num });
  };

  return (
    <div className="space-y-1">
      {Object.entries(draft).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-48 text-sm text-ink-secondary truncate" title={k}>{k}</span>
          <input
            value={String(v)}
            onChange={(e) => update(k, e.target.value)}
            className="w-24 px-2 py-0.5 rounded-md text-sm font-mono tabular-nums text-right bg-surface-sunken text-ink-primary"
          />
        </div>
      ))}
      <div className="pt-2">
        <Button variant="secondary" size="sm" onClick={() => onSave(draft)}>
          Save All
        </Button>
      </div>
    </div>
  );
}

// ── Tier Editor ──────────────────────────────────────────────────────
function TierEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const tiers = row.value as { max: number | null; score: number }[];
  const [draft, setDraft] = useState([...tiers]);

  const update = (i: number, field: "max" | "score", val: string) => {
    const next = [...draft];
    if (field === "max") {
      next[i] = { ...next[i], max: val === "" ? null : Number(val) };
    } else {
      next[i] = { ...next[i], score: Number(val) };
    }
    setDraft(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2 text-xs font-medium text-ink-tertiary uppercase tracking-wider">
        <span className="w-20">Max</span>
        <span className="w-20">Score</span>
      </div>
      {draft.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={t.max === null ? "" : t.max}
            placeholder="unbounded"
            onChange={(e) => update(i, "max", e.target.value)}
            className="w-20 px-2 py-0.5 rounded-md text-sm font-mono tabular-nums text-right bg-surface-sunken text-ink-primary"
          />
          <input
            value={t.score}
            onChange={(e) => update(i, "score", e.target.value)}
            className="w-20 px-2 py-0.5 rounded-md text-sm font-mono tabular-nums text-right bg-surface-sunken text-ink-primary"
          />
        </div>
      ))}
      <div className="pt-2">
        <Button variant="secondary" size="sm" onClick={() => onSave(draft)}>
          Save Tiers
        </Button>
      </div>
    </div>
  );
}

// ── Keyword Editor ───────────────────────────────────────────────────
function KeywordEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const keywords = row.value as { phrase: string; category: string; score: number }[];
  const [draft, setDraft] = useState([...keywords]);
  const [newPhrase, setNewPhrase] = useState("");
  const [newCategory, setNewCategory] = useState("passive");

  const addRow = () => {
    if (!newPhrase.trim()) return;
    setDraft([...draft, { phrase: newPhrase.trim(), category: newCategory, score: 0.1 }]);
    setNewPhrase("");
  };

  const deleteRow = (i: number) => setDraft(draft.filter((_, idx) => idx !== i));

  const categoryVariant = (cat: string): "spinoff" | "activism" | "pending" => {
    if (cat === "active") return "activism";
    if (cat === "control") return "spinoff";
    return "pending";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {draft.map((kw, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <StatusBadge variant={categoryVariant(kw.category)} label={kw.phrase} />
            <button
              onClick={() => deleteRow(i)}
              className="text-ink-tertiary hover:text-ink-primary text-xs"
              aria-label={`Remove ${kw.phrase}`}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newPhrase}
          onChange={(e) => setNewPhrase(e.target.value)}
          placeholder="New keyword..."
          className="flex-1 px-2 py-1 rounded-md text-sm bg-surface-sunken text-ink-primary"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="px-2 py-1 rounded-md text-sm bg-surface-sunken text-ink-primary"
        >
          <option value="passive">passive</option>
          <option value="active">active</option>
          <option value="control">control</option>
        </select>
        <Button variant="secondary" size="sm" onClick={addRow}>
          Add
        </Button>
      </div>
      <div className="pt-1">
        <Button variant="primary" size="sm" onClick={() => onSave(draft)}>
          Save Keywords
        </Button>
      </div>
    </div>
  );
}

// ── Config Card ──────────────────────────────────────────────────────
function ConfigCard({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const val = row.value;
  const isWeight = row.category === "weight";
  const isKeyword = row.key === "intent_keywords";
  const isTier = row.key.endsWith("_tiers");
  const isDict = typeof val === "object" && val !== null && !Array.isArray(val);
  const isArray = Array.isArray(val);

  let editor;
  if (isWeight && isDict) {
    editor = <WeightEditor row={row} onSave={onSave} />;
  } else if (isKeyword && isArray) {
    editor = <KeywordEditor row={row} onSave={onSave} />;
  } else if (isTier && isArray) {
    editor = <TierEditor row={row} onSave={onSave} />;
  } else if (isDict) {
    editor = <DictEditor row={row} onSave={onSave} />;
  } else {
    editor = <ScalarEditor row={row} onSave={onSave} />;
  }

  return (
    <Card
      title={row.label || row.key}
      action={
        <span className="text-xs text-ink-tertiary font-mono">{row.category}</span>
      }
    >
      {row.description && (
        <p className="text-xs text-ink-tertiary mb-3">{row.description}</p>
      )}
      {editor}
      <p className="text-xs text-ink-tertiary mt-3">
        Last updated: {row.updated_at} by {row.updated_by}
      </p>
    </Card>
  );
}

// ── Audit Log ────────────────────────────────────────────────────────
function AuditLog({ strategy }: { strategy: Strategy | null }) {
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    const url = strategy
      ? `/api/config/audit?strategy=${strategy}&limit=20`
      : `/api/config/audit?limit=20`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setRows(d.audit || []))
      .catch(() => {});
  }, [strategy]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No changes recorded"
        subtitle="Audit entries will appear here after config updates."
      />
    );
  }

  return (
    <div className="space-y-0">
      {rows.map((r, i) => (
        <div key={r.id}>
          {i > 0 && <Divider />}
          <div className="py-3">
            <span className="text-xs text-ink-tertiary font-mono block">
              {r.changed_at}
            </span>
            <span className="text-sm text-ink-primary font-medium">
              {r.key}
            </span>
            <span className="block text-xs text-ink-secondary font-mono">
              {JSON.stringify(r.old_value)?.slice(0, 60)} {"\u2192"}{" "}
              {JSON.stringify(r.new_value)?.slice(0, 60)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Strategy>("spinoff");
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [globalConfig, setGlobalConfig] = useState<ConfigRow[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [auditKey, setAuditKey] = useState(0);

  const fetchConfig = useCallback(async (strategy: Strategy) => {
    try {
      const res = await fetch(`/api/config?strategy=${strategy}`);
      const data = await res.json();
      setConfig(data.config || []);
    } catch {
      setConfig([]);
    }
  }, []);

  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch(`/api/config?strategy=global`);
      const data = await res.json();
      setGlobalConfig(data.config || []);
    } catch {
      setGlobalConfig([]);
    }
  }, []);

  useEffect(() => {
    fetchConfig(tab);
  }, [tab, fetchConfig]);
  useEffect(() => {
    fetchGlobal();
  }, [fetchGlobal]);

  const saveValue = async (strategy: string, key: string, value: unknown) => {
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, key, value, changed_by: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ msg: data.error || "Save failed", type: "err" });
        return;
      }
      setToast({ msg: `Saved ${key}`, type: "ok" });
      fetchConfig(tab);
      fetchGlobal();
      setAuditKey((k) => k + 1);
    } catch {
      setToast({ msg: "Network error", type: "err" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl">
        {toast && (
          <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}

        <PageHeader
          title="Configuration"
          subtitle="Scoring model parameters"
        />

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 360px" }}>
          {/* Left column — Parameter editor */}
          <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex gap-2">
              <Button
                variant={tab === "spinoff" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("spinoff")}
              >
                Spinoff
              </Button>
              <Button
                variant={tab === "activism" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("activism")}
              >
                Activism
              </Button>
            </div>

            {/* Global config */}
            {globalConfig.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Global Settings
                </h2>
                <div className="grid gap-4 grid-cols-2">
                  {globalConfig.map((row) => (
                    <ConfigCard
                      key={row.key}
                      row={row}
                      onSave={(v) => saveValue("global", row.key, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            <Divider label={`${tab === "spinoff" ? "Spinoff" : "Activism"} Model`} />

            {/* Strategy-specific config */}
            <div className="grid gap-4 grid-cols-2">
              {config.map((row) => (
                <ConfigCard
                  key={row.key}
                  row={row}
                  onSave={(v) => saveValue(tab, row.key, v)}
                />
              ))}
            </div>
          </div>

          {/* Right column — Audit log */}
          <Card title="Recent Changes">
            <AuditLog key={auditKey} strategy={tab === "spinoff" || tab === "activism" ? tab : null} />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
