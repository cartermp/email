import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
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
      <body className="h-full flex bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 antialiased">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 flex flex-col bg-stone-100 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 px-3 py-5">
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

          {session && (
            <form
              className="mt-auto"
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
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-hidden min-w-0 h-full">{children}</main>
      </body>
    </html>
  );
}
