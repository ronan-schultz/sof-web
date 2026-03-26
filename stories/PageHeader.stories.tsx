import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";

const meta: Meta<typeof PageHeader> = {
  title: "UI/PageHeader",
  component: PageHeader,
};
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: "Dashboard",
    subtitle: "Scored candidates from EDGAR filings",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <PageHeader title="Dashboard" />
      <PageHeader title="Dashboard" subtitle="Scored candidates from EDGAR filings" />
      <PageHeader
        title="Sandbox"
        subtitle="Experiment with scoring parameters"
        actions={<Button variant="primary" size="sm">New Experiment</Button>}
      />
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <PageHeader
      title="Candidates"
      subtitle="47 candidates scoring above 0.50 threshold"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Export CSV</Button>
          <Button variant="primary" size="sm">Refresh</Button>
        </div>
      }
    />
  ),
};
