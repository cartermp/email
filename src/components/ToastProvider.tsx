"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastOptions {
  message: string;
  tone?: "default" | "error";
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
    setActionPending(false);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      const id = ++nextId.current;
      setActionPending(false);
      setToast({ ...options, id });
      timer.current = setTimeout(dismiss, options.duration ?? 5000);
    },
    [dismiss],
  );

  useEffect(() => dismiss, [dismiss]);

  async function runAction() {
    if (!toast?.onAction || actionPending) return;
    if (timer.current) clearTimeout(timer.current);
    setActionPending(true);
    try {
      await toast.onAction();
      dismiss();
    } catch {
      setActionPending(false);
      setToast((current) =>
        current
          ? {
              ...current,
              message: "That action could not be completed.",
              tone: "error",
              actionLabel: undefined,
              onAction: undefined,
            }
          : current,
      );
      timer.current = setTimeout(dismiss, 5000);
    }
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-6"
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <div
            className={[
              "pointer-events-auto flex min-h-11 max-w-md items-center gap-4 rounded-lg border px-4 py-2.5 text-sm shadow-lg",
              toast.tone === "error"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                : "border-stone-700 bg-stone-900 text-stone-100 dark:border-stone-200 dark:bg-stone-100 dark:text-stone-900",
            ].join(" ")}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={runAction}
                disabled={actionPending}
                className="shrink-0 rounded px-1.5 py-1 font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-offset-2 disabled:opacity-60 dark:text-blue-700 dark:hover:text-blue-800"
              >
                {actionPending ? "Working…" : toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
