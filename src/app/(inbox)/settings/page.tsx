import { getSession, getAccountId, getIdentities } from "@/lib/jmap";
import SignatureForm from "./SignatureForm";
import MobileBackButton from "@/components/MobileBackButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);
  const identity = identities.find((i) => i.mayDelete === false) ?? identities[0];

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <MobileBackButton label="Inbox" />
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-8">
          Settings
        </h1>

        <section>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Email signature
          </h2>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">
            Appended to new messages and replies. The{" "}
            <code className="font-mono">--</code> separator is added automatically.
          </p>
          <SignatureForm
            identityLabel={identity ? `${identity.name} <${identity.email}>` : undefined}
            initialSignature={identity?.textSignature ?? ""}
          />
        </section>
      </div>
    </div>
  );
}
