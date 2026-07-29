import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../promisePool";

describe("mapWithConcurrency", () => {
  it("preserves input order while limiting active work", async () => {
    let active = 0;
    let peakActive = 0;

    const results = await mapWithConcurrency(
      [30, 5, 20, 10, 1],
      2,
      async (delay, index) => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        await new Promise((resolve) => setTimeout(resolve, delay));
        active -= 1;
        return index * 2;
      },
    );

    assert.equal(peakActive, 2);
    assert.deepEqual(results, [0, 2, 4, 6, 8]);
  });

  it("rejects an invalid concurrency", async () => {
    await assert.rejects(
      () => mapWithConcurrency([1], 0, async (value) => value),
      /positive integer/,
    );
  });
});
