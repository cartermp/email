export const DEFAULT_BROWSER_TAB_TITLE = "Mail";
export const DEFAULT_FAVICON_HREF = "/icon.svg";

function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

export function formatBrowserTabUnreadCount(count: number): string {
  const normalizedCount = normalizeUnreadCount(count);
  if (normalizedCount === 0) return "";
  return normalizedCount >= 99 ? "99+" : String(normalizedCount);
}

export function getBrowserTabTitle(
  count: number,
  baseTitle = DEFAULT_BROWSER_TAB_TITLE,
): string {
  const unreadLabel = formatBrowserTabUnreadCount(count);
  return unreadLabel ? `(${unreadLabel}) ${baseTitle}` : baseTitle;
}

export function getUnreadFaviconSvg(count: number): string {
  const unreadLabel = formatBrowserTabUnreadCount(count);
  const label = unreadLabel || "1";
  const badgeWidth = label.length === 1 ? 28 : label.length === 2 ? 35 : 43;
  const badgeX = 62 - badgeWidth;
  const fontSize = label.length === 1 ? 19 : label.length === 2 ? 16 : 12.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>${label} unread ${label === "1" ? "email" : "emails"}</title>
  <rect x="1" y="1" width="62" height="62" rx="15" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="8" y="10" width="48" height="35" rx="7" fill="#f8fafc"/>
  <path d="m11 16 17 14.5a6 6 0 0 0 8 0L53 16" fill="none" stroke="#475569" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${badgeX}" y="34" width="${badgeWidth}" height="28" rx="14" fill="#2563eb" stroke="#0f172a" stroke-width="3"/>
  <text x="${badgeX + badgeWidth / 2}" y="53.5" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${fontSize}" font-weight="800" text-anchor="middle">${label}</text>
</svg>`;
}

export function getUnreadFaviconDataUrl(count: number): string {
  return `data:image/svg+xml,${encodeURIComponent(getUnreadFaviconSvg(count))}`;
}
