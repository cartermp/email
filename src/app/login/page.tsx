import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-5 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-7 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m4 7 7 5.5a1.6 1.6 0 0 0 2 0L20 7" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Mail
            </h1>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Your inbox, without the noise.
            </p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-stone-900 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          Sign in to connect your existing mailbox.
        </p>
      </div>
    </div>
  );
}
