import { getSession, getAccountId, getIdentities } from "@/lib/jmap";
import Composer from "@/components/Composer";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);

  // Sort: personal first
  const sorted = identities.sort((a, b) => {
    if (a.mayDelete === false && b.mayDelete !== false) return -1;
    if (b.mayDelete === false && a.mayDelete !== false) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4">
        <h1 className="text-sm font-semibold text-zinc-900">New Message</h1>
      </div>
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 57px)" }}>
        <Composer identities={sorted.map(i => ({ id: i.id, name: i.name, email: i.email }))} />
      </div>
    </div>
  );
}
