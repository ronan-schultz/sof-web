import type { Metadata } from "next";
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
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            SOF Monitor
          </h1>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:text-gray-300 transition-colors">Dashboard</a>
            <a href="/admin" className="hover:text-gray-300 transition-colors">Admin</a>
            <a href="/sandbox" className="hover:text-gray-300 transition-colors">Sandbox</a>
            <a href="/analytics" className="hover:text-gray-300 transition-colors">Analytics</a>
          </nav>
        </header>
        <main className="px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
