"use client";

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
  const unreadCount = useUnreadCount();
  const faviconRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    let favicon = document.head.querySelector<HTMLLinkElement>(
      MANAGED_FAVICON_SELECTOR,
    );
    const createdFavicon = !favicon;

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      favicon.sizes = "any";
      favicon.dataset.mailUnreadFavicon = "true";
      document.head.append(favicon);
    }

    faviconRef.current = favicon;

    return () => {
      faviconRef.current = null;
      if (createdFavicon) favicon.remove();
    };
  }, []);

  useEffect(() => {
    const unreadLabel = formatBrowserTabUnreadCount(unreadCount);
    const favicon = faviconRef.current;

    document.title = getBrowserTabTitle(unreadCount);

    if (favicon) {
      favicon.href = unreadLabel
        ? getUnreadFaviconDataUrl(unreadCount)
        : DEFAULT_FAVICON_HREF;
      favicon.dataset.unreadCount = unreadLabel;
    }
  }, [unreadCount]);

  return null;
}
