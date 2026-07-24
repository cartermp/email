"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import type {
  AppearancePreferences,
  MailDensity,
  ReaderWidth,
  ThemePreference,
} from "@/lib/appearance";

interface Option<T extends string> {
  value: T;
  label: string;
}

function PreferenceOptions<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-900 sm:w-auto">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="relative min-w-0 flex-1 sm:flex-none">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={[
                "flex min-h-9 cursor-pointer items-center justify-center rounded-md px-3 text-xs transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500",
                checked
                  ? "bg-white font-medium text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100",
              ].join(" ")}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-200">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function AppearanceSettings() {
  const { preferences, setPreferences } = useAppearance();

  function update<K extends keyof AppearancePreferences>(
    key: K,
    value: AppearancePreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-700/70">
      <SettingRow
        title="Theme"
        description="Follow your device, or keep Mail consistently light or dark."
      >
        <PreferenceOptions<ThemePreference>
          name="theme"
          value={preferences.theme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(value) => update("theme", value)}
        />
      </SettingRow>

      <SettingRow
        title="Inbox density"
        description="Choose how much vertical space each conversation uses."
      >
        <PreferenceOptions<MailDensity>
          name="density"
          value={preferences.density}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
          onChange={(value) => update("density", value)}
        />
      </SettingRow>

      <SettingRow
        title="Reading width"
        description="Control the line length of opened messages and threads."
      >
        <PreferenceOptions<ReaderWidth>
          name="reader-width"
          value={preferences.readerWidth}
          options={[
            { value: "focused", label: "Focused" },
            { value: "comfortable", label: "Standard" },
            { value: "wide", label: "Wide" },
          ]}
          onChange={(value) => update("readerWidth", value)}
        />
      </SettingRow>
    </div>
  );
}
