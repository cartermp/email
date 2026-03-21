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
      style={{ colorScheme: "light" }}
    >
      <body className="h-full flex bg-white text-gray-900 antialiased">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 flex flex-col bg-gray-50 border-r border-gray-200 px-3 py-5">
          <span className="text-sm font-semibold text-gray-900 px-2 mb-4">
            Mail
          </span>

          <Link
            href="/"
            className="text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-2 py-1.5 rounded-md transition-colors"
          >
            Inbox
          </Link>
          <Link
            href="/compose"
            className="text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-2 py-1.5 rounded-md transition-colors"
          >
            Compose
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
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
              >
                Sign out
              </button>
            </form>
          )}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </body>
    </html>
  );
}
