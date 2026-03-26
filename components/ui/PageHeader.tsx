import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="pb-5 mb-6 shadow-[inset_0_-1px_0_0_var(--color-surface-sunken)]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0 ml-4">{actions}</div>}
      </div>
    </div>
  );
}
