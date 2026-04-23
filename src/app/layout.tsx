import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import LiveUnreadCountBadge from "@/components/LiveUnreadCountBadge";
import MobileNav from "@/components/MobileNav";
import UnreadCountBadge from "@/components/UnreadCountBadge";
import UnreadCountProvider from "@/components/UnreadCountProvider";
import { getAccountId, getMailboxes, getSession as getJmapSession } from "@/lib/jmap";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
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
  let unreadTotal = 0;
  let draftTotal = 0;

  if (session) {
    const jmapSession = await getJmapSession();
    const accountId = getAccountId(jmapSession);
    const mailboxes = await getMailboxes(jmapSession.apiUrl, accountId);
    const inboxMailbox = mailboxes.find((mailbox) => mailbox.role === "inbox");
    const draftsMailbox = mailboxes.find((mailbox) => mailbox.role === "drafts");
    unreadTotal = inboxMailbox?.unreadEmails ?? 0;
    draftTotal = draftsMailbox?.totalEmails ?? 0;
  }

  return (
    <html
      lang="en"
      className={`${shareTechMono.variable} h-full`}
    >
      <body className="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 antialiased">
        <UnreadCountProvider initialCount={unreadTotal}>
          {/* Row: desktop sidebar + main content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar — desktop only */}
            <nav className="hidden md:flex print:hidden w-44 shrink-0 flex-col bg-stone-100 dark:bg-stone-950 border-r border-stone-300 dark:border-stone-500 px-3 py-5">
              <span className="text-sm font-bold tracking-widest text-stone-700 dark:text-blue-300 px-2 mb-6">
                [MAIL]
              </span>

              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  className="flex items-center justify-between gap-2 text-xs tracking-widest uppercase text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-400 dark:border-stone-300 hover:border-stone-700 dark:hover:border-stone-100 px-2 py-1.5 transition-colors"
                >
                  <span>[INBOX]</span>
                  <LiveUnreadCountBadge className="shrink-0" />
                </Link>
                <Link
                  href="/drafts"
                  className="flex items-center justify-between gap-2 text-xs tracking-widest uppercase text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-400 dark:border-stone-300 hover:border-stone-700 dark:hover:border-stone-100 px-2 py-1.5 transition-colors"
                >
                  <span>[DRAFTS]</span>
                  <UnreadCountBadge count={draftTotal} className="shrink-0" />
                </Link>
                <Link
                  href="/sent"
                  className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-400 dark:border-stone-300 hover:border-stone-700 dark:hover:border-stone-100 px-2 py-1.5 transition-colors"
                >
                  [SENT]
                </Link>
              </div>

              <div className="mt-auto flex flex-col gap-1">
                <Link
                  href="/settings"
                  className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-400 dark:border-stone-300 hover:border-stone-700 dark:hover:border-stone-100 px-2 py-1.5 transition-colors"
                >
                  [SETTINGS]
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
                      className="w-full text-left text-xs tracking-widest uppercase text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-400 dark:border-stone-300 hover:border-stone-700 dark:hover:border-stone-100 px-2 py-1.5 transition-colors"
                    >
                      [SIGN OUT]
                    </button>
                  </form>
                )}
              </div>
            </nav>

            {/* Main content */}
            <main className="flex-1 overflow-hidden min-w-0 h-full">{children}</main>
          </div>

          {/* Mobile bottom nav — hidden on desktop */}
          <div className="print:hidden"><MobileNav draftTotal={draftTotal} /></div>
        </UnreadCountProvider>
      </body>
    </html>
  );
}
