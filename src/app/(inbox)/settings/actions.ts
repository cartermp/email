"use server";

import { auth } from "@/auth";
import { getSession, getAccountId, getIdentities, updateIdentitySignature } from "@/lib/jmap";
import { revalidatePath } from "next/cache";
import { log } from "@/lib/logger";

export async function saveSignatureAction(
  identityId: string,
  signature: string
): Promise<void> {
  const t = Date.now();
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);
  const identity = identities.find((candidate) => candidate.id === identityId);
  if (!identity) throw new Error("No identity found");

  await updateIdentitySignature(session.apiUrl, accountId, identity.id, signature);
  revalidatePath("/settings");
  revalidatePath("/compose");
  log.info({ identity_id: identity.id, sig_len: signature.length, duration_ms: Date.now() - t }, "action.save_signature");
}
