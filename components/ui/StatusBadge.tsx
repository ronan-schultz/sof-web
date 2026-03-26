type BadgeVariant =
  | "spinoff"
  | "activism"
  | "invest"
  | "reject"
  | "watchlist"
  | "confirmed"
  | "pending";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  spinoff: "bg-surface-sunken text-ink-secondary",
  activism: "bg-ink-primary/8 text-ink-primary",
  invest: "bg-signal-high/10 text-signal-high",
  reject: "bg-signal-low/8 text-signal-low",
  watchlist: "bg-signal-mid/10 text-signal-mid",
  confirmed: "bg-signal-high/10 text-signal-high",
  pending: "bg-surface-sunken text-ink-tertiary",
};

const defaultLabels: Record<BadgeVariant, string> = {
  spinoff: "Spinoff",
  activism: "Activism",
  invest: "Invest",
  reject: "Reject",
  watchlist: "Watchlist",
  confirmed: "Confirmed",
  pending: "Pending",
};

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]}`}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
