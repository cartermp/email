"use client";

import { useEffect, useRef, useState } from "react";
import { EmailAddress } from "@/lib/types";
import {
  colorFor,
  initialsFor,
  senderAvatarDomain,
  senderAvatarUrl,
} from "@/lib/senderAvatar";

interface Props {
  from: EmailAddress[] | null;
  size?: number;
}

export default function SenderAvatar({ from, size = 36 }: Props) {
  const sender = from?.[0] ?? null;
  const initials = initialsFor(from);
  const color = colorFor(sender?.email ?? "");
  const imageUrl = senderAvatarUrl(from);
  const domain = senderAvatarDomain(sender?.email ?? "");
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageState =
    !imageUrl || failedImageUrl === imageUrl
      ? "failed"
      : loadedImageUrl === imageUrl
        ? "loaded"
        : "loading";

  useEffect(() => {
    const image = imageRef.current;
    if (!imageUrl || !image?.complete) return;

    // A cached image can finish before React hydrates and attaches onLoad.
    // Check it once after commit so it cannot remain invisibly "loading".
    const frame = requestAnimationFrame(() => {
      if (image.naturalWidth > 0) setLoadedImageUrl(imageUrl);
      else setFailedImageUrl(imageUrl);
    });
    return () => cancelAnimationFrame(frame);
  }, [imageUrl]);

  return (
    <div
      className="relative rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-stone-300/40"
      data-avatar-domain={domain ?? undefined}
      data-avatar-state={imageState}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    >
      <span
        className="font-semibold leading-none select-none text-stone-200"
        style={{ fontSize: Math.round(size * 0.37) }}
      >
        {initials}
      </span>
      {imageUrl && imageState !== "failed" && (
        // A plain image avoids running this already-small, same-origin asset
        // through a second image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          key={imageUrl}
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className={[
            "absolute inset-0 h-full w-full bg-white object-cover transition-opacity duration-150",
            imageState === "loaded" ? "opacity-100" : "opacity-0",
          ].join(" ")}
          decoding="async"
          draggable={false}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedImageUrl(imageUrl)}
          onError={() => setFailedImageUrl(imageUrl)}
        />
      )}
    </div>
  );
}
