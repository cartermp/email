import { EmailAddress } from "./types";

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
