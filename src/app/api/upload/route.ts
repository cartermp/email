import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId, uploadBlob } from "@/lib/jmap";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const session = await getSession();
    const accountId = getAccountId(session);
    const buffer = await file.arrayBuffer();
    const result = await uploadBlob(session.uploadUrl, accountId, buffer, file.type);

    return NextResponse.json({ blobId: result.blobId, type: result.type });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
