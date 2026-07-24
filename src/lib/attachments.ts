import type { EmailBodyPart } from "@/lib/types";

export function isVisibleAttachment(part: EmailBodyPart): boolean {
  if (!part.blobId || part.type === "text/calendar") return false;

  const disposition = part.disposition?.trim().toLowerCase();
  if (disposition === "inline") return false;

  // Some senders assign Content-IDs to ordinary downloadable files. An
  // explicit attachment disposition takes precedence over the Content-ID.
  if (disposition === "attachment") return true;

  // With no disposition, preserve the conventional CID-as-inline fallback.
  return !part.cid;
}

export function visibleAttachments(
  parts: EmailBodyPart[] | null | undefined,
): EmailBodyPart[] {
  return (parts ?? []).filter(isVisibleAttachment);
}

