import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import LiveUnreadCountBadge from "@/components/LiveUnreadCountBadge";
import MobileNav from "@/components/MobileNav";
import UnreadCountBadge from "@/components/UnreadCountBadge";
import UnreadCountProvider from "@/components/UnreadCountProvider";
import { getAccountId, getMailboxes, getSession as getJmapSession } from "@/lib/jmap";
import "./globals.css";

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
  let spamUnreadTotal = 0;

  if (session) {
    const jmapSession = await getJmapSession();
    const accountId = getAccountId(jmapSession);
    const mailboxes = await getMailboxes(jmapSession.apiUrl, accountId);
    const inboxMailbox = mailboxes.find((mailbox) => mailbox.role === "inbox");
    const draftsMailbox = mailboxes.find((mailbox) => mailbox.role === "drafts");
    const spamMailbox = mailboxes.find((mailbox) => mailbox.role === "junk" || mailbox.name.toLowerCase() === "spam" || mailbox.name.toLowerCase() === "junk");
    unreadTotal = inboxMailbox?.unreadEmails ?? 0;
    draftTotal = draftsMailbox?.totalEmails ?? 0;
    spamUnreadTotal = spamMailbox?.unreadEmails ?? 0;
  }

  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 antialiased">
        <UnreadCountProvider initialCount={unreadTotal}>
          {/* Row: desktop sidebar + main content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar — desktop only */}
            <nav className="hidden md:flex print:hidden w-48 shrink-0 flex-col bg-white dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 px-3 py-5">
              <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100 px-2 mb-6">
                Mail
              </span>

              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  className="flex items-center justify-between gap-2 rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
                >
                  <span>Inbox</span>
                  <LiveUnreadCountBadge className="shrink-0" />
                </Link>
                <Link
                  href="/drafts"
                  className="flex items-center justify-between gap-2 rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
                >
                  <span>Drafts</span>
                  <UnreadCountBadge count={draftTotal} className="shrink-0" />
                </Link>
                 <Link
                  href="/sent"
                  className="rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
                >
                  Sent
                </Link>
                <Link
                  href="/spam"
                  className="flex items-center justify-between gap-2 rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
                >
                  <span>Spam</span>
                  <UnreadCountBadge count={spamUnreadTotal} className="shrink-0" />
                </Link>
                <Link
                  href="/calendar"
                  className="rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
                >
                  Calendar
                </Link>
              </div>

              <div className="mt-auto flex flex-col gap-1">
                <Link
                  href="/settings"
                  className="rounded-md text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
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
                      className="w-full text-left rounded-md text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 px-2.5 py-2 transition-colors"
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
          <div className="print:hidden"><MobileNav draftTotal={draftTotal} spamTotal={spamUnreadTotal} /></div>
        </UnreadCountProvider>
      </body>
    </html>
  );
}
