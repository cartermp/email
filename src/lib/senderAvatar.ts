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

// Muted-but-distinct palette, consistent across light/dark modes
export const PALETTE = [
  "#4f86c6", // steel blue
  "#7c5cbf", // muted violet
  "#b85c8a", // dusty rose
  "#c4773a", // warm amber
  "#3a9e82", // teal
  "#5e7fc2", // periwinkle
  "#b05555", // muted red
  "#4a9e4e", // forest green
  "#8a6bbf", // lavender
  "#b07840", // caramel
  "#3a8faa", // slate cyan
  "#7a8fbf", // cool grey-blue
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
