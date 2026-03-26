import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
}

export default function Card({ children, title, action, className = "" }: CardProps) {
  return (
    <div className={`bg-surface-elevated shadow-sm rounded-lg p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
          )}
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
