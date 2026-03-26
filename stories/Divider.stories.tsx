import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Divider from "../components/ui/Divider";

const meta: Meta<typeof Divider> = {
  title: "UI/Divider",
  component: Divider,
};
export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-ink-secondary">Content above</p>
      <Divider />
      <p className="text-sm text-ink-secondary">Content below</p>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <div>
        <p className="text-xs text-ink-tertiary mb-2">Plain divider</p>
        <Divider />
      </div>
      <div>
        <p className="text-xs text-ink-tertiary mb-2">With label</p>
        <Divider label="or" />
      </div>
      <div>
        <p className="text-xs text-ink-tertiary mb-2">Section label</p>
        <Divider label="Advanced Settings" />
      </div>
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <p className="text-sm font-medium text-ink-primary">Spinoff Candidates</p>
      <Divider label="Activism Candidates" />
      <p className="text-sm text-ink-secondary">Vantage Healthcare Partners — SC 13D</p>
    </div>
  ),
};
