import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DataTable, { type Column } from "../components/ui/DataTable";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import StatusBadge from "../components/ui/StatusBadge";
import { candidates } from "./mockData";

type Candidate = (typeof candidates)[number];

const meta: Meta<typeof DataTable> = {
  title: "UI/DataTable",
  component: DataTable,
};
export default meta;
type Story = StoryObj<typeof DataTable>;

const columns: Column<Candidate>[] = [
  { key: "company_name", label: "Company", sortable: true },
  { key: "ticker", label: "Ticker", render: (r) => <span className="font-mono text-xs">{r.ticker ?? "—"}</span> },
  { key: "composite_score", label: "Score", sortable: true, render: (r) => <ScoreIndicator score={r.composite_score} size="sm" /> },
  { key: "event_type", label: "Type", render: (r) => <StatusBadge variant={r.event_type as "spinoff" | "activism"} /> },
  { key: "form_type", label: "Form" },
  { key: "scored_at", label: "Scored", sortable: true },
];

export const Default: Story = {
  args: {
    columns: columns as Column<Record<string, unknown>>[],
    data: candidates as unknown as Record<string, unknown>[],
    sorts: [{ key: "composite_score", dir: "desc" }],
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-ink-tertiary mb-2 uppercase tracking-wider">Sorted by score (desc)</p>
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={candidates as unknown as Record<string, unknown>[]}
          sorts={[{ key: "composite_score", dir: "desc" }]}
        />
      </div>
      <div>
        <p className="text-xs text-ink-tertiary mb-2 uppercase tracking-wider">Sorted by company (asc)</p>
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={candidates as unknown as Record<string, unknown>[]}
          sorts={[{ key: "company_name", dir: "asc" }]}
        />
      </div>
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <DataTable
      columns={columns as Column<Record<string, unknown>>[]}
      data={candidates as unknown as Record<string, unknown>[]}
      sorts={[{ key: "composite_score", dir: "desc" }]}
      onSort={(key) => console.log("Sort:", key)}
    />
  ),
};
