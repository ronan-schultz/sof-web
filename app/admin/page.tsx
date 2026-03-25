"use client";

import { useEffect, useState, useCallback } from "react";

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
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-sm font-medium
      ${type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
      {msg}
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
    <div className="space-y-2">
      {Object.entries(draft).map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium text-gray-700 capitalize">{k.replace("_", " ")}</label>
          <input
            type="range" min={0} max={1} step={0.05} value={v}
            onChange={(e) => setDraft({ ...draft, [k]: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number" min={0} max={1} step={0.05} value={v}
            onChange={(e) => setDraft({ ...draft, [k]: parseFloat(e.target.value) || 0 })}
            className="w-20 px-2 py-1 border rounded text-sm tabular-nums text-right"
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <span className={`text-sm font-medium ${valid ? "text-green-600" : "text-red-600"}`}>
          Sum: {sum.toFixed(2)} {valid ? "" : "(must = 1.00)"}
        </span>
        <button
          disabled={!valid}
          onClick={() => onSave(draft)}
          className="ml-auto px-3 py-1 text-sm rounded bg-gray-800 text-white disabled:opacity-40 hover:bg-gray-700 transition-colors"
        >
          Save Weights
        </button>
      </div>
    </div>
  );
}

// ── Scalar Editor (number or string) ─────────────────────────────────
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
        className="w-40 px-2 py-1 border rounded text-sm tabular-nums"
      />
      <button onClick={save}
        className="px-3 py-1 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
        Save
      </button>
    </div>
  );
}

// ── Dict/Table Editor (form_type_scores, sector_scores, hold_horizons) ──
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
          <span className="w-48 text-sm text-gray-600 truncate" title={k}>{k}</span>
          <input
            value={String(v)}
            onChange={(e) => update(k, e.target.value)}
            className="w-24 px-2 py-0.5 border rounded text-sm tabular-nums text-right"
          />
        </div>
      ))}
      <button onClick={() => onSave(draft)}
        className="mt-2 px-3 py-1 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
        Save All
      </button>
    </div>
  );
}

// ── Tier Editor (ownership_tiers, activist_quality_tiers) ────────────
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
      <div className="flex gap-2 text-xs font-medium text-gray-500 uppercase">
        <span className="w-20">Max</span>
        <span className="w-20">Score</span>
      </div>
      {draft.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={t.max === null ? "" : t.max}
            placeholder="unbounded"
            onChange={(e) => update(i, "max", e.target.value)}
            className="w-20 px-2 py-0.5 border rounded text-sm tabular-nums text-right"
          />
          <input
            value={t.score}
            onChange={(e) => update(i, "score", e.target.value)}
            className="w-20 px-2 py-0.5 border rounded text-sm tabular-nums text-right"
          />
        </div>
      ))}
      <button onClick={() => onSave(draft)}
        className="mt-2 px-3 py-1 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
        Save Tiers
      </button>
    </div>
  );
}

// ── Keyword Editor (intent_keywords) ─────────────────────────────────
function KeywordEditor({ row, onSave }: { row: ConfigRow; onSave: (v: unknown) => Promise<void> }) {
  const keywords = row.value as { phrase: string; category: string; score: number }[];
  const [draft, setDraft] = useState([...keywords]);

  const update = (i: number, field: string, val: string) => {
    const next = [...draft];
    if (field === "score") {
      next[i] = { ...next[i], score: Number(val) };
    } else {
      next[i] = { ...next[i], [field]: val };
    }
    setDraft(next);
  };

  const addRow = () => setDraft([...draft, { phrase: "", category: "passive", score: 0.1 }]);
  const deleteRow = (i: number) => setDraft(draft.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1">
      <div className="flex gap-2 text-xs font-medium text-gray-500 uppercase">
        <span className="w-64">Phrase</span>
        <span className="w-24">Category</span>
        <span className="w-16">Score</span>
      </div>
      {draft.map((kw, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={kw.phrase}
            onChange={(e) => update(i, "phrase", e.target.value)}
            className="w-64 px-2 py-0.5 border rounded text-sm"
          />
          <select
            value={kw.category}
            onChange={(e) => update(i, "category", e.target.value)}
            className="w-24 px-1 py-0.5 border rounded text-sm"
          >
            <option value="passive">passive</option>
            <option value="active">active</option>
            <option value="control">control</option>
          </select>
          <input
            value={kw.score}
            onChange={(e) => update(i, "score", e.target.value)}
            className="w-16 px-2 py-0.5 border rounded text-sm tabular-nums text-right"
          />
          <button onClick={() => deleteRow(i)} className="text-red-500 text-sm hover:text-red-700 px-1">
            x
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={addRow}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 transition-colors">
          + Add Keyword
        </button>
        <button onClick={() => onSave(draft)}
          className="px-3 py-1 text-sm rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">
          Save Keywords
        </button>
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
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium text-gray-900">{row.label || row.key}</h3>
        <span className="text-xs text-gray-400 font-mono">{row.category}</span>
      </div>
      {row.description && <p className="text-xs text-gray-500 mb-3">{row.description}</p>}
      {editor}
      <p className="text-xs text-gray-400 mt-2">
        Last updated: {row.updated_at} by {row.updated_by}
      </p>
    </div>
  );
}

// ── Audit Log ────────────────────────────────────────────────────────
function AuditLog({ strategy }: { strategy: Strategy | null }) {
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    const url = strategy ? `/api/config/audit?strategy=${strategy}&limit=20` : `/api/config/audit?limit=20`;
    fetch(url).then(r => r.json()).then(d => setRows(d.audit || [])).catch(() => {});
  }, [strategy]);

  if (rows.length === 0) return <p className="text-sm text-gray-400">No changes recorded yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">Old</th>
            <th className="px-3 py-2 font-medium">New</th>
            <th className="px-3 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.changed_at}</td>
              <td className="px-3 py-1.5 font-mono">{r.key}</td>
              <td className="px-3 py-1.5 max-w-48 truncate" title={JSON.stringify(r.old_value)}>
                {JSON.stringify(r.old_value)?.slice(0, 60)}
              </td>
              <td className="px-3 py-1.5 max-w-48 truncate" title={JSON.stringify(r.new_value)}>
                {JSON.stringify(r.new_value)?.slice(0, 60)}
              </td>
              <td className="px-3 py-1.5">{r.changed_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    } catch { setConfig([]); }
  }, []);

  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch(`/api/config?strategy=global`);
      const data = await res.json();
      setGlobalConfig(data.config || []);
    } catch { setGlobalConfig([]); }
  }, []);

  useEffect(() => { fetchConfig(tab); }, [tab, fetchConfig]);
  useEffect(() => { fetchGlobal(); }, [fetchGlobal]);

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
    } catch (err) {
      setToast({ msg: "Network error", type: "err" });
    }
  };

  const tabs: { key: Strategy; label: string }[] = [
    { key: "spinoff", label: "Spinoff Model" },
    { key: "activism", label: "Activism Model" },
  ];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors
              ${tab === t.key
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Global config (always shown) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Global Settings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {globalConfig.map((row) => (
            <ConfigCard
              key={row.key}
              row={row}
              onSave={(v) => saveValue("global", row.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Strategy-specific config */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tab === "spinoff" ? "Spinoff" : "Activism"} Model Configuration
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {config.map((row) => (
            <ConfigCard
              key={row.key}
              row={row}
              onSave={(v) => saveValue(tab, row.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Change Log</h2>
        <AuditLog key={auditKey} strategy={tab === "spinoff" || tab === "activism" ? tab : null} />
      </div>
    </div>
  );
}
