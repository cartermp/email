import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AttachmentList from "../../components/AttachmentList";
import {
  isVisibleAttachment,
  visibleAttachments,
} from "../attachments";
import type { EmailBodyPart } from "../types";

function part(overrides: Partial<EmailBodyPart> = {}): EmailBodyPart {
  return {
    blobId: "blob-1",
    name: "report.xlsx",
    size: 1024,
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ...overrides,
  };
}

describe("visibleAttachments", () => {
  it("keeps an explicit attachment even when the sender assigns a Content-ID", () => {
    assert.equal(
      isVisibleAttachment(
        part({ disposition: "attachment", cid: "historical-file-id" }),
      ),
      true,
    );
  });

  it("hides explicitly inline MIME parts", () => {
    assert.equal(
      isVisibleAttachment(part({ disposition: "inline", cid: "logo-id" })),
      false,
    );
  });

  it("treats a Content-ID without a disposition as inline", () => {
    assert.equal(isVisibleAttachment(part({ cid: "logo-id" })), false);
  });

  it("keeps ordinary parts without a Content-ID", () => {
    assert.equal(isVisibleAttachment(part()), true);
  });

  it("omits calendar parts and parts that cannot be downloaded", () => {
    assert.deepEqual(
      visibleAttachments([
        part({ type: "text/calendar" }),
        part({ blobId: undefined }),
      ]),
      [],
    );
  });

  it("renders a historical spreadsheet that has an attachment disposition and Content-ID", () => {
    const html = renderToStaticMarkup(
      createElement(AttachmentList, {
        attachments: [
          part({
            disposition: "attachment",
            cid: "historical-file-id",
            name: "March water bills.xlsx",
          }),
        ],
      }),
    );

    assert.match(html, /Attachments/);
    assert.match(html, /March water bills\.xlsx/);
  });
});
