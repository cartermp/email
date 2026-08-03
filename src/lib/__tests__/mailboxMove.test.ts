import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMailboxMoveNotice,
  reconcileMailboxMoveIds,
} from "../mailboxMove";

describe("optimistic mailbox moves", () => {
  it("hides moved messages and restores them on rollback", () => {
    const moved = applyMailboxMoveNotice(new Set(["existing"]), {
      emailIds: ["email-1", "email-2"],
      phase: "move",
    });
    assert.deepEqual([...moved].sort(), ["email-1", "email-2", "existing"]);

    const reverted = applyMailboxMoveNotice(moved, {
      emailIds: ["email-1", "email-2"],
      phase: "revert",
    });
    assert.deepEqual([...reverted], ["existing"]);
  });

  it("keeps a row hidden through unrelated refreshes", () => {
    const reconciled = reconcileMailboxMoveIds(
      new Set(["moved-email"]),
      new Set(["moved-email", "other-email"]),
    );
    assert.deepEqual([...reconciled], ["moved-email"]);
  });

  it("drops the marker after refreshed source data reflects the move", () => {
    const reconciled = reconcileMailboxMoveIds(
      new Set(["moved-email"]),
      new Set(["other-email"]),
    );
    assert.equal(reconciled.size, 0);
  });
});
