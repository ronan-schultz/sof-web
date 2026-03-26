import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "../components/ui/Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    size: { control: "select", options: ["sm", "md"] },
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "View Filing", variant: "primary", size: "md" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" size="sm">Small Primary</Button>
      <Button variant="secondary" size="sm">Small Secondary</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="primary">Run Backtest</Button>
      <Button variant="secondary">Fork Experiment</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  ),
};
