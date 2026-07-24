"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  parseAppearancePreferences,
  resolveDarkTheme,
  type AppearancePreferences,
} from "@/lib/appearance";

interface AppearanceContextValue {
  preferences: AppearancePreferences;
  setPreferences: (
    update:
      | AppearancePreferences
      | ((current: AppearancePreferences) => AppearancePreferences),
  ) => void;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  preferences: DEFAULT_APPEARANCE,
  setPreferences: () => undefined,
});

function applyAppearance(preferences: AppearancePreferences) {
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  root.classList.toggle(
    "dark",
    resolveDarkTheme(preferences.theme, systemPrefersDark),
  );
  root.dataset.theme = preferences.theme;
  root.dataset.density = preferences.density;
  root.dataset.readerWidth = preferences.readerWidth;
}

let currentPreferences: AppearancePreferences | undefined;
const listeners = new Set<() => void>();
let removeMediaListener: (() => void) | undefined;

function getClientSnapshot(): AppearancePreferences {
  if (!currentPreferences) {
    try {
      currentPreferences = parseAppearancePreferences(
        window.localStorage.getItem(APPEARANCE_STORAGE_KEY),
      );
    } catch {
      currentPreferences = DEFAULT_APPEARANCE;
    }
  }
  return currentPreferences;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!removeMediaListener) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = getClientSnapshot();
      if (current.theme === "system") applyAppearance(current);
    };
    media.addEventListener("change", onChange);
    removeMediaListener = () => media.removeEventListener("change", onChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && removeMediaListener) {
      removeMediaListener();
      removeMediaListener = undefined;
    }
  };
}

function updateAppearance(
  update:
    | AppearancePreferences
    | ((current: AppearancePreferences) => AppearancePreferences),
) {
  const current = getClientSnapshot();
  const next = typeof update === "function" ? update(current) : update;
  currentPreferences = next;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The preference still applies for this session when storage is blocked.
  }
  applyAppearance(next);
  listeners.forEach((listener) => listener());
}

export function useAppearance() {
  return useContext(AppearanceContext);
}

export default function AppearanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const preferences = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => DEFAULT_APPEARANCE,
  );

  return (
    <AppearanceContext.Provider
      value={{ preferences, setPreferences: updateAppearance }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}
