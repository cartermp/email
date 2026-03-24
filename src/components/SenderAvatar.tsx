"use client";

import { useState, useEffect } from "react";
import { EmailAddress } from "@/lib/types";
import { WEBMAIL_DOMAINS, colorFor, initialsFor } from "@/lib/senderAvatar";

// Module-level cache: domains that have returned a failed logo are skipped on
// all future renders — survives component remounts caused by router.refresh().
const failedDomains = new Set<string>();

interface Props {
  from: EmailAddress[] | null;
  size?: number;
}

export default function SenderAvatar({ from, size = 36 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sender = from?.[0] ?? null;
  const domain = sender?.email.match(/@(.+)$/)?.[1]?.toLowerCase() ?? null;
  const initials = initialsFor(from);
  const color = colorFor(sender?.email ?? "");

  const useIcon = !!domain && !WEBMAIL_DOMAINS.has(domain) && !imgFailed && (!mounted || !failedDomains.has(domain));
  const faviconUrl = useIcon
    ? `https://logo.clearbit.com/${domain}`
    : null;

  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/5 dark:ring-white/10"
      style={{
        width: size,
        height: size,
        backgroundColor: faviconUrl ? undefined : color,
      }}
    >
      {faviconUrl ? (
        // White/dark background so favicon renders well on both themes
        <div
          className="flex items-center justify-center w-full h-full bg-white dark:bg-stone-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl}
            alt=""
            width={Math.round(size * 0.72)}
            height={Math.round(size * 0.72)}
            className="object-contain"
            onError={() => {
              if (domain) failedDomains.add(domain);
              setImgFailed(true);
            }}
          />
        </div>
      ) : (
        <span
          className="text-white font-semibold leading-none select-none"
          style={{ fontSize: Math.round(size * 0.37) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
