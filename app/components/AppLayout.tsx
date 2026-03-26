"use client";

import { type ReactNode } from "react";
import { AppShell } from "@/components/ui";
import {
  LayoutGrid,
  Briefcase,
  BarChart2,
  FlaskConical,
  Settings,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/", icon: <LayoutGrid size={20} /> },
  { label: "Portfolio", href: "/portfolio", icon: <Briefcase size={20} /> },
  { label: "Analytics", href: "/analytics", icon: <BarChart2 size={20} /> },
  { label: "Sandbox", href: "/sandbox", icon: <FlaskConical size={20} /> },
  { label: "Admin", href: "/admin", icon: <Settings size={20} /> },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell navigation={navigation}>{children}</AppShell>;
}
