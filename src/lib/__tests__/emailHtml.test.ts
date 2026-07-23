import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  prepareHtml,
  prepareTextBody,
  resolveEmbeddedImages,
} from "../emailHtml";

function documentWith(body: string, head = "") {
  return `<html><head>${head}</head><body>${body}</body></html>`;
}

describe("prepareHtml", () => {
  it("injects into an existing head without losing its attributes", () => {
    const result = prepareHtml(
      '<html><head lang="en"><title>Message</title></head><body>Hi</body></html>',
    );
    assert.ok(result.includes('<head lang="en">'));
    assert.ok(result.includes("<title>Message</title>"));
    assert.ok(result.includes("iframe-resize"));
  });

  it("wraps an HTML fragment in a complete document", () => {
    const result = prepareHtml("<p>Hello</p>");
    assert.ok(result.startsWith("<html><head>"));
    assert.ok(result.includes("<body><p>Hello</p></body>"));
  });

  it("preserves a sender-provided responsive viewport", () => {
    const viewport =
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    const result = prepareHtml(documentWith("<p>Hello</p>", viewport));
    assert.equal((result.match(/name="viewport"/g) ?? []).length, 1);
    assert.ok(result.includes(viewport));
  });

  it("adds a responsive viewport only when one is absent", () => {
    const result = prepareHtml(documentWith("<p>Hello</p>"));
    assert.ok(
      result.includes(
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      ),
    );
  });

  it("does not rewrite table, cell, or responsive helper-class geometry", () => {
    const result = prepareHtml(
      documentWith(
        '<table class="flexible" width="600"><tr><td width="480">Text</td></tr></table>',
      ),
    );
    assert.ok(!result.includes("data-mobile-friendly"));
    assert.ok(!result.includes("table[width]{width:100%"));
    assert.ok(!result.includes("td[width]"));
    assert.ok(!result.includes('[class~="hide"]'));
  });

  it("contains images without cropping while preserving their aspect ratio", () => {
    const result = prepareHtml(documentWith('<img src="hero.jpg" width="1200">'));
    assert.ok(result.includes("max-width:100%!important"));
    assert.ok(result.includes("height:auto!important"));
    assert.ok(result.includes("object-fit:contain!important"));
    assert.ok(!result.includes("img[width]{display:block"));
  });

  it("keeps sender colours intact instead of applying a dark-mode inversion filter", () => {
    const result = prepareHtml(
      documentWith('<div style="color:#c026d3">Brand colour</div>'),
    );
    assert.ok(!result.includes("filter:invert"));
    assert.ok(!result.includes("hue-rotate"));
    assert.ok(result.includes("color:#c026d3"));
  });

  it("measures full scroll geometry and batches updates in animation frames", () => {
    const result = prepareHtml(documentWith("<p>Hello</p>"));
    assert.ok(result.includes("root?root.scrollWidth:0"));
    assert.ok(result.includes("body?body.scrollWidth:0"));
    assert.ok(result.includes("requestAnimationFrame(measure)"));
    assert.ok(result.includes("ResizeObserver"));
    assert.ok(result.includes("document.fonts.ready"));
  });

  describe("links", () => {
    it("linkifies a bare URL without nesting an existing link", () => {
      const result = prepareHtml(
        documentWith(
          'See https://example.com. <a href="https://openai.com">https://openai.com</a>',
        ),
      );
      assert.ok(result.includes('<a href="https://example.com"'));
      assert.ok(result.includes("</a>."));
      assert.equal((result.match(/<a /g) ?? []).length, 2);
    });

    it("does not linkify URLs in style or script blocks", () => {
      const result = prepareHtml(
        '<html><head><style>.x{background:url(https://example.com/a.png)}</style><script>const x="https://example.com"</script></head><body>Hi</body></html>',
      );
      assert.ok(!result.includes('<a href="https://example.com'));
    });

    it("unwraps Google Calendar redirect links", () => {
      const target = "https://example.zoom.us/j/123";
      const wrapped = `https://www.google.com/url?q=${encodeURIComponent(target)}&sa=D`;
      const result = prepareHtml(
        documentWith(`<a href="${wrapped}">Join meeting</a>`),
      );
      assert.ok(result.includes(`href="${target}"`));
      assert.ok(!result.includes("google.com/url"));
    });
  });

  describe("quoted thread history", () => {
    it("includes common client selectors only when quote stripping is requested", () => {
      const stripped = prepareHtml(documentWith("<p>Reply</p>"), {
        stripQuotes: true,
      });
      assert.ok(stripped.includes('[data-quoted-reply="true"]'));
      assert.ok(stripped.includes('blockquote[type="cite"]'));
      assert.ok(stripped.includes(".gmail_quote"));
      assert.ok(stripped.includes("#divRplyFwdMsg"));

      const full = prepareHtml(documentWith("<p>Reply</p>"));
      assert.ok(!full.includes('[data-quoted-reply="true"]'));
      assert.ok(!full.includes(".gmail_quote"));
      assert.ok(!full.includes("#divRplyFwdMsg"));
    });
  });
});

describe("resolveEmbeddedImages", () => {
  it("maps cid image references to authenticated inline downloads", () => {
    const result = resolveEmbeddedImages(
      '<img src="cid:hero@message"><table background="CID:bg@message"></table>',
      [
        {
          type: "image/png",
          size: 10,
          blobId: "blob/hero",
          name: "hero image.png",
          cid: "hero@message",
          disposition: "inline",
        },
        {
          type: "image/jpeg",
          size: 10,
          blobId: "blob-bg",
          cid: "<bg@message>",
        },
      ],
    );
    assert.ok(result.includes("/api/download?"));
    assert.ok(result.includes("blobId=blob%2Fhero"));
    assert.ok(result.includes("inline=true"));
    assert.ok(!result.toLowerCase().includes("cid:"));
  });

  it("leaves an unmatched cid reference untouched", () => {
    assert.equal(
      resolveEmbeddedImages('<img src="cid:missing">', []),
      '<img src="cid:missing">',
    );
  });
});

describe("real-message rendering fixtures", () => {
  const fixtures = [
    "new-dental-appointment-for-phillip_Stp0bVMUG5Sc.json",
    "start-small-and-scale-when-it-matters_Stp09-UTL1Lw.json",
    "plan-your-weekend-10-open-houses-for-sale-near-bellevue-wa-9_Stp09-_Y2kmN.json",
  ];

  for (const fixture of fixtures) {
    it(`preserves the sender layout for ${fixture}`, () => {
      const email = JSON.parse(
        readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), "utf8"),
      ) as {
        htmlBody: Array<{ partId?: string }>;
        bodyValues: Record<string, { value: string }>;
      };
      const partId = email.htmlBody[0]?.partId;
      assert.ok(partId);
      const original = email.bodyValues[partId].value;
      const result = prepareHtml(original);

      assert.ok(result.length >= original.length);
      assert.ok(!result.includes("data-mobile-friendly"));
      assert.ok(!result.includes("filter:invert"));
      assert.ok(result.includes("iframe-resize"));
      if (/name=["']viewport["']/i.test(original)) {
        assert.equal(
          (result.match(/name=["']viewport["']/gi) ?? []).length,
          (original.match(/name=["']viewport["']/gi) ?? []).length,
        );
      }
    });
  }
});

describe("prepareTextBody", () => {
  it("escapes markup and preserves line breaks", () => {
    const result = prepareTextBody("<b>Hello</b>\nNext");
    assert.ok(result.includes("&lt;b&gt;Hello&lt;/b&gt;\nNext"));
    assert.ok(result.includes("white-space:pre-wrap"));
  });

  it("uses neutral system typography and dark-mode colours", () => {
    const result = prepareTextBody("Hello");
    assert.ok(result.includes("BlinkMacSystemFont"));
    assert.ok(result.includes("#0f172a"));
    assert.ok(result.includes("#e2e8f0"));
  });

  it("strips quoted lines only when requested", () => {
    const text = "My reply\n\nOn Monday, Alice wrote:\n> Previous";
    const stripped = prepareTextBody(text, { stripQuotes: true });
    assert.ok(stripped.includes("My reply"));
    assert.ok(!stripped.includes("Alice wrote"));
    assert.ok(!stripped.includes("&gt; Previous"));

    const full = prepareTextBody(text);
    assert.ok(full.includes("&gt; Previous"));
  });
});
