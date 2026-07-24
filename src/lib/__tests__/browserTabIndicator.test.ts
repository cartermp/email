import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBrowserTabUnreadCount,
  getBrowserTabTitle,
  getUnreadFaviconDataUrl,
  getUnreadFaviconSvg,
} from "../browserTabIndicator";

describe("formatBrowserTabUnreadCount", () => {
  it("shows exact unread totals below 99", () => {
    assert.equal(formatBrowserTabUnreadCount(1), "1");
    assert.equal(formatBrowserTabUnreadCount(98), "98");
  });

  it("caps unread totals at 99+", () => {
    assert.equal(formatBrowserTabUnreadCount(99), "99+");
    assert.equal(formatBrowserTabUnreadCount(412), "99+");
  });

  it("treats invalid, negative, and fractional counts safely", () => {
    assert.equal(formatBrowserTabUnreadCount(0), "");
    assert.equal(formatBrowserTabUnreadCount(-2), "");
    assert.equal(formatBrowserTabUnreadCount(Number.NaN), "");
    assert.equal(formatBrowserTabUnreadCount(8.9), "8");
  });
});

describe("getBrowserTabTitle", () => {
  it("puts the unread count first so it remains visible in a narrow tab", () => {
    assert.equal(getBrowserTabTitle(7), "(7) Mail");
    assert.equal(getBrowserTabTitle(99), "(99+) Mail");
  });

  it("restores the normal title when the inbox is clear", () => {
    assert.equal(getBrowserTabTitle(0), "Mail");
  });
});

describe("getUnreadFaviconSvg", () => {
  it("uses the themed mail mark with a readable capped count", () => {
    const svg = getUnreadFaviconSvg(120);

    assert.match(svg, /fill="#0f172a"/);
    assert.match(svg, /fill="#2563eb"/);
    assert.match(svg, />99\+<\/text>/);
  });

  it("encodes the generated SVG as a favicon data URL", () => {
    const dataUrl = getUnreadFaviconDataUrl(12);

    assert.match(dataUrl, /^data:image\/svg\+xml,/);
    assert.match(decodeURIComponent(dataUrl), />12<\/text>/);
  });
});
