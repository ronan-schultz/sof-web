import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {icon && (
        <div className="mb-4 text-ink-disabled">
          {icon}
        </div>
      )}
      <p className="text-base text-ink-secondary font-medium">{title}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-ink-tertiary">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
