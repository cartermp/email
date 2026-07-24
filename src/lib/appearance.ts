export type ThemePreference = "system" | "light" | "dark";
export type MailDensity = "comfortable" | "compact";
export type ReaderWidth = "focused" | "comfortable" | "wide";

export interface AppearancePreferences {
  theme: ThemePreference;
  density: MailDensity;
  readerWidth: ReaderWidth;
}

export const APPEARANCE_STORAGE_KEY = "mail-appearance-v1";

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  density: "comfortable",
  readerWidth: "comfortable",
};

const THEMES = new Set<ThemePreference>(["system", "light", "dark"]);
const DENSITIES = new Set<MailDensity>(["comfortable", "compact"]);
const READER_WIDTHS = new Set<ReaderWidth>([
  "focused",
  "comfortable",
  "wide",
]);

export function parseAppearancePreferences(
  stored: string | null,
): AppearancePreferences {
  if (!stored) return DEFAULT_APPEARANCE;
  try {
    const value = JSON.parse(stored) as Partial<AppearancePreferences>;
    return {
      theme: THEMES.has(value.theme as ThemePreference)
        ? (value.theme as ThemePreference)
        : DEFAULT_APPEARANCE.theme,
      density: DENSITIES.has(value.density as MailDensity)
        ? (value.density as MailDensity)
        : DEFAULT_APPEARANCE.density,
      readerWidth: READER_WIDTHS.has(value.readerWidth as ReaderWidth)
        ? (value.readerWidth as ReaderWidth)
        : DEFAULT_APPEARANCE.readerWidth,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function resolveDarkTheme(
  theme: ThemePreference,
  systemPrefersDark: boolean,
): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export const APPEARANCE_BOOTSTRAP_SCRIPT = `(()=>{var p={theme:"system",density:"comfortable",readerWidth:"comfortable"};try{var raw=localStorage.getItem("${APPEARANCE_STORAGE_KEY}");var v=raw?JSON.parse(raw):{};if(["system","light","dark"].includes(v.theme))p.theme=v.theme;if(["comfortable","compact"].includes(v.density))p.density=v.density;if(["focused","comfortable","wide"].includes(v.readerWidth))p.readerWidth=v.readerWidth}catch(_error){}var root=document.documentElement;var dark=p.theme==="dark"||(p.theme==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);root.classList.toggle("dark",!!dark);root.dataset.theme=p.theme;root.dataset.density=p.density;root.dataset.readerWidth=p.readerWidth})();`;
