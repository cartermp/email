import { getIdentities } from "@/lib/jmap";
import SignatureForm from "./SignatureForm";
import MobileBackButton from "@/components/MobileBackButton";
import { getJmapContext } from "@/lib/jmapServer";
import AppearanceSettings from "./AppearanceSettings";

export default async function SettingsPage() {
  const { session, accountId } = await getJmapContext();
  const identities = await getIdentities(session.apiUrl, accountId);
  const sortedIdentities = identities.toSorted((a, b) => {
    if (a.mayDelete === false && b.mayDelete !== false) return -1;
    if (b.mayDelete === false && a.mayDelete !== false) return 1;
    return a.email.localeCompare(b.email);
  });

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
        <MobileBackButton label="Inbox" compact />
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Settings
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Personalize how your outgoing mail appears.
          </p>
        </div>

        <section className="mb-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800/40">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-700/70">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Appearance
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
              Quiet controls for the surfaces you read throughout the day.
            </p>
          </div>
          <div className="p-5">
            <AppearanceSettings />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800/40">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-700/70">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Email signatures
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
              Appended to new messages and replies. The{" "}
              <code className="font-mono">--</code> separator is added automatically.
            </p>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-700/70">
            {sortedIdentities.map((identity) => (
              <div key={identity.id} className="p-5">
                <SignatureForm
                  identityId={identity.id}
                  identityLabel={`${identity.name} <${identity.email}>`}
                  initialSignature={identity.textSignature}
                />
              </div>
            ))}
            {sortedIdentities.length === 0 && (
              <p className="p-5 text-sm text-stone-500 dark:text-stone-400">
                No sending identities are available.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
