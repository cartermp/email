import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import AppearanceProvider from "@/components/AppearanceProvider";
import DesktopNav from "@/components/DesktopNav";
import MobileNav from "@/components/MobileNav";
import NavigationGuardProvider from "@/components/NavigationGuardProvider";
import ToastProvider from "@/components/ToastProvider";
import UnreadCountProvider, {
  MailboxCountSync,
} from "@/components/UnreadCountProvider";
import { getJmapMailboxContext } from "@/lib/jmapServer";
import { APPEARANCE_BOOTSTRAP_SCRIPT } from "@/lib/appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mail",
  description: "Personal email client",
};

async function MailboxCountsLoader() {
  try {
    const { mailboxes } = await getJmapMailboxContext();
    const inbox = mailboxes.find((mailbox) => mailbox.role === "inbox");
    const drafts = mailboxes.find((mailbox) => mailbox.role === "drafts");
    const spam = mailboxes.find(
      (mailbox) =>
        mailbox.role === "junk" ||
        mailbox.name.toLowerCase() === "spam" ||
        mailbox.name.toLowerCase() === "junk",
    );

    return (
      <MailboxCountSync
        counts={{
          inbox: inbox?.unreadEmails ?? 0,
          drafts: drafts?.totalEmails ?? 0,
          spam: spam?.unreadEmails ?? 0,
        }}
      />
    );
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 antialiased">
        <Script id="appearance-bootstrap" strategy="beforeInteractive">
          {APPEARANCE_BOOTSTRAP_SCRIPT}
        </Script>
        <AppearanceProvider>
          <NavigationGuardProvider>
            <UnreadCountProvider>
              <ToastProvider>
                {session && (
                  <Suspense fallback={null}>
                    <MailboxCountsLoader />
                  </Suspense>
                )}
                {/* Row: desktop sidebar + main content */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Sidebar — desktop only */}
                  {session && (
                    <nav className="hidden lg:flex print:hidden w-52 shrink-0 flex-col bg-white dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 px-3 py-5">
                      <div className="mb-6 flex items-center gap-2.5 px-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="14"
                              rx="2.5"
                            />
                            <path d="m4 7 7 5.5a1.6 1.6 0 0 0 2 0L20 7" />
                          </svg>
                        </span>
                        <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                          Mail
                        </span>
                      </div>

                      <DesktopNav />

                      <form
                        className="mt-1"
                        action={async () => {
                          "use server";
                          await signOut({ redirectTo: "/login" });
                        }}
                      >
                        <button
                          type="submit"
                          className="min-h-10 w-full rounded-lg px-3 text-left text-sm text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          Sign out
                        </button>
                      </form>
                    </nav>
                  )}

                  {/* Main content */}
                  <main className="flex-1 overflow-hidden min-w-0 h-full">
                    {children}
                  </main>
                </div>

                {/* Mobile bottom nav — hidden on desktop */}
                {session && (
                  <div className="print:hidden">
                    <MobileNav />
                  </div>
                )}
              </ToastProvider>
            </UnreadCountProvider>
          </NavigationGuardProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
