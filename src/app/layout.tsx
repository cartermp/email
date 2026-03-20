import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mail",
  description: "Personal email client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full flex bg-white text-zinc-900 antialiased">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 flex flex-col border-r border-zinc-200 px-4 py-6 gap-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Mail
          </span>
          <Link
            href="/"
            className="text-sm text-zinc-700 hover:text-zinc-900 py-1 rounded"
          >
            Inbox
          </Link>
          <Link
            href="/compose"
            className="text-sm text-zinc-700 hover:text-zinc-900 py-1 rounded"
          >
            Compose
          </Link>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
