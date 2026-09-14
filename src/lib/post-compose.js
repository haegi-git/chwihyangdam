import { blocksFromPost } from "./post-content.js";

export function createComposeKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function composeParagraph(text = "", key = createComposeKey()) {
  return {
    key,
    type: "paragraph",
    text,
  };
}

export function composeKeptImage(url) {
  return {
    key: createComposeKey(),
    type: "image",
    kind: "kept",
    url,
  };
}

export function composeLocalImage(file, url) {
  return {
    key: createComposeKey(),
    type: "image",
    kind: "local",
    url,
    file,
  };
}

function joinComposeParagraphTexts(left, right) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  if (left.endsWith("\n") || right.startsWith("\n")) {
    return `${left}${right}`;
  }

  if (/^[.,!?。…\s을를이가은는의와과도만에로고며면]/.test(right)) {
    return `${left}${right}`;
  }

  return `${left}\n\n${right}`;
}

export function mergeAdjacentComposeParagraphs(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const next = [];

  for (const block of blocks) {
    const last = next[next.length - 1];

    if (block?.type === "paragraph" && last?.type === "paragraph") {
      next[next.length - 1] = {
        ...last,
        text: joinComposeParagraphTexts(last.text, block.text),
      };
      continue;
    }

    next.push(block);
  }

  return next;
}

export function ensureComposeTypingSurfaces(blocks) {
  const next = Array.isArray(blocks) ? [...blocks] : [];

  if (!next.some((block) => block?.type === "paragraph")) {
    next.push(composeParagraph());
  }

  if (next[next.length - 1]?.type === "image") {
    next.push(composeParagraph());
  }

  return next;
}

export function normalizeComposeBlocks(blocks) {
  return ensureComposeTypingSurfaces(mergeAdjacentComposeParagraphs(blocks));
}

export function composeBlocksFromPost(post) {
  const mapped = blocksFromPost(post).map((block, index) => {
    if (block.type === "image") {
      return {
        key: `kept-${index}`,
        type: "image",
        kind: "kept",
        url: block.url,
      };
    }

    return {
      key: `para-${index}`,
      type: "paragraph",
      text: block.text,
    };
  });

  const next = mergeAdjacentComposeParagraphs(mapped);

  if (!next.some((block) => block?.type === "paragraph")) {
    next.push(composeParagraph("", "para-empty"));
  }

  if (next[0]?.type === "image") {
    next.unshift(composeParagraph("", "para-lead-in"));
  }

  if (next[next.length - 1]?.type === "image") {
    next.push(composeParagraph("", "para-continue"));
  }

  return next;
}

export function resolveComposeInsertPoint(blocks, focus) {
  const list = Array.isArray(blocks) ? blocks : [];
  const focusedIndex = list.findIndex(
    (block) => block?.type === "paragraph" && block.key === focus?.key,
  );

  if (focusedIndex >= 0) {
    const text = list[focusedIndex].text;
    const rawCursor = Number(focus?.cursor);
    const cursor = Number.isFinite(rawCursor)
      ? Math.min(Math.max(rawCursor, 0), text.length)
      : text.length;

    return { index: focusedIndex, splitAt: cursor };
  }

  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (list[index]?.type === "paragraph") {
      return { index, splitAt: list[index].text.length };
    }
  }

  return { index: 0, splitAt: 0 };
}

export function insertComposeImages(blocks, incoming, focus) {
  const list = Array.isArray(blocks) ? blocks : [];
  const images = Array.isArray(incoming) ? incoming.filter(Boolean) : [];

  if (!images.length) {
    return normalizeComposeBlocks(list);
  }

  const { index, splitAt } = resolveComposeInsertPoint(list, focus);
  const target = list[index];
  let next;

  if (target?.type === "paragraph") {
    const before = target.text.slice(0, splitAt);
    const after = target.text.slice(splitAt);

    if (!target.text) {
      next = [...list.slice(0, index), ...images, { ...target, text: "" }, ...list.slice(index + 1)];
    } else {
      next = [
        ...list.slice(0, index),
        { ...target, text: before },
        ...images,
        composeParagraph(after),
        ...list.slice(index + 1),
      ];
    }
  } else {
    const at = Math.max(0, Math.min(index, list.length));
    next = [...list.slice(0, at), ...images, ...list.slice(at)];
  }

  return normalizeComposeBlocks(next);
}

export function removeComposeImage(blocks, key) {
  return normalizeComposeBlocks((blocks ?? []).filter((block) => block.key !== key));
}

export function paragraphKeyAfterImages(blocks, imageKeys) {
  const keys = new Set(imageKeys);
  const list = Array.isArray(blocks) ? blocks : [];
  let lastImageIndex = -1;

  for (let index = 0; index < list.length; index += 1) {
    if (keys.has(list[index]?.key)) {
      lastImageIndex = index;
    }
  }

  for (let index = lastImageIndex + 1; index < list.length; index += 1) {
    if (list[index]?.type === "paragraph") {
      return list[index].key;
    }
  }

  const lastParagraph = [...list].reverse().find((block) => block?.type === "paragraph");
  return lastParagraph?.key ?? "";
}

export function persistableComposeBlocks(blocks, uploadedByKey) {
  return (blocks ?? [])
    .map((block) => {
      if (block.type === "paragraph") {
        return { type: "paragraph", text: block.text };
      }

      const url = block.kind === "local" ? uploadedByKey.get(block.key) : block.url;
      return url ? { type: "image", url } : null;
    })
    .filter(Boolean);
}
