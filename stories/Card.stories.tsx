import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { candidates } from "./mockData";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: "Recent Filings",
    children: <p className="text-sm text-ink-secondary">Card content goes here.</p>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-lg">
      <Card title="With Title">
        <p className="text-sm text-ink-secondary">Basic card with title.</p>
      </Card>
      <Card title="With Action" action={<Button variant="ghost" size="sm">Edit</Button>}>
        <p className="text-sm text-ink-secondary">Card with action button.</p>
      </Card>
      <Card>
        <p className="text-sm text-ink-secondary">No title, just content.</p>
      </Card>
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <Card title="Top Candidate" action={<Button variant="secondary" size="sm">View Filing</Button>}>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-ink-primary">{candidates[0].company_name}</p>
        <p className="text-ink-secondary">{candidates[0].form_type} &middot; {candidates[0].sic_division}</p>
        <p className="font-mono text-signal-high font-semibold">{candidates[0].composite_score.toFixed(2)}</p>
      </div>
    </Card>
  ),
};
