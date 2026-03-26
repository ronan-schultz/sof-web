# SOF Frontend — Design System & Architecture

## Design Tokens

All tokens are defined via `@theme` directives in `app/globals.css` and consumed as Tailwind utility classes (e.g., `bg-surface-base`, `text-ink-primary`).

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-base` | `#FAFAFA` | Page background |
| `surface-elevated` | `#FFFFFF` | Cards, elevated panels |
| `surface-sunken` | `#F4F4F5` | Input backgrounds, hover states, dividers |
| `ink-primary` | `#09090B` | Primary text, headings |
| `ink-secondary` | `#52525B` | Secondary text, descriptions |
| `ink-tertiary` | `#A1A1AA` | Labels, timestamps, placeholders |
| `ink-disabled` | `#D4D4D8` | Disabled text, empty state icons |
| `accent-default` | `#18181B` | Primary buttons, active elements |
| `signal-high` | `#16A34A` | Positive values, success, invest |
| `signal-mid` | `#D97706` | Warning, caution, loading bars |
| `signal-low` | `#DC2626` | Critical errors, negative values |
| `signal-neutral` | `#71717A` | Neutral status |

### Typography

Fonts: **Geist** (sans), **Geist Mono** (mono). Loaded via `geist/font/sans` and `geist/font/mono`.

| Scale | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `text-xs` | 11px | 16px | +0.02em | Labels, badges, timestamps |
| `text-sm` | 13px | 20px | — | Body text, descriptions, buttons |
| `text-base` | 15px | 24px | — | Primary body text |
| `text-lg` | 18px | 28px | -0.01em | Section headings |
| `text-xl` | 24px | 32px | -0.02em | Stat values |
| `text-2xl` | 32px | 40px | -0.03em | Page titles |

Numeric data always uses `font-mono tabular-nums` for alignment.

### Spacing

4px-based grid. Use Tailwind spacing utilities (`p-6` = 24px, `gap-4` = 16px, etc.).

| Token | Value |
|-------|-------|
| `spacing-1` | 4px |
| `spacing-2` | 8px |
| `spacing-3` | 12px |
| `spacing-4` | 16px |
| `spacing-6` | 24px |
| `spacing-8` | 32px |
| `spacing-12` | 48px |
| `spacing-16` | 64px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 6px | Small elements |
| `rounded-md` | 10px | Buttons, badges, inputs |
| `rounded-lg` | 16px | Cards |
| `rounded-xl` | 24px | Large containers |

### Shadows (Elevation)

| Token | Usage |
|-------|-------|
| `shadow-sm` | Cards, sidebar |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, overlays |

### Transitions

| Class | Duration | Usage |
|-------|----------|-------|
| `transition-fast` | 150ms ease-out | Hover states, button interactions |
| `transition-default` | 200ms ease-out | General transitions |
| `transition-slow` | 300ms ease-out | Panel animations |

---

## Component Catalog

All components live in `components/ui/` and are exported from `components/ui/index.ts`. Import via `@/components/ui`.

### AppShell

Layout container with sidebar navigation and main content area.

```ts
interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface AppShellProps {
  children: ReactNode;
  navigation: NavItem[];
}
```

- Sidebar: `w-60` (240px), `bg-surface-sunken`, `shadow-sm`
- Active route detection via `usePathname()` — exact match or prefix match
- Nav items: `text-sm font-medium`, active = `bg-ink-primary/6`, inactive = `text-ink-secondary`
- Logo: "SOF" in `font-mono text-xl font-semibold`
- Main content: `flex-1 bg-surface-base overflow-y-auto`

```jsx
<AppShell navigation={[{ label: "Dashboard", href: "/", icon: <LayoutGrid size={20} /> }]}>
  {children}
</AppShell>
```

### PageHeader

Page-level header with title, optional subtitle, and action slot.

```ts
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
```

- Title: `text-2xl font-semibold tracking-tight text-ink-primary`
- Subtitle: `text-sm text-ink-secondary`
- Bottom border via inset shadow
- Actions right-aligned

```jsx
<PageHeader title="Candidates" subtitle="Sub-$1B universe" actions={<Button size="sm">Refresh</Button>} />
```

### Card

Elevated container for content grouping.

```ts
interface CardProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
}
```

- Background: `bg-surface-elevated`, `shadow-sm`, `rounded-lg`, `p-6`
- Optional header row with title (`text-sm font-semibold`) and action slot

```jsx
<Card title="Parameters" action={<Button variant="ghost" size="sm">Edit</Button>}>
  {content}
</Card>
```

### Button

Primary interactive element.

```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  icon?: ReactNode;
  children: ReactNode;
}
```

| Variant | Background | Text | Hover |
|---------|-----------|------|-------|
| `primary` | `accent-default` | white | `ink-secondary` |
| `secondary` | `surface-sunken` | `ink-primary` | `ink-disabled/30` |
| `ghost` | transparent | `ink-secondary` | `surface-sunken` |

| Size | Padding | Text |
|------|---------|------|
| `sm` | `px-3 py-1.5` | `text-xs` |
| `md` | `px-4 py-2` | `text-sm` |

- Disabled: `opacity-40`
- Icon slot: `w-4 h-4` before children
- Border radius: `rounded-md`

```jsx
<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={fn}>Refresh</Button>
```

### AlertBanner

Full-width status message bar.

```ts
interface AlertBannerProps {
  variant: "warning" | "critical";
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
}
```

| Variant | Background | Text |
|---------|-----------|------|
| `warning` | `signal-mid/8` | `signal-mid` |
| `critical` | `signal-low/8` | `signal-low` |

- Layout: flex row with icon, message, optional action, optional dismiss X
- Icon: SVG warning triangle or circle

```jsx
<AlertBanner variant="warning" message="3 candidates pending review" onDismiss={() => setDismissed(true)} />
```

### StatusBadge

Inline status indicator pill.

```ts
type BadgeVariant = "spinoff" | "activism" | "invest" | "reject" | "watchlist" | "confirmed" | "pending";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;  // overrides default label
}
```

| Variant | Background | Text | Default Label |
|---------|-----------|------|---------------|
| `spinoff` | `surface-sunken` | `ink-secondary` | "Spinoff" |
| `activism` | `ink-primary/8` | `ink-primary` | "Activism" |
| `invest` | `signal-high/10` | `signal-high` | "Invest" |
| `reject` | `signal-low/8` | `signal-low` | "Reject" |
| `watchlist` | `signal-mid/10` | `signal-mid` | "Watchlist" |
| `confirmed` | `signal-high/10` | `signal-high` | "Confirmed" |
| `pending` | `surface-sunken` | `ink-tertiary` | "Pending" |

```jsx
<StatusBadge variant="activism" />
<StatusBadge variant="invest" label="Custom Label" />
```

### ScoreIndicator

Circular progress ring with numeric score.

```ts
interface ScoreIndicatorProps {
  score: number;   // 0–1
  size?: "sm" | "md";
}
```

| Size | Diameter | Stroke |
|------|----------|--------|
| `sm` | 24px | 2.5px |
| `md` | 32px | 3px |

Score thresholds determine color:
- `>= 0.75` → `signal-high` (green)
- `>= 0.50` → `signal-mid` (amber)
- `< 0.50` → `signal-low` (red)

```jsx
<ScoreIndicator score={0.84} size="sm" />
```

### MetricCell

Formatted numeric value with directional coloring.

```ts
interface MetricCellProps {
  value: number | null;
  format?: "percent" | "decimal" | "currency";
  showArrow?: boolean;
}
```

- `percent`: `(value * 100).toFixed(1)%`, prepends `+` for positive
- `decimal`: `value.toFixed(2)`
- `currency`: USD format, no decimals
- Null renders em-dash
- Positive: `signal-high`, negative: `signal-low`, zero/null: `ink-tertiary`
- Optional directional arrow SVG

```jsx
<MetricCell value={0.156} format="percent" showArrow />
```

### Stat

Labeled metric display for dashboards.

```ts
interface StatProps {
  label: string;
  value: string;
  delta?: number;
  deltaFormat?: "percent" | "decimal" | "currency";
}
```

- Label: `text-xs text-ink-tertiary font-medium uppercase tracking-wider`
- Value: `text-xl font-semibold text-ink-primary font-mono tabular-nums`
- Delta: rendered via MetricCell with `showArrow`

```jsx
<Stat label="Sharpe (270d)" value="0.847" delta={0.12} deltaFormat="decimal" />
```

### DataTable

Generic sortable data table.

```ts
interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}
```

- Header: `bg-surface-elevated`, sticky, `text-xs uppercase tracking-wider text-ink-tertiary`
- Rows: `hover:bg-surface-sunken`, `border-b border-surface-sunken`
- Sort chevron: bi-directional arrow (inactive) or single arrow (active)
- Generic `T extends Record<string, unknown>` — use type casting when passing typed data

```jsx
<DataTable columns={columns} data={rows} sortKey="score" sortDir="desc" onSort={handleSort} />
```

### Divider

Horizontal separator, optionally labeled.

```ts
interface DividerProps {
  label?: string;
}
```

- No label: simple `h-px bg-surface-sunken`
- With label: centered text (`text-xs text-ink-tertiary`) between two lines

```jsx
<Divider />
<Divider label="Advanced Settings" />
```

### EmptyState

Centered placeholder for empty data views.

```ts
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}
```

- Centered column layout with `py-16 px-6`
- Icon: `text-ink-disabled`
- Title: `text-base text-ink-secondary font-medium`
- Subtitle: `text-sm text-ink-tertiary`

```jsx
<EmptyState title="No candidates" subtitle="The screening model hasn't surfaced any qualifying names yet." />
```

---

## Layout Architecture

### AppLayout (`app/components/AppLayout.tsx`)

Shared wrapper that all pages import. Wraps AppShell with the standard 5-item nav:

| Label | Route | Icon (lucide-react) |
|-------|-------|---------------------|
| Dashboard | `/` | `LayoutGrid` |
| Portfolio | `/portfolio` | `Briefcase` |
| Analytics | `/analytics` | `BarChart2` |
| Sandbox | `/sandbox` | `FlaskConical` |
| Admin | `/admin` | `Settings` |

### Route Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | Candidates dashboard | Scored candidates table, stats, SLA alerts |
| `/admin` | Configuration | Weight sliders, keyword editor, audit log |
| `/analytics` | Analytics | Natural language SQL queries |
| `/sandbox` | Experiment list | My/Team experiments with metrics |
| `/sandbox/new` | Create experiment | Name, strategy, fork-from form |
| `/sandbox/[id]` | Experiment workspace | Parameter sliders + backtest results |
| `/design-system` | Reference | All components in every state (dev only) |

### Page Structure Pattern

Every page follows this structure:

```jsx
<AppLayout>
  <div className="relative">
    {loading && <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />}
    <div className="p-6 max-w-{size}">
      <PageHeader title="..." subtitle="..." actions={...} />
      {/* page content */}
    </div>
  </div>
</AppLayout>
```

---

## UI Patterns

### Loading State

1px full-width bar at top of content area, not a spinner:
```jsx
{loading && <div className="absolute top-0 left-0 right-0 h-px bg-signal-mid animate-pulse" />}
```

### Tabs

Button group pattern — `secondary` for active, `ghost` for inactive:
```jsx
<div className="flex gap-2">
  <Button variant={tab === "a" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("a")}>Tab A</Button>
  <Button variant={tab === "b" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("b")}>Tab B</Button>
</div>
```

### Form Inputs

No Input component exists. Use native elements with design tokens:
```jsx
<input className="w-full px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary" />
<textarea className="w-full px-3 py-2 rounded-md text-sm bg-surface-sunken text-ink-primary resize-none" rows={4} />
<select className="px-2 py-1 rounded-md text-sm bg-surface-sunken text-ink-primary">...</select>
```

### Dismissible Alerts

```jsx
const [dismissed, setDismissed] = useState(false);
{!dismissed && <AlertBanner variant="warning" message="..." onDismiss={() => setDismissed(true)} />}
```

### DataTable Sorting

```jsx
const [sortKey, setSortKey] = useState("score");
const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

const handleSort = (key: string) => {
  if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
  else { setSortKey(key); setSortDir("desc"); }
};

const sorted = useMemo(() =>
  [...data].sort((a, b) => { /* compare by sortKey, flip by sortDir */ }),
  [data, sortKey, sortDir]
);
```

### Stats Row

Grid of Stat components, typically 3–4 across:
```jsx
<div className="grid grid-cols-4 gap-8 mb-6">
  <Stat label="Total" value="47" />
  <Stat label="High Conviction" value="12" />
  <Stat label="Avg Score" value="0.68" />
  <Stat label="Last Updated" value="Mar 15" />
</div>
```

### CSS-Only Bar Charts

For simple 2-column query results (label + value), render horizontal bars without a chart library:
```jsx
<div className="flex items-center gap-2">
  <span className="w-32 text-xs text-ink-secondary truncate text-right">{label}</span>
  <div className="flex-1 h-5 bg-surface-sunken rounded-sm overflow-hidden">
    <div className="h-full bg-signal-high/40 rounded-sm" style={{ width: `${pct}%` }} />
  </div>
  <span className="w-16 text-xs font-mono text-ink-tertiary text-right">{value}</span>
</div>
```

---

## Constraints

1. **No raw Tailwind outside `components/ui/`** — use the 12 primitives for all UI structure. Layout utilities (grid, flex, gap, padding, margin) and design token classes (ink-*, surface-*, signal-*) are acceptable in page files.
2. **No inline styles** except `width` for CSS bar charts.
3. **No arbitrary Tailwind values** (e.g., `w-[347px]`).
4. **Fully typed** — no `any`. Use proper generics and type casting for DataTable.
5. **Do not modify `components/ui/` files** — extend by composition, not modification.
6. **Icons from lucide-react** at `size={20}` for nav, `size={14}` for button icons.
