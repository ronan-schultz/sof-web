"use client";

import { type ReactNode } from "react";

interface AlertBannerProps {
  variant: "warning" | "critical";
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
}

const variantStyles: Record<string, string> = {
  warning: "bg-signal-mid/8 text-signal-mid",
  critical: "bg-signal-low/8 text-signal-low",
};

const iconPaths: Record<string, string> = {
  warning: "M12 2L22 20H2L12 2ZM12 16V18M12 8V14",
  critical: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2ZM12 16V18M12 8V14",
};

export default function AlertBanner({ variant, message, action, onDismiss }: AlertBannerProps) {
  return (
    <div className={`flex items-center gap-3 py-3 px-6 text-sm ${variantStyles[variant]}`}>
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={iconPaths[variant]} />
      </svg>
      <span className="flex-1">{message}</span>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md hover:bg-black/5 transition-fast"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
