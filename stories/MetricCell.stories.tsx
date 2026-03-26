import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MetricCell from "../components/ui/MetricCell";

const meta: Meta<typeof MetricCell> = {
  title: "UI/MetricCell",
  component: MetricCell,
  argTypes: {
    format: { control: "select", options: ["percent", "decimal", "currency"] },
    showArrow: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof MetricCell>;

export const Default: Story = {
  args: { value: 0.156, format: "percent" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-6">
        <MetricCell value={0.156} format="percent" />
        <MetricCell value={-0.042} format="percent" />
        <MetricCell value={0} format="percent" />
        <MetricCell value={null} />
      </div>
      <div className="flex gap-6">
        <MetricCell value={0.156} format="percent" showArrow />
        <MetricCell value={-0.042} format="percent" showArrow />
      </div>
      <div className="flex gap-6">
        <MetricCell value={12500000} format="currency" />
        <MetricCell value={-3200000} format="currency" />
      </div>
      <div className="flex gap-6">
        <MetricCell value={1.34} format="decimal" />
        <MetricCell value={-0.82} format="decimal" />
      </div>
    </div>
  ),
};

export const RealData: Story = {
  render: () => (
    <table className="text-sm">
      <thead>
        <tr className="text-ink-tertiary text-xs uppercase">
          <th className="pr-6 text-left">Candidate</th>
          <th className="pr-6 text-right">6mo Return</th>
          <th className="text-right">12mo Return</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="pr-6 py-1">Meridian Logistics Corp</td>
          <td className="pr-6 text-right"><MetricCell value={0.23} format="percent" showArrow /></td>
          <td className="text-right"><MetricCell value={0.41} format="percent" showArrow /></td>
        </tr>
        <tr>
          <td className="pr-6 py-1">Cascade Industrial Holdings</td>
          <td className="pr-6 text-right"><MetricCell value={-0.08} format="percent" showArrow /></td>
          <td className="text-right"><MetricCell value={0.12} format="percent" showArrow /></td>
        </tr>
        <tr>
          <td className="pr-6 py-1">Vantage Healthcare Partners</td>
          <td className="pr-6 text-right"><MetricCell value={null} /></td>
          <td className="text-right"><MetricCell value={null} /></td>
        </tr>
      </tbody>
    </table>
  ),
};
