import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StatusBadge from "../components/ui/StatusBadge";
import { candidates } from "./mockData";

const meta: Meta<typeof StatusBadge> = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  argTypes: {
    variant: {
      control: "select",
      options: ["spinoff", "activism", "invest", "reject", "watchlist", "confirmed", "pending"],
    },
  },
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {
  args: { variant: "spinoff" },
};

export const AllVariants: Story = {
  render: () => (
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
  ),
};

export const RealData: Story = {
  render: () => (
    <div className="space-y-2">
      {candidates.map((c) => (
        <div key={c.filing_id} className="flex items-center gap-3">
          <StatusBadge variant={c.event_type as "spinoff" | "activism"} />
          <span className="text-sm">{c.company_name}</span>
        </div>
      ))}
    </div>
  ),
};
