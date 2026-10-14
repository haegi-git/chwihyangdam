import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isProjectPostImageUrl, normalizePostImageUrls } from "./post-images.js";
import { sanitizePostBlocks } from "./post-content.js";

const base = "https://zindpeseivricksyzvyt.supabase.co";
const userId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const good = `${base}/storage/v1/object/public/post-images/${userId}/post-${fileId}.jpg`;

describe("post image urls", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("allows only this project's public post-images urls", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = base;

    assert.equal(isProjectPostImageUrl(good), true);
    assert.equal(isProjectPostImageUrl("https://evil.example/a.jpg"), false);
    assert.equal(isProjectPostImageUrl("javascript:alert(1)"), false);
    assert.equal(isProjectPostImageUrl(`${base}/storage/v1/object/public/post-images/${userId}/../secret.jpg`), false);
    assert.equal(isProjectPostImageUrl(`${good}?x=1`), false);
    assert.deepEqual(normalizePostImageUrls([good, "https://evil.example/pixel.gif", ""]), [good]);
    assert.deepEqual(
      sanitizePostBlocks([
        { type: "paragraph", text: "본문" },
        { type: "image", url: "https://evil.example/pixel.gif" },
        { type: "image", url: good },
      ]),
      [
        { type: "paragraph", text: "본문" },
        { type: "image", url: good },
      ],
    );
  });
});
