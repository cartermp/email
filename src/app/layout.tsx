import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import MobileNav from "@/components/MobileNav";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 antialiased">
        {/* Row: desktop sidebar + main content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar — desktop only */}
          <nav className="hidden md:flex print:hidden w-44 shrink-0 flex-col bg-stone-100 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 px-3 py-5">
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 px-2 mb-4">
              Mail
            </span>

            <Link
              href="/"
              className="text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 rounded-md transition-colors"
            >
              Inbox
            </Link>
            <Link
              href="/drafts"
              className="text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 rounded-md transition-colors"
            >
              Drafts
            </Link>
            <Link
              href="/sent"
              className="text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 rounded-md transition-colors"
            >
              Sent
            </Link>

            <div className="mt-auto flex flex-col gap-1">
              <Link
                href="/settings"
                className="text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1.5 rounded-md transition-colors"
              >
                Settings
              </Link>
              {session && (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 px-2 py-1 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-hidden min-w-0 h-full">{children}</main>
        </div>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="print:hidden"><MobileNav /></div>
      </body>
    </html>
  );
}
