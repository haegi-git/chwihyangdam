"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/lib/paths";
import {
  bodyFromBlocks,
  blocksFromPost,
  imageUrlsFromBlocks,
  serializePostContent,
  textLengthFromBlocks,
  uniquePostImageUrls,
} from "@/lib/post-content";
import {
  POST_IMAGE_MAX_COUNT,
  postImageErrorMessage,
  removeOwnedPostImages,
  uploadPostImages,
  validatePostImageFile,
} from "@/lib/post-images";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const TITLE_MAX = 80;
const BODY_MAX = 4000;

function newBlockKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function paragraphBlock(text = "") {
  return {
    key: newBlockKey(),
    type: "paragraph",
    text,
  };
}

function keptImageBlock(url) {
  return {
    key: newBlockKey(),
    type: "image",
    kind: "kept",
    url,
  };
}

function localImageBlock(file) {
  return {
    key: newBlockKey(),
    type: "image",
    kind: "local",
    url: URL.createObjectURL(file),
    file,
  };
}

function editorBlocksFromPost(post) {
  const blocks = blocksFromPost(post).map((block) => {
    if (block.type === "image") {
      return keptImageBlock(block.url);
    }

    return paragraphBlock(block.text);
  });

  if (!blocks.some((block) => block.type === "paragraph")) {
    blocks.unshift(paragraphBlock());
  }

  return blocks;
}

function persistableBlocks(blocks, uploadedByKey) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return { type: "paragraph", text: block.text };
      }

      const url = block.kind === "local" ? uploadedByKey.get(block.key) : block.url;
      return url ? { type: "image", url } : null;
    })
    .filter(Boolean);
}

function resizeParagraphField(node) {
  if (!node) {
    return;
  }

  node.style.height = "auto";
  node.style.height = `${Math.max(node.scrollHeight, 132)}px`;
}

export default function HobbyPostForm({
  mode = "create",
  tag,
  post,
  cancelHref,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const blocksRef = useRef([]);
  const insertRef = useRef({ index: 0, splitAt: null });
  const focusRef = useRef({ key: "", cursor: 0 });
  const [title, setTitle] = useState(post?.title ?? "");
  const [blocks, setBlocks] = useState(() => editorBlocksFromPost(post));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const isEdit = mode === "edit";
  const imageCount = blocks.filter((block) => block.type === "image").length;
  const remainingImages = POST_IMAGE_MAX_COUNT - imageCount;
  const bodyLength = textLengthFromBlocks(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    return () => {
      for (const block of blocksRef.current) {
        if (block.kind === "local" && block.url?.startsWith("blob:")) {
          URL.revokeObjectURL(block.url);
        }
      }
    };
  }, []);

  function revokeLocal(block) {
    if (block?.kind === "local" && block.url?.startsWith("blob:")) {
      URL.revokeObjectURL(block.url);
    }
  }

  function rememberFocus(key, cursor) {
    focusRef.current = { key, cursor };
  }

  function handleParagraphChange(key, value) {
    setBlocks((current) => {
      const used = textLengthFromBlocks(current.filter((block) => block.key !== key));
      const room = Math.max(0, BODY_MAX - used);

      return current.map((block) =>
        block.key === key && block.type === "paragraph"
          ? { ...block, text: value.slice(0, room) }
          : block,
      );
    });
  }

  function handleMoveBlock(index, delta) {
    setBlocks((current) => {
      const target = index + delta;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    setError("");
  }

  function handleInsertParagraph(index) {
    setBlocks((current) => {
      const next = [...current];
      next.splice(index, 0, paragraphBlock());
      return next;
    });
    setError("");
  }

  function requestImages({ index, splitAt = null }) {
    if (remainingImages <= 0) {
      setError("사진은 여덟 장까지 담을 수 있습니다.");
      return;
    }

    insertRef.current = { index, splitAt };
    fileInputRef.current?.click();
  }

  function handleInsertImageAfter(index) {
    const block = blocks[index];

    if (block?.type === "paragraph" && focusRef.current.key === block.key) {
      const cursor = Math.min(Math.max(focusRef.current.cursor, 0), block.text.length);

      if (cursor > 0 && cursor < block.text.length) {
        requestImages({ index, splitAt: cursor });
        return;
      }

      requestImages({ index: cursor <= 0 ? index : index + 1 });
      return;
    }

    requestImages({ index: index + 1 });
  }

  function handleImagePick(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const { index, splitAt } = insertRef.current;

    setBlocks((current) => {
      const room = POST_IMAGE_MAX_COUNT - current.filter((block) => block.type === "image").length;

      if (room <= 0) {
        setError("사진은 여덟 장까지 담을 수 있습니다.");
        return current;
      }

      const incoming = [];
      let firstInvalid = "";

      for (const file of files) {
        if (incoming.length >= room) {
          firstInvalid = firstInvalid || "사진은 여덟 장까지 담을 수 있습니다.";
          break;
        }

        const invalid = validatePostImageFile(file);
        if (invalid) {
          firstInvalid = firstInvalid || invalid;
          continue;
        }

        incoming.push(localImageBlock(file));
      }

      if (!incoming.length) {
        if (firstInvalid) {
          setError(firstInvalid);
        }
        return current;
      }

      const next = [...current];
      const target = next[index];
      const insertAt = Math.max(0, Math.min(index, next.length));

      if (typeof splitAt === "number" && target?.type === "paragraph") {
        const before = target.text.slice(0, splitAt);
        const after = target.text.slice(splitAt);
        next.splice(index, 1, paragraphBlock(before), ...incoming, paragraphBlock(after));
      } else {
        next.splice(insertAt, 0, ...incoming);
      }

      if (next[next.length - 1]?.type === "image") {
        next.push(paragraphBlock());
      }

      if (firstInvalid) {
        setError(firstInvalid);
      } else {
        setError("");
      }

      return next;
    });
  }

  function handleImageRemove(key) {
    setBlocks((current) => {
      const target = current.find((block) => block.key === key);
      revokeLocal(target);

      const next = current.filter((block) => block.key !== key);
      return next.some((block) => block.type === "paragraph") ? next : [paragraphBlock(), ...next];
    });
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextTitle = title.trim().slice(0, TITLE_MAX);
    const nextBody = bodyFromBlocks(blocks);

    if (!nextTitle || !nextBody) {
      setError("제목과 내용을 모두 적어 주세요.");
      return;
    }

    if (textLengthFromBlocks(blocks) > BODY_MAX) {
      setError(`내용은 ${BODY_MAX}자까지 담을 수 있습니다.`);
      return;
    }

    if (!configured) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPending(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending(false);
      const nextPath = isEdit
        ? `/hobbies/post/${post.id}/edit`
        : `/hobbies/${tag.slug}/new`;
      router.replace(loginHref(nextPath));
      return;
    }

    const localBlocks = blocks.filter((block) => block.type === "image" && block.kind === "local");
    const { urls: uploadedUrls, error: uploadError } = await uploadPostImages(
      supabase,
      user.id,
      localBlocks.map((block) => block.file),
    );

    if (uploadError) {
      setPending(false);
      setError(postImageErrorMessage(uploadError));
      return;
    }

    const uploadedByKey = new Map(
      localBlocks.map((block, index) => [block.key, uploadedUrls[index]]).filter(([, url]) => url),
    );
    const nextBlocks = persistableBlocks(blocks, uploadedByKey);
    const imageUrls = imageUrlsFromBlocks(nextBlocks);
    const content = serializePostContent(nextBlocks);
    const previousUrls = uniquePostImageUrls(
      post?.image_urls,
      imageUrlsFromBlocks(blocksFromPost(post)),
    );
    const keptUrls = blocks.filter((block) => block.kind === "kept").map((block) => block.url);
    const droppedUrls = previousUrls.filter((url) => !keptUrls.includes(url));

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("hobby_posts")
        .update({
          title: nextTitle,
          body: nextBody,
          content,
          image_urls: imageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .eq("author_id", user.id);

      if (updateError) {
        setPending(false);
        setError("글을 고치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      await removeOwnedPostImages(supabase, user.id, droppedUrls);
      setPending(false);
      router.push(`/hobbies/post/${post.id}`);
      router.refresh();
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("hobby_posts")
      .insert({
        author_id: user.id,
        hobby_tag_id: tag.id,
        title: nextTitle,
        body: nextBody,
        content,
        image_urls: imageUrls,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !created?.id) {
      setPending(false);
      setError("글을 남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setPending(false);
    router.push(`/hobbies/post/${created.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper-sheet rise-in rise-in-3 rounded-[1.85rem] p-7 md:p-10"
    >
      <p className="kicker">{tag.name}</p>
      <h2 className="display mt-5 text-3xl text-ink md:text-4xl">
        {isEdit ? "글 고치기" : "글 남기기"}
      </h2>
      <p className="mt-4 leading-8 text-ink-soft">
        {isEdit
          ? "문단 사이에 사진을 두고 천천히 다듬어도 좋습니다."
          : "글을 쓰다가 그 자리에 사진을 넣을 수 있습니다. 짧게라도 좋아요."}
      </p>

      <label className="mt-8 block text-sm text-ink-soft" htmlFor="hobby-post-title">
        제목
      </label>
      <input
        id="hobby-post-title"
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX))}
        className="field-quiet mt-2 rounded-2xl px-4 py-3"
        placeholder="오늘의 한 조각"
        maxLength={TITLE_MAX}
      />
      <p className="mt-2 text-xs tracking-wide text-ink-soft">
        {title.trim().length}/{TITLE_MAX}
      </p>

      <div className="mt-6">
        <p className="text-sm text-ink-soft" id="hobby-post-body-label">
          본문
        </p>
        <p className="mt-1 text-xs leading-6 text-ink-soft">
          문단 사이에 사진을 넣을 수 있습니다. 여덟 장까지, jpeg·png·webp·gif, 한 장에 5MB까지.
        </p>

        <input
          ref={fileInputRef}
          id="hobby-post-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={handleImagePick}
          disabled={pending}
          aria-labelledby="hobby-post-body-label"
        />

        <div className="mt-4">
          <InsertRail
            onParagraph={() => handleInsertParagraph(0)}
            onImage={() => requestImages({ index: 0 })}
            imageDisabled={remainingImages <= 0}
            pending={pending}
          />

          {blocks.map((block, index) => (
            <div key={block.key}>
              {block.type === "paragraph" ? (
                <label className="sr-only" htmlFor={`hobby-post-paragraph-${block.key}`}>
                  문단 {index + 1}
                </label>
              ) : null}

              {block.type === "paragraph" ? (
                <textarea
                  id={`hobby-post-paragraph-${block.key}`}
                  value={block.text}
                  rows={4}
                  className="field-quiet mt-1 resize-none rounded-2xl px-4 py-3"
                  placeholder={index === 0 ? "천천히, 짧게라도 좋아요." : "이어서 적어 주세요."}
                  disabled={pending}
                  onChange={(event) => {
                    handleParagraphChange(block.key, event.target.value);
                    resizeParagraphField(event.target);
                  }}
                  onFocus={(event) => {
                    rememberFocus(block.key, event.target.selectionStart ?? block.text.length);
                    resizeParagraphField(event.target);
                  }}
                  onClick={(event) => rememberFocus(block.key, event.target.selectionStart ?? 0)}
                  onKeyUp={(event) => rememberFocus(block.key, event.target.selectionStart ?? 0)}
                  onSelect={(event) => rememberFocus(block.key, event.target.selectionStart ?? 0)}
                  ref={resizeParagraphField}
                />
              ) : (
                <figure className="relative mt-1 overflow-hidden rounded-2xl border border-line/80">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기·스토리지 URL은 img로 둡니다. */}
                  <img
                    src={block.url}
                    alt=""
                    className="max-h-[28rem] w-full bg-paper-deep/40 object-cover"
                  />
                  <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
                    {index > 0 ? (
                      <button
                        type="button"
                        className="rounded-full bg-card/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors duration-500 hover:bg-sage-mist hover:text-ink"
                        onClick={() => handleMoveBlock(index, -1)}
                        disabled={pending}
                      >
                        위로
                      </button>
                    ) : null}
                    {index < blocks.length - 1 ? (
                      <button
                        type="button"
                        className="rounded-full bg-card/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors duration-500 hover:bg-sage-mist hover:text-ink"
                        onClick={() => handleMoveBlock(index, 1)}
                        disabled={pending}
                      >
                        아래로
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full bg-card/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors duration-500 hover:bg-sage-mist hover:text-ink"
                      onClick={() => handleImageRemove(block.key)}
                      disabled={pending}
                    >
                      내리기
                    </button>
                  </div>
                </figure>
              )}

              <InsertRail
                onParagraph={() => handleInsertParagraph(index + 1)}
                onImage={() => handleInsertImageAfter(index)}
                imageDisabled={remainingImages <= 0}
                pending={pending}
              />
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs tracking-wide text-ink-soft">
          {bodyLength}/{BODY_MAX} · 사진 {imageCount}/{POST_IMAGE_MAX_COUNT}
        </p>
      </div>

      {error ? (
        <p className="mt-5 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-ghost">
          돌아가기
        </Link>
        <button type="submit" className="btn-quiet" disabled={pending}>
          {pending ? "담는 중…" : isEdit ? "고친 글 담기" : "글 남기기"}
        </button>
      </div>
    </form>
  );
}

function InsertRail({ onParagraph, onImage, imageDisabled, pending }) {
  return (
    <div className="flex items-center gap-3 py-2.5 opacity-55 transition-opacity duration-500 hover:opacity-100 focus-within:opacity-100">
      <span className="h-px flex-1 bg-line/80" aria-hidden="true" />
      <button
        type="button"
        className="text-xs tracking-wide text-ink-soft transition-colors duration-500 hover:text-sage-deep disabled:opacity-50"
        onClick={onParagraph}
        disabled={pending}
      >
        글 이어 쓰기
      </button>
      <button
        type="button"
        className="text-xs tracking-wide text-ink-soft transition-colors duration-500 hover:text-sage-deep disabled:opacity-50"
        onClick={onImage}
        disabled={pending || imageDisabled}
      >
        사진 넣기
      </button>
      <span className="h-px flex-1 bg-line/80" aria-hidden="true" />
    </div>
  );
}

