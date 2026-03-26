import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Stat from "../components/ui/Stat";
import { candidates } from "./mockData";

const meta: Meta<typeof Stat> = {
  title: "UI/Stat",
  component: Stat,
};
export default meta;
type Story = StoryObj<typeof Stat>;

export const Default: Story = {
  args: {
    label: "Total Candidates",
    value: "47",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-8">
      <Stat label="Total Candidates" value="47" />
      <Stat label="Avg Score" value="0.72" delta={0.03} deltaFormat="decimal" />
      <Stat label="Hit Rate" value="68%" delta={-0.05} deltaFormat="percent" />
      <Stat label="AUM Deployed" value="$2.4M" delta={125000} deltaFormat="currency" />
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <div className="flex gap-8">
      <Stat label="Candidates" value={String(candidates.length)} />
      <Stat
        label="Top Score"
        value={Math.max(...candidates.map((c) => c.composite_score)).toFixed(2)}
        delta={0.08}
        deltaFormat="decimal"
      />
      <Stat
        label="Avg Score"
        value={(candidates.reduce((s, c) => s + c.composite_score, 0) / candidates.length).toFixed(2)}
      />
    </div>
  ),
};
