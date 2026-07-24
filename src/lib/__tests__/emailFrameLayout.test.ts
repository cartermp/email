import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lockEmailContentWidth } from "../emailFrameLayout";

describe("lockEmailContentWidth", () => {
  it("locks the first overflowing width instead of feeding growth back forever", () => {
    const availableWidth = 768;
    let lockedWidth: number | null = null;
    const reportedWidths = [808, 848, 888, 928, 968];
    const appliedScales: number[] = [];

    for (const measuredWidth of reportedWidths) {
      lockedWidth = lockEmailContentWidth(
        availableWidth,
        measuredWidth,
        lockedWidth,
      );
      assert.equal(lockedWidth, 808);
      appliedScales.push(availableWidth / lockedWidth);
    }

    assert.ok(appliedScales.every((scale) => scale === appliedScales[0]));
  });

  it("does not lock content that already fits", () => {
    assert.equal(lockEmailContentWidth(768, 768, null), null);
    assert.equal(lockEmailContentWidth(768, 770, null), null);
  });

  it("keeps the intrinsic width while the reader remains narrower", () => {
    assert.equal(lockEmailContentWidth(500, 848, 808), 808);
  });

  it("releases the lock when the reader becomes wide enough", () => {
    assert.equal(lockEmailContentWidth(900, 808, 808), null);
  });

  it("preserves a lock while the reader is temporarily hidden", () => {
    assert.equal(lockEmailContentWidth(0, 0, 808), 808);
  });
});
