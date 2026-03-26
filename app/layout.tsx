import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOF - Scholar Opportunity Fund",
  description: "Scored candidates from EDGAR filings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-surface-base text-ink-primary min-h-screen font-sans">
        <header className="bg-accent-default text-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight font-mono">
            SOF
          </h1>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:text-ink-disabled transition-fast">Dashboard</a>
            <a href="/admin" className="hover:text-ink-disabled transition-fast">Admin</a>
            <a href="/sandbox" className="hover:text-ink-disabled transition-fast">Sandbox</a>
          </nav>
        </header>
        <main className="px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
