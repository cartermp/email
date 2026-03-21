import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAccountId } from "../jmap";

const MAIL_CAP = "urn:ietf:params:jmap:mail";

describe("getAccountId", () => {
  it("returns the primary mail account ID", () => {
    const session = {
      primaryAccounts: { [MAIL_CAP]: "abc-123" },
    } as any;
    assert.equal(getAccountId(session), "abc-123");
  });

  it("throws when the mail capability is absent", () => {
    const session = { primaryAccounts: {} } as any;
    assert.throws(() => getAccountId(session), /No primary mail account/);
  });

  it("throws when primaryAccounts is empty", () => {
    const session = { primaryAccounts: { "urn:ietf:params:jmap:core": "x" } } as any;
    assert.throws(() => getAccountId(session));
  });
});
