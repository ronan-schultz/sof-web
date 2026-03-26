"use client";

import { useState } from "react";
import AppShell from "@/components/ui/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ScoreIndicator from "@/components/ui/ScoreIndicator";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCell from "@/components/ui/MetricCell";
import DataTable, { type Column } from "@/components/ui/DataTable";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import Stat from "@/components/ui/Stat";
import Divider from "@/components/ui/Divider";
import Button from "@/components/ui/Button";

// ── Mock Data ───────────────────────────────────────────────────────
const candidates = [
  {
    filing_id: "0001193125-24-112233",
    company_name: "Meridian Logistics Corp",
    ticker: "MLGX",
    composite_score: 0.84,
    event_type: "spinoff",
    form_type: "10-12B",
    sic_division: "Transportation",
    mcap_tag: "sub_1b_confirmed",
    scored_at: "2024-03-15",
  },
  {
    filing_id: "0001193125-24-223344",
    company_name: "Cascade Industrial Holdings",
    ticker: "CIHX",
    composite_score: 0.71,
    event_type: "spinoff",
    form_type: "10",
    sic_division: "Manufacturing",
    mcap_tag: "sub_1b_unconfirmed",
    scored_at: "2024-03-14",
  },
  {
    filing_id: "0001193125-24-334455",
    company_name: "Vantage Healthcare Partners",
    ticker: null,
    composite_score: 0.61,
    event_type: "activism",
    form_type: "SC 13D",
    sic_division: "Health Services",
    mcap_tag: "sub_1b_confirmed",
    scored_at: "2024-03-13",
  },
] as const;

type Candidate = (typeof candidates)[number];

// ── Icons ───────────────────────────────────────────────────────────
const DashboardIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x={3} y={3} width={7} height={7} rx={1} />
    <rect x={14} y={3} width={7} height={7} rx={1} />
    <rect x={3} y={14} width={7} height={7} rx={1} />
    <rect x={14} y={14} width={7} height={7} rx={1} />
  </svg>
);
const AdminIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx={12} cy={12} r={3} />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const SandboxIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 3h6M10 3v7l-5 8.5A1.5 1.5 0 006.3 21h11.4a1.5 1.5 0 001.3-2.5L14 10V3" />
  </svg>
);
const SearchIcon = (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx={11} cy={11} r={8} />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const navigation = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Admin", href: "/admin", icon: AdminIcon },
  { label: "Sandbox", href: "/sandbox", icon: SandboxIcon },
];

// ── Section wrapper ─────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="text-lg font-semibold text-ink-primary mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function DesignSystemPage() {
  const [alertVisible, setAlertVisible] = useState(true);
  const [sortKey, setSortKey] = useState("composite_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const columns: Column<Candidate>[] = [
    { key: "company_name", label: "Company", sortable: true },
    {
      key: "ticker",
      label: "Ticker",
      render: (r) => <span className="font-mono text-xs">{r.ticker ?? "—"}</span>,
    },
    {
      key: "composite_score",
      label: "Score",
      sortable: true,
      render: (r) => <ScoreIndicator score={r.composite_score} size="sm" />,
    },
    {
      key: "event_type",
      label: "Type",
      render: (r) => <StatusBadge variant={r.event_type as "spinoff" | "activism"} />,
    },
    { key: "form_type", label: "Form" },
    { key: "scored_at", label: "Scored", sortable: true },
  ];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <AppShell navigation={navigation}>
      <div className="p-6 max-w-5xl">
        <PageHeader
          title="Design System Reference"
          subtitle="Every UI primitive in every state — dev only"
        />

        {/* AlertBanner */}
        <Section title="AlertBanner">
          <div className="space-y-3">
            <AlertBanner
              variant="warning"
              message="Cascade Industrial Holdings (CIHX) score dropped to 0.71 — approaching watchlist threshold."
            />
            <AlertBanner
              variant="critical"
              message="Vantage Healthcare Partners has no ticker resolution. Manual review required."
              action={<Button variant="ghost" size="sm">Resolve</Button>}
            />
            {alertVisible && (
              <AlertBanner
                variant="warning"
                message="Dismissible alert — click X to remove."
                onDismiss={() => setAlertVisible(false)}
              />
            )}
          </div>
        </Section>

        {/* Button */}
        <Section title="Button">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="sm">Small Primary</Button>
            <Button variant="secondary" size="sm">Small Secondary</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Section>

        {/* Card */}
        <Section title="Card">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Basic Card">
              <p className="text-sm text-ink-secondary">Card with title only.</p>
            </Card>
            <Card title="With Action" action={<Button variant="ghost" size="sm">Edit</Button>}>
              <p className="text-sm text-ink-secondary">Card with action button.</p>
            </Card>
            <Card title="Top Candidate" action={<Button variant="secondary" size="sm">View Filing</Button>}>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink-primary">{candidates[0].company_name}</p>
                <p className="text-ink-secondary">{candidates[0].form_type} &middot; {candidates[0].sic_division}</p>
                <ScoreIndicator score={candidates[0].composite_score} />
              </div>
            </Card>
            <Card>
              <p className="text-sm text-ink-secondary">No title, just content.</p>
            </Card>
          </div>
        </Section>

        {/* Stat */}
        <Section title="Stat">
          <div className="flex gap-8">
            <Stat label="Candidates" value={String(candidates.length)} />
            <Stat
              label="Top Score"
              value={Math.max(...candidates.map((c) => c.composite_score)).toFixed(2)}
              delta={0.08}
              deltaFormat="decimal"
            />
            <Stat label="Hit Rate" value="68%" delta={-0.05} deltaFormat="percent" />
            <Stat label="AUM Deployed" value="$2.4M" delta={125000} deltaFormat="currency" />
          </div>
        </Section>

        {/* ScoreIndicator */}
        <Section title="ScoreIndicator">
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <ScoreIndicator score={0.92} />
              <ScoreIndicator score={0.71} />
              <ScoreIndicator score={0.45} />
              <ScoreIndicator score={0.0} />
            </div>
            <div className="flex items-center gap-6">
              <ScoreIndicator score={0.92} size="sm" />
              <ScoreIndicator score={0.71} size="sm" />
              <ScoreIndicator score={0.45} size="sm" />
            </div>
            <Divider label="Real Data" />
            <div className="space-y-2">
              {candidates.map((c) => (
                <div key={c.filing_id} className="flex items-center gap-3">
                  <ScoreIndicator score={c.composite_score} />
                  <span className="text-sm">{c.company_name}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* StatusBadge */}
        <Section title="StatusBadge">
          <div className="flex flex-wrap gap-3">
            <StatusBadge variant="spinoff" />
            <StatusBadge variant="activism" />
            <StatusBadge variant="invest" />
            <StatusBadge variant="reject" />
            <StatusBadge variant="watchlist" />
            <StatusBadge variant="confirmed" />
            <StatusBadge variant="pending" />
            <StatusBadge variant="invest" label="Custom Label" />
          </div>
        </Section>

        {/* MetricCell */}
        <Section title="MetricCell">
          <div className="space-y-3">
            <div className="flex gap-6">
              <MetricCell value={0.156} format="percent" />
              <MetricCell value={-0.042} format="percent" />
              <MetricCell value={0} format="percent" />
              <MetricCell value={null} />
            </div>
            <div className="flex gap-6">
              <MetricCell value={0.156} format="percent" showArrow />
              <MetricCell value={-0.042} format="percent" showArrow />
            </div>
            <div className="flex gap-6">
              <MetricCell value={12500000} format="currency" />
              <MetricCell value={-3200000} format="currency" />
            </div>
          </div>
        </Section>

        {/* Divider */}
        <Section title="Divider">
          <div className="space-y-6 max-w-md">
            <Divider />
            <Divider label="or" />
            <Divider label="Advanced Settings" />
          </div>
        </Section>

        {/* DataTable */}
        <Section title="DataTable">
          <Card>
            <DataTable
              columns={columns as Column<Record<string, unknown>>[]}
              data={candidates as unknown as Record<string, unknown>[]}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </Card>
        </Section>

        {/* EmptyState */}
        <Section title="EmptyState">
          <Card>
            <EmptyState
              icon={SearchIcon}
              title="No candidates found"
              subtitle="Try adjusting your filters or scoring thresholds."
              action={<Button variant="primary" size="sm">Reset Filters</Button>}
            />
          </Card>
        </Section>

        {/* PageHeader */}
        <Section title="PageHeader">
          <Card>
            <PageHeader title="Title Only" />
            <PageHeader title="With Subtitle" subtitle="Supporting description text" />
            <PageHeader
              title="With Actions"
              subtitle="47 candidates scoring above 0.50"
              actions={
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">Export</Button>
                  <Button variant="primary" size="sm">Refresh</Button>
                </div>
              }
            />
          </Card>
        </Section>
      </div>
    </AppShell>
  );
}
