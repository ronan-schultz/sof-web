import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AlertBanner from "../components/ui/AlertBanner";
import Button from "../components/ui/Button";

const meta: Meta<typeof AlertBanner> = {
  title: "UI/AlertBanner",
  component: AlertBanner,
  argTypes: {
    variant: { control: "select", options: ["warning", "critical"] },
  },
};
export default meta;
type Story = StoryObj<typeof AlertBanner>;

export const Default: Story = {
  args: {
    variant: "warning",
    message: "3 candidates scored below the 0.50 exit threshold in the last 24 hours.",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-3">
      <AlertBanner
        variant="warning"
        message="Backtest queue has 12 pending jobs. Results may be delayed."
      />
      <AlertBanner
        variant="critical"
        message="Database connection pool exhausted. Scoring pipeline halted."
        action={<Button variant="ghost" size="sm">Retry</Button>}
      />
      <AlertBanner
        variant="warning"
        message="Dismissible alert example."
        onDismiss={() => console.log("dismissed")}
      />
      <AlertBanner
        variant="critical"
        message="With action and dismiss."
        action={<Button variant="ghost" size="sm">View Logs</Button>}
        onDismiss={() => console.log("dismissed")}
      />
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
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
    </div>
  ),
};
