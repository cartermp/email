"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import {
  DEFAULT_FAVICON_HREF,
  formatBrowserTabUnreadCount,
  getBrowserTabTitle,
  getUnreadFaviconDataUrl,
} from "@/lib/browserTabIndicator";

const MANAGED_FAVICON_SELECTOR = 'link[data-mail-unread-favicon="true"]';

export default function BrowserTabIndicator() {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();
  const faviconRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    return () => {
      faviconRef.current = null;
      document.head
        .querySelectorAll(MANAGED_FAVICON_SELECTOR)
        .forEach((favicon) => favicon.remove());
    };
  }, []);

  useEffect(() => {
    const unreadLabel = formatBrowserTabUnreadCount(unreadCount);
    const connectedFavicon = faviconRef.current?.isConnected
      ? faviconRef.current
      : document.head.querySelector<HTMLLinkElement>(
          MANAGED_FAVICON_SELECTOR,
        );
    const favicon = connectedFavicon ?? document.createElement("link");

    if (!connectedFavicon) {
      favicon.setAttribute("rel", "icon");
      favicon.setAttribute("type", "image/svg+xml");
      favicon.setAttribute("sizes", "any");
      favicon.setAttribute("data-mail-unread-favicon", "true");
    }

    document.title = getBrowserTabTitle(unreadCount);
    favicon.setAttribute(
      "href",
      unreadLabel
        ? getUnreadFaviconDataUrl(unreadCount)
        : DEFAULT_FAVICON_HREF,
    );
    favicon.setAttribute("data-unread-count", unreadLabel);
    faviconRef.current = favicon;

    // Next may rewrite static metadata while navigating. Keep this managed
    // icon last so the browser continues to prefer the live unread state.
    document.head.append(favicon);
  }, [pathname, unreadCount]);

  return null;
}
