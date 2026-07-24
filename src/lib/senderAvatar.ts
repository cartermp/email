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

const PERSONAL_MAIL_DOMAINS = new Set([
  "aol.com",
  "fastmail.com",
  "gmail.com",
  "gmx.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mac.com",
  "mail.com",
  "me.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yandex.com",
  "zoho.com",
]);

const RESERVED_SUFFIXES = [
  ".example",
  ".invalid",
  ".local",
  ".localhost",
  ".test",
];

const MULTI_PART_PUBLIC_SUFFIXES = new Set([
  "ac.uk",
  "co.in",
  "co.jp",
  "co.nz",
  "co.uk",
  "com.au",
  "com.br",
  "com.mx",
  "com.sg",
  "net.au",
  "org.au",
  "org.uk",
]);

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

/**
 * Normalize a hostname before it is sent to the fixed favicon provider.
 * Internationalized hostnames are expected in their ASCII/punycode form.
 */
export function normalizeAvatarDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    domain.length === 0 ||
    domain.length > 253 ||
    !domain.includes(".") ||
    RESERVED_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  ) {
    return null;
  }

  const labels = domain.split(".");
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    ) ||
    labels.every((label) => /^\d+$/.test(label))
  ) {
    return null;
  }

  return domain;
}

/**
 * Public mailbox domains identify the email host, not the sender. Showing a
 * Gmail or Fastmail logo for a person would be more misleading than initials.
 */
function isPersonalMailboxDomain(domain: string): boolean {
  for (const provider of PERSONAL_MAIL_DOMAINS) {
    if (domain === provider || domain.endsWith(`.${provider}`)) return true;
  }
  return false;
}

export function senderAvatarDomain(email: string): string | null {
  const separator = email.lastIndexOf("@");
  if (separator < 1 || separator === email.length - 1) return null;

  const domain = normalizeAvatarDomain(email.slice(separator + 1));
  if (!domain || isPersonalMailboxDomain(domain)) return null;
  return domain;
}

export function senderAvatarUrl(from: EmailAddress[] | null): string | null {
  const domain = senderAvatarDomain(from?.[0]?.email ?? "");
  return domain ? `/api/avatar?domain=${encodeURIComponent(domain)}` : null;
}

/**
 * Try the sender's exact host first, then its likely organization domain.
 * This lets tracking.usps.com resolve to the icon published for usps.com.
 */
export function avatarDomainCandidates(value: string): string[] {
  const domain = normalizeAvatarDomain(value);
  if (!domain) return [];

  const labels = domain.split(".");
  const lastTwo = labels.slice(-2).join(".");
  const rootLabelCount = MULTI_PART_PUBLIC_SUFFIXES.has(lastTwo) ? 3 : 2;
  const organizationDomain =
    labels.length > rootLabelCount
      ? labels.slice(-rootLabelCount).join(".")
      : domain;

  return organizationDomain === domain
    ? [domain]
    : [domain, organizationDomain];
}
