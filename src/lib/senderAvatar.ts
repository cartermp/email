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

// Calm, distinct avatar colours that work against both neutral app surfaces.
export const PALETTE = [
  "#475569",
  "#0369a1",
  "#1d4ed8",
  "#4338ca",
  "#6d28d9",
  "#a21caf",
  "#be123c",
  "#b45309",
  "#047857",
  "#0f766e",
  "#0e7490",
  "#4f46e5",
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
