import { getIdentities } from "@/lib/jmap";
import SignatureForm from "./SignatureForm";
import MobileBackButton from "@/components/MobileBackButton";
import { getJmapContext } from "@/lib/jmapServer";
import AppearanceSettings from "./AppearanceSettings";

export default async function SettingsPage() {
  const { session, accountId } = await getJmapContext();
  const identities = await getIdentities(session.apiUrl, accountId);
  const identity = identities.find((i) => i.mayDelete === false) ?? identities[0];

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
              Email signature
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
              Appended to new messages and replies. The{" "}
              <code className="font-mono">--</code> separator is added automatically.
            </p>
          </div>
          <div className="p-5">
            <SignatureForm
              identityLabel={identity ? `${identity.name} <${identity.email}>` : undefined}
              initialSignature={identity?.textSignature ?? ""}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
