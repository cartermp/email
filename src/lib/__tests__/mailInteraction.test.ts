import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nextConversationIndex,
  shouldCaptureConversationPointer,
} from "../mailInteraction";

describe("shouldCaptureConversationPointer", () => {
  it("keeps ordinary mouse clicks native", () => {
    assert.equal(shouldCaptureConversationPointer("mouse"), false);
  });

  it("retains touch and pen gesture tracking", () => {
    assert.equal(shouldCaptureConversationPointer("touch"), true);
    assert.equal(shouldCaptureConversationPointer("pen"), true);
  });
});

describe("nextConversationIndex", () => {
  it("starts at the first or last conversation based on direction", () => {
    assert.equal(nextConversationIndex(-1, 5, 1), 0);
    assert.equal(nextConversationIndex(-1, 5, -1), 4);
  });

  it("moves within the list and stops at its bounds", () => {
    assert.equal(nextConversationIndex(1, 5, 1), 2);
    assert.equal(nextConversationIndex(3, 5, -1), 2);
    assert.equal(nextConversationIndex(4, 5, 1), 4);
    assert.equal(nextConversationIndex(0, 5, -1), 0);
  });

  it("returns no selection for an empty list", () => {
    assert.equal(nextConversationIndex(-1, 0, 1), -1);
  });
});
