import { EmailAddress } from "./types";

// Personal/webmail domains where the favicon is the provider's brand, not the
// sender's — fall through to initials for these.
export const WEBMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.ca", "yahoo.com.au",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr",
  "outlook.com", "outlook.co.uk", "outlook.fr",
  "live.com", "live.co.uk", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com",
  "protonmail.com", "proton.me",
  "fastmail.com", "fastmail.fm",
  "zoho.com",
  "yandex.com", "yandex.ru",
]);

// Avatar backgrounds: visible against the near-black row bg (#060e06).
// Dark enough to not compete with text, bright enough to be distinct (~3:1 vs bg).
export const PALETTE = [
  "#1a5c2a", // medium dark green
  "#245a1e", // medium forest
  "#1e5030", // dark teal-green
  "#2a5c1a", // medium olive-green
  "#1a5a3a", // dark sea-green
  "#285020", // dark medium green
  "#1e4a2e", // cool dark green
  "#244c1c", // dark leafy green
  "#204e34", // dark evergreen
  "#2a4e1a", // yellow-green dark
  "#1c4e28", // dark green variant
  "#264828", // deep teal
];

export function colorFor(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialsFor(from: EmailAddress[] | null): string {
  const s = from?.[0];
  if (!s) return "?";
  const name = s.name?.trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2)
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return s.email.slice(0, 2).toUpperCase();
}
