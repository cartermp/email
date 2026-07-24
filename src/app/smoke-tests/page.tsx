import { notFound } from "next/navigation";
import SmokeHarness, { type SmokePanel } from "./SmokeHarness";

interface Props {
  searchParams: Promise<{ panel?: string }>;
}

const smokePanels = new Set<SmokePanel>([
  "inbox",
  "reply",
  "attachments",
  "target",
  "auto-sync",
  "dark-rendering",
  "tab-indicator",
]);

export default async function SmokePage({ searchParams }: Props) {
  if (process.env.MAIL_BROWSER_SMOKE_TESTS !== "1") {
    notFound();
  }

  const requestedPanel = (await searchParams).panel;
  const panel =
    requestedPanel && smokePanels.has(requestedPanel as SmokePanel)
      ? (requestedPanel as SmokePanel)
      : "inbox";

  return <SmokeHarness panel={panel} />;
}
