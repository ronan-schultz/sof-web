"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface AppShellProps {
  children: ReactNode;
  navigation: NavItem[];
}

export default function AppShell({ children, navigation }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-surface-sunken shadow-sm flex flex-col">
        <div className="px-6 py-5">
          <span className="font-mono text-xl font-semibold text-ink-primary">
            SOF
          </span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-fast ${
                  active
                    ? "bg-ink-primary/6 text-ink-primary"
                    : "text-ink-secondary hover:bg-ink-primary/4 hover:text-ink-primary"
                }`}
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-surface-base overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
