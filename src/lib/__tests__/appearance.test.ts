import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPEARANCE_BOOTSTRAP_SCRIPT,
  DEFAULT_APPEARANCE,
  parseAppearancePreferences,
  resolveDarkTheme,
} from "../appearance";

describe("parseAppearancePreferences", () => {
  it("uses quiet defaults when no preference is stored", () => {
    assert.deepEqual(parseAppearancePreferences(null), DEFAULT_APPEARANCE);
  });

  it("restores valid saved preferences", () => {
    assert.deepEqual(
      parseAppearancePreferences(
        JSON.stringify({
          theme: "dark",
          density: "compact",
          readerWidth: "wide",
        }),
      ),
      { theme: "dark", density: "compact", readerWidth: "wide" },
    );
  });

  it("falls back field-by-field for invalid or older values", () => {
    assert.deepEqual(
      parseAppearancePreferences(
        JSON.stringify({
          theme: "sepia",
          density: "compact",
        }),
      ),
      {
        theme: "system",
        density: "compact",
        readerWidth: "comfortable",
      },
    );
  });

  it("survives malformed storage", () => {
    assert.deepEqual(
      parseAppearancePreferences("{not-json"),
      DEFAULT_APPEARANCE,
    );
  });
});

describe("resolveDarkTheme", () => {
  it("respects explicit themes and delegates system mode", () => {
    assert.equal(resolveDarkTheme("dark", false), true);
    assert.equal(resolveDarkTheme("light", true), false);
    assert.equal(resolveDarkTheme("system", true), true);
    assert.equal(resolveDarkTheme("system", false), false);
  });
});

describe("appearance bootstrap", () => {
  it("sets theme, density, and reader width before hydration", () => {
    assert.match(APPEARANCE_BOOTSTRAP_SCRIPT, /classList\.toggle/);
    assert.match(APPEARANCE_BOOTSTRAP_SCRIPT, /dataset\.density/);
    assert.match(APPEARANCE_BOOTSTRAP_SCRIPT, /dataset\.readerWidth/);
  });
});
