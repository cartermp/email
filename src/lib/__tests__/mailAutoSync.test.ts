import assert from "node:assert/strict";
import test from "node:test";
import {
  canRunImmediateMailSync,
  getMailAutoSyncDelay,
  mailSyncSnapshotKey,
} from "../mailAutoSync";

test("uses the account-wide Email state as the stable sync key", () => {
  assert.equal(
    mailSyncSnapshotKey({ emailState: "state-42" }),
    "state-42",
  );
});

test("backs off failed background checks without exceeding two minutes", () => {
  assert.equal(getMailAutoSyncDelay(0, 15_000), 15_000);
  assert.equal(getMailAutoSyncDelay(1, 15_000), 30_000);
  assert.equal(getMailAutoSyncDelay(3, 15_000), 120_000);
  assert.equal(getMailAutoSyncDelay(20, 15_000), 120_000);
});

test("throttles immediate checks triggered by repeated focus events", () => {
  assert.equal(canRunImmediateMailSync(10_000, 14_999), false);
  assert.equal(canRunImmediateMailSync(10_000, 15_000), true);
});
