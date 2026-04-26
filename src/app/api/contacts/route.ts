import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAccountId, getContactsAccountId, getSession, searchRecipientSuggestions } from "@/lib/jmap";

export async function GET(req: NextRequest) {
  const sessionData = await auth();
  if (!sessionData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);

  try {
    const session = await getSession();
    const results = await searchRecipientSuggestions(
      session.apiUrl,
      getContactsAccountId(session),
      getAccountId(session),
      q.trim()
    );
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
