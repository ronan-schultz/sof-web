import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

const meta: Meta<typeof EmptyState> = {
  title: "UI/EmptyState",
  component: EmptyState,
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

const SearchIcon = (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx={11} cy={11} r={8} />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const FlaskIcon = (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 3h6M10 3v7l-5 8.5A1.5 1.5 0 006.3 21h11.4a1.5 1.5 0 001.3-2.5L14 10V3" />
  </svg>
);

export const Default: Story = {
  args: {
    icon: SearchIcon,
    title: "No candidates found",
    subtitle: "Try adjusting your filters or scoring thresholds.",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <EmptyState
        icon={SearchIcon}
        title="No candidates found"
        subtitle="Try adjusting your filters or scoring thresholds."
      />
      <EmptyState
        icon={FlaskIcon}
        title="No experiments yet"
        subtitle="Create your first experiment to start backtesting."
        action={<Button variant="primary" size="sm">New Experiment</Button>}
      />
      <EmptyState
        title="No results"
      />
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <EmptyState
      icon={FlaskIcon}
      title="No backtest results"
      subtitle="Run a backtest on this experiment to see performance metrics."
      action={<Button variant="primary">Run Backtest</Button>}
    />
  ),
};
