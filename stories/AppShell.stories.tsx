import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AppShell from "../components/ui/AppShell";
import Card from "../components/ui/Card";

const meta: Meta<typeof AppShell> = {
  title: "UI/AppShell",
  component: AppShell,
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;
type Story = StoryObj<typeof AppShell>;

const DashboardIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x={3} y={3} width={7} height={7} rx={1} />
    <rect x={14} y={3} width={7} height={7} rx={1} />
    <rect x={3} y={14} width={7} height={7} rx={1} />
    <rect x={14} y={14} width={7} height={7} rx={1} />
  </svg>
);

const AdminIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

const SandboxIcon = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 3h6M10 3v7l-5 8.5A1.5 1.5 0 006.3 21h11.4a1.5 1.5 0 001.3-2.5L14 10V3" />
  </svg>
);

const navigation = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Admin", href: "/admin", icon: AdminIcon },
  { label: "Sandbox", href: "/sandbox", icon: SandboxIcon },
];

export const Default: Story = {
  args: {
    navigation,
    children: (
      <div className="p-6">
        <Card title="Welcome">
          <p className="text-sm text-ink-secondary">AppShell with sidebar navigation.</p>
        </Card>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <AppShell navigation={navigation}>
      <div className="p-6 space-y-4">
        <Card title="Main Content Area">
          <p className="text-sm text-ink-secondary">This is the main content area with sidebar nav.</p>
        </Card>
        <Card title="Second Card">
          <p className="text-sm text-ink-secondary">Multiple cards in the content area.</p>
        </Card>
      </div>
    </AppShell>
  ),
};

export const RealData: Story = {
  render: () => (
    <AppShell navigation={navigation}>
      <div className="p-6">
        <Card title="3 Active Candidates">
          <p className="text-sm text-ink-secondary">Meridian Logistics Corp, Cascade Industrial Holdings, Vantage Healthcare Partners</p>
        </Card>
      </div>
    </AppShell>
  ),
};
