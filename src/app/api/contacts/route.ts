import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId, searchContacts } from "@/lib/jmap";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);

  try {
    const session = await getSession();
    const accountId = getAccountId(session);
    const results = await searchContacts(session.apiUrl, accountId, q.trim());
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
