import { normalizePostImageUrls } from "./post-images.js";

export const POST_CONTENT_VERSION = 1;

export function isPostParagraphBlock(block) {
  return Boolean(block) && block.type === "paragraph" && typeof block.text === "string";
}

export function isPostImageBlock(block) {
  return Boolean(block) && block.type === "image" && typeof block.url === "string" && Boolean(block.url.trim());
}

export function isStructuredPostContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  if (value.version !== POST_CONTENT_VERSION || !Array.isArray(value.blocks)) {
    return false;
  }

  return value.blocks.some((block) => isPostParagraphBlock(block) || isPostImageBlock(block));
}

export function sanitizePostBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const next = [];

  for (const block of blocks) {
    if (isPostParagraphBlock(block)) {
      next.push({
        type: "paragraph",
        text: block.text.replace(/\r\n/g, "\n"),
      });
      continue;
    }

    if (isPostImageBlock(block)) {
      next.push({
        type: "image",
        url: block.url.trim(),
      });
    }
  }

  while (next.length && next[0].type === "paragraph" && !next[0].text.trim()) {
    next.shift();
  }

  while (next.length && next[next.length - 1].type === "paragraph" && !next[next.length - 1].text.trim()) {
    next.pop();
  }

  return next.filter((block, index, list) => {
    if (block.type !== "paragraph") {
      return true;
    }

    if (block.text.trim()) {
      return true;
    }

    const prev = list[index - 1];
    const following = list[index + 1];
    return prev?.type === "image" && following?.type === "image";
  });
}

export function fallbackPostBlocks(body, imageUrls) {
  const text = String(body ?? "").replace(/\r\n/g, "\n");
  const blocks = [];

  if (text.trim()) {
    blocks.push({
      type: "paragraph",
      text,
    });
  }

  for (const url of normalizePostImageUrls(imageUrls)) {
    blocks.push({
      type: "image",
      url,
    });
  }

  return blocks;
}

export function blocksFromPost(post) {
  if (isStructuredPostContent(post?.content)) {
    return sanitizePostBlocks(post.content.blocks);
  }

  return fallbackPostBlocks(post?.body, post?.image_urls);
}

export function serializePostContent(blocks) {
  return {
    version: POST_CONTENT_VERSION,
    blocks: sanitizePostBlocks(blocks),
  };
}

export function bodyFromBlocks(blocks) {
  return sanitizePostBlocks(blocks)
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function imageUrlsFromBlocks(blocks) {
  return sanitizePostBlocks(blocks)
    .filter((block) => block.type === "image")
    .map((block) => block.url);
}

export function textLengthFromBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return 0;
  }

  return blocks
    .filter((block) => isPostParagraphBlock(block))
    .reduce((sum, block) => sum + block.text.trim().length, 0);
}

export function uniquePostImageUrls(...lists) {
  const seen = new Set();
  const urls = [];

  for (const list of lists) {
    for (const url of normalizePostImageUrls(list)) {
      if (seen.has(url)) {
        continue;
      }

      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}
