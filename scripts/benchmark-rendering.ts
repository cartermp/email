import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { prepareHtml } from "../src/lib/emailHtml";

const FIXTURE_NAMES = [
  "new-dental-appointment-for-phillip_Stp0bVMUG5Sc.json",
  "start-small-and-scale-when-it-matters_Stp09-UTL1Lw.json",
  "plan-your-weekend-10-open-houses-for-sale-near-bellevue-wa-9_Stp09-_Y2kmN.json",
];
const PREPARE_ROUNDS = 1_000;
const IFRAME_ROUNDS = 2;

interface Fixture {
  bodyValues: Record<string, { value: string }>;
  htmlBody: Array<{ partId?: string | null }>;
}

function fixtureHtml(name: string): string {
  const fixturePath = path.resolve(
    process.cwd(),
    "src/lib/__tests__/fixtures",
    name,
  );
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
  const partId = fixture.htmlBody.find((part) => part.partId)?.partId;
  if (!partId || !fixture.bodyValues[partId]) {
    throw new Error(`Fixture ${name} has no HTML body`);
  }
  return fixture.bodyValues[partId].value;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

const fixtures = FIXTURE_NAMES.map((name) => ({
  name,
  html: fixtureHtml(name),
}));

// Warm up the regular-expression and string-replacement paths before timing.
for (const fixture of fixtures) prepareHtml(fixture.html);

const prepareStartedAt = performance.now();
for (let round = 0; round < PREPARE_ROUNDS; round++) {
  for (const fixture of fixtures) prepareHtml(fixture.html);
}
const prepareDuration = performance.now() - prepareStartedAt;
const prepareOperations = PREPARE_ROUNDS * fixtures.length;

async function benchmarkIframeBoot(html: string): Promise<number> {
  const virtualConsole = new VirtualConsole();
  const startedAt = performance.now();
  const dom = new JSDOM(prepareHtml(html), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: () => ({
          matches: true,
          media: "(prefers-color-scheme:dark)",
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return true;
          },
        }),
      });
      window.postMessage = (() => {}) as typeof window.postMessage;
      window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }) as typeof window.requestAnimationFrame;
      Object.defineProperty(window, "MutationObserver", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, "ResizeObserver", {
        configurable: true,
        value: undefined,
      });
      for (const property of [
        "scrollHeight",
        "offsetHeight",
        "scrollWidth",
        "offsetWidth",
      ]) {
        Object.defineProperty(window.HTMLElement.prototype, property, {
          configurable: true,
          get: () => 640,
        });
      }
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  const duration = performance.now() - startedAt;
  dom.window.close();
  return duration;
}

async function main() {
  const iframeDurations: number[] = [];
  for (let round = 0; round < IFRAME_ROUNDS; round++) {
    for (const fixture of fixtures) {
      iframeDurations.push(await benchmarkIframeBoot(fixture.html));
    }
  }

  const iframeDuration = iframeDurations.reduce(
    (sum, value) => sum + value,
    0,
  );
  console.log("Email rendering benchmark");
  console.log(`Node ${process.version} · ${fixtures.length} real-message fixtures`);
  console.table([
    {
      benchmark: "prepareHtml",
      samples: prepareOperations,
      statistic: "mean",
      "total ms": prepareDuration.toFixed(2),
      "ms/op": (prepareDuration / prepareOperations).toFixed(4),
      "ops/sec": Math.round((prepareOperations / prepareDuration) * 1_000),
    },
    {
      benchmark: "dark iframe boot (JSDOM)",
      samples: iframeDurations.length,
      statistic: "median",
      "total ms": iframeDuration.toFixed(2),
      "ms/op": median(iframeDurations).toFixed(2),
      "ops/sec": Math.round(
        (iframeDurations.length / iframeDuration) * 1_000,
      ),
    },
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
