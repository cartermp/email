import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { renderAvatarImage } from "@/lib/avatarImage";
import {
  avatarDomainCandidates,
  normalizeAvatarDomain,
} from "@/lib/senderAvatar";

export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;

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

interface AvatarSource {
  image: ArrayBuffer;
  source: "high-resolution" | "favicon";
}

async function fetchImage(
  url: URL,
  source: AvatarSource["source"],
  allowedHosts: Set<string>,
): Promise<AvatarSource | null> {
  const upstream = await fetch(url, {
    headers: {
      Accept: "image/svg+xml,image/png,image/webp,image/jpeg,image/*;q=0.8",
    },
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(4_000),
  });

  const finalHost = new URL(upstream.url).hostname;
  const contentType = upstream.headers.get("content-type")?.split(";")[0];
  const contentLength = Number(upstream.headers.get("content-length") ?? 0);
  if (
    !upstream.ok ||
    !allowedHosts.has(finalHost) ||
    !contentType?.startsWith("image/") ||
    contentLength > MAX_SOURCE_BYTES
  ) {
    return null;
  }

  const image = await upstream.arrayBuffer();
  if (image.byteLength === 0 || image.byteLength > MAX_SOURCE_BYTES) {
    return null;
  }

  return { image, source };
}

async function fetchHighResolutionIcon(
  domain: string,
): Promise<AvatarSource | null> {
  const url = new URL(`https://favicon.im/${encodeURIComponent(domain)}`);
  url.searchParams.set("larger", "true");
  url.searchParams.set("throw-error-on-404", "true");
  return fetchImage(
    url,
    "high-resolution",
    new Set(["favicon.im", "a.favicon.im"]),
  );
}

async function fetchFavicon(domain: string): Promise<AvatarSource | null> {
  const url = new URL("https://www.google.com/s2/favicons");
  url.searchParams.set("domain", domain);
  url.searchParams.set("sz", "256");
  return fetchImage(url, "favicon", new Set(["www.google.com"]));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const smokeTest = process.env.MAIL_BROWSER_SMOKE_TESTS === "1";
  if (!session?.user && !smokeTest) return emptyResponse(401);

  const domain = normalizeAvatarDomain(
    request.nextUrl.searchParams.get("domain") ?? "",
  );
  if (!domain) return emptyResponse(400);

  const candidates = avatarDomainCandidates(domain);
  const resolvers = [fetchHighResolutionIcon, fetchFavicon];

  for (const resolver of resolvers) {
    for (const candidate of candidates) {
      try {
        const result = await resolver(candidate);
        if (!result) continue;

        const image = await renderAvatarImage(result.image);
        if (image.byteLength === 0 || image.byteLength > MAX_OUTPUT_BYTES) {
          continue;
        }

        const body = new Uint8Array(image.byteLength);
        body.set(image);

        return new Response(body.buffer, {
          status: 200,
          headers: {
            ...imageHeaders,
            "Content-Length": String(image.byteLength),
            "Content-Type": "image/png",
            "X-Avatar-Source": result.source,
          },
        });
      } catch {
        // Missing, slow, or malformed artwork is an expected fallback case.
      }
    }
  }

  return emptyResponse(404);
}
