import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { AVATAR_PIXEL_SIZE, renderAvatarImage } from "../avatarImage";

describe("renderAvatarImage", () => {
  it("normalizes a small raster icon to a dense square PNG", async () => {
    const source = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: "#24292f",
      },
    })
      .png()
      .toBuffer();

    const result = await renderAvatarImage(source);
    const metadata = await sharp(result).metadata();

    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, AVATAR_PIXEL_SIZE);
    assert.equal(metadata.height, AVATAR_PIXEL_SIZE);
  });

  it("rasterizes vector artwork at the full output resolution", async () => {
    const vector = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16"/></svg>',
    );

    const result = await renderAvatarImage(vector);
    const metadata = await sharp(result).metadata();

    assert.equal(metadata.width, AVATAR_PIXEL_SIZE);
    assert.equal(metadata.height, AVATAR_PIXEL_SIZE);
  });
});
