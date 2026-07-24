import { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  avatarDomainCandidates,
  normalizeAvatarDomain,
} from "@/lib/senderAvatar";

export const runtime = "nodejs";

const AVATAR_SIZE = "128";
const MAX_IMAGE_BYTES = 256 * 1024;

const imageHeaders = {
  "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};

function emptyResponse(status: number) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const smokeTest = process.env.MAIL_BROWSER_SMOKE_TESTS === "1";
  if (!session?.user && !smokeTest) return emptyResponse(401);

  const domain = normalizeAvatarDomain(
    request.nextUrl.searchParams.get("domain") ?? "",
  );
  if (!domain) return emptyResponse(400);

  for (const candidate of avatarDomainCandidates(domain)) {
    try {
      const upstreamUrl = new URL("https://www.google.com/s2/favicons");
      upstreamUrl.searchParams.set("domain", candidate);
      upstreamUrl.searchParams.set("sz", AVATAR_SIZE);

      const upstream = await fetch(upstreamUrl, {
        headers: {
          Accept: "image/png,image/webp,image/jpeg,image/*;q=0.8",
        },
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(3_500),
      });

      const contentType = upstream.headers.get("content-type")?.split(";")[0];
      const contentLength = Number(upstream.headers.get("content-length") ?? 0);
      if (
        !upstream.ok ||
        !contentType?.startsWith("image/") ||
        contentType === "image/svg+xml" ||
        contentLength > MAX_IMAGE_BYTES
      ) {
        continue;
      }

      const image = await upstream.arrayBuffer();
      if (image.byteLength === 0 || image.byteLength > MAX_IMAGE_BYTES) {
        continue;
      }

      return new Response(image, {
        status: 200,
        headers: {
          ...imageHeaders,
          "Content-Length": String(image.byteLength),
          "Content-Type": contentType,
        },
      });
    } catch {
      // Missing, slow, or unavailable artwork is an expected fallback case.
    }
  }

  return emptyResponse(404);
}
