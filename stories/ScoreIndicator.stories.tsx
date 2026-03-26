import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import { candidates } from "./mockData";

const meta: Meta<typeof ScoreIndicator> = {
  title: "UI/ScoreIndicator",
  component: ScoreIndicator,
  argTypes: {
    score: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    size: { control: "select", options: ["sm", "md"] },
  },
};
export default meta;
type Story = StoryObj<typeof ScoreIndicator>;

export const Default: Story = {
  args: { score: 0.84 },
};

export const AllVariants: Story = {
  render: () => (
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
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <div className="space-y-3">
      {candidates.map((c) => (
        <div key={c.filing_id} className="flex items-center gap-3">
          <ScoreIndicator score={c.composite_score} />
          <span className="text-sm text-ink-primary">{c.company_name}</span>
        </div>
      ))}
    </div>
  ),
};
