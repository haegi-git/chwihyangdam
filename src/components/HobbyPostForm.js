"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/lib/paths";
import {
  composeBlocksFromPost,
  composeLocalImage,
  insertComposeImages,
  paragraphKeyAfterImages,
  persistableComposeBlocks,
  removeComposeImage,
} from "@/lib/post-compose";
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
const LINE_HEIGHT = 36;

function resizeParagraphField(node) {
  if (!node) {
    return;
  }

  node.style.height = "auto";
  node.style.height = `${Math.max(node.scrollHeight, LINE_HEIGHT)}px`;
}

function localImageBlock(file) {
  return composeLocalImage(file, URL.createObjectURL(file));
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
  const focusRef = useRef({ key: "", cursor: 0 });
  const pendingFocusRef = useRef(null);
  const paragraphNodes = useRef(new Map());
  const [title, setTitle] = useState(post?.title ?? "");
  const [blocks, setBlocks] = useState(() => composeBlocksFromPost(post));
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

  useEffect(() => {
    for (const node of paragraphNodes.current.values()) {
      resizeParagraphField(node);
    }

    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;
    const node = paragraphNodes.current.get(pendingFocus.key);
    if (!node) {
      return;
    }

    node.focus();
    const pos =
      pendingFocus.cursor === "end"
        ? node.value.length
        : Math.min(Math.max(pendingFocus.cursor ?? 0, 0), node.value.length);
    node.setSelectionRange(pos, pos);
    focusRef.current = { key: pendingFocus.key, cursor: pos };
    resizeParagraphField(node);
  }, [blocks]);

  function revokeLocal(block) {
    if (block?.kind === "local" && block.url?.startsWith("blob:")) {
      URL.revokeObjectURL(block.url);
    }
  }

  function bindParagraphNode(key, node) {
    if (node) {
      paragraphNodes.current.set(key, node);
      resizeParagraphField(node);
    } else {
      paragraphNodes.current.delete(key);
    }
  }

  function rememberFocus(key, cursor) {
    focusRef.current = { key, cursor };
  }

  function focusParagraph(key, cursor = "end") {
    const node = paragraphNodes.current.get(key);
    if (!node) {
      pendingFocusRef.current = { key, cursor };
      return;
    }

    node.focus();
    const pos = cursor === "end" ? node.value.length : Math.min(Math.max(cursor, 0), node.value.length);
    node.setSelectionRange(pos, pos);
    rememberFocus(key, pos);
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

  function handleParagraphKeyDown(event, index) {
    const node = event.target;
    const cursor = node.selectionStart ?? 0;
    const atStart = cursor === 0 && node.selectionEnd === 0;
    const atEnd = cursor === node.value.length && node.selectionEnd === node.value.length;

    if (event.key === "ArrowUp" && atStart) {
      const previous = blocks
        .slice(0, index)
        .reverse()
        .find((block) => block.type === "paragraph");
      if (previous) {
        event.preventDefault();
        focusParagraph(previous.key, "end");
      }
      return;
    }

    if (event.key === "ArrowDown" && atEnd) {
      const following = blocks.slice(index + 1).find((block) => block.type === "paragraph");
      if (following) {
        event.preventDefault();
        focusParagraph(following.key, 0);
      }
      return;
    }

    if (event.key !== "Backspace" || !atStart) {
      return;
    }

    const previous = blocks[index - 1];
    const current = blocks[index];
    if (previous?.type !== "image" || current?.type !== "paragraph" || current.text) {
      return;
    }

    event.preventDefault();
    handleImageRemove(previous.key);
  }

  function handlePhotoButton() {
    if (remainingImages <= 0) {
      setError("사진은 여덟 장까지 담을 수 있습니다.");
      return;
    }

    fileInputRef.current?.click();
  }

  function handleImagePick(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (!files.length) {
      return;
    }

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

      const next = insertComposeImages(current, incoming, focusRef.current);
      const focusKey = paragraphKeyAfterImages(next, incoming.map((block) => block.key));
      pendingFocusRef.current = { key: focusKey, cursor: 0 };

      if (firstInvalid) {
        setError(firstInvalid);
      } else {
        setError("");
      }

      return next;
    });
  }

  function handleImageRemove(key) {
    const current = blocksRef.current;
    const target = current.find((block) => block.key === key);
    const targetIndex = current.findIndex((block) => block.key === key);
    const previousParagraph = current
      .slice(0, Math.max(targetIndex, 0))
      .reverse()
      .find((block) => block.type === "paragraph");

    revokeLocal(target);
    const next = removeComposeImage(current, key);
    setBlocks(next);

    if (previousParagraph) {
      pendingFocusRef.current = { key: previousParagraph.key, cursor: "end" };
    }

    setError("");
  }

  function handleSurfaceClick(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const lastParagraph = [...blocks].reverse().find((block) => block.type === "paragraph");
    if (lastParagraph) {
      focusParagraph(lastParagraph.key, "end");
    }
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
    const nextBlocks = persistableComposeBlocks(blocks, uploadedByKey);
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
          ? "글을 쓰다가 사진을 넣으면 그 자리에 남습니다. 천천히 다듬어도 좋습니다."
          : "한 장의 종이에 적듯 쓰다가, 사진을 넣으면 커서 자리에 들어갑니다."}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-ink-soft" id="hobby-post-body-label">
              본문
            </p>
            <p className="mt-1 text-xs leading-6 text-ink-soft" id="hobby-post-body-hint">
              글 쓰다가 사진 넣기를 누르면 커서 위치에 들어가요.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-line/90 bg-card/80 px-4 text-sm text-ink-soft transition-colors duration-500 hover:bg-sage-mist hover:text-ink disabled:opacity-50"
            onClick={handlePhotoButton}
            disabled={pending || remainingImages <= 0}
          >
            사진 넣기
          </button>
        </div>
        <p className="mt-1 text-xs leading-6 text-ink-soft">
          여덟 장까지, jpeg·png·webp·gif, 한 장에 5MB까지.
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

        <div
          className="compose-surface mt-4 cursor-text rounded-[1.35rem] px-5 py-6 md:px-7 md:py-8"
          onClick={handleSurfaceClick}
          role="group"
          aria-labelledby="hobby-post-body-label"
          aria-describedby="hobby-post-body-hint"
        >
          <div className="space-y-7">
            {blocks.map((block, index) =>
              block.type === "paragraph" ? (
                <div key={block.key}>
                  <label className="sr-only" htmlFor={`hobby-post-paragraph-${block.key}`}>
                    {index === 0 ? "본문" : "이어지는 글"}
                  </label>
                  <textarea
                    id={`hobby-post-paragraph-${block.key}`}
                    value={block.text}
                    rows={1}
                    className="compose-field"
                    placeholder={
                      !block.text && !blocks.some((item) => item.type === "image")
                        ? "천천히, 짧게라도 좋아요."
                        : !block.text && index === 0
                          ? "사진 위에 적어도 좋아요."
                          : !block.text
                            ? "이어서 적어도 좋아요."
                            : undefined
                    }
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
                    onKeyDown={(event) => handleParagraphKeyDown(event, index)}
                    onKeyUp={(event) => rememberFocus(block.key, event.target.selectionStart ?? 0)}
                    onSelect={(event) => rememberFocus(block.key, event.target.selectionStart ?? 0)}
                    ref={(node) => bindParagraphNode(block.key, node)}
                  />
                </div>
              ) : (
                <figure key={block.key} className="group relative m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기·스토리지 URL은 img로 둡니다. */}
                  <img
                    src={block.url}
                    alt=""
                    className="w-full rounded-2xl border border-line/70 bg-paper-deep/40 object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-card/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors duration-500 hover:bg-sage-mist hover:text-ink"
                    onClick={() => handleImageRemove(block.key)}
                    disabled={pending}
                  >
                    내리기
                  </button>
                </figure>
              ),
            )}
          </div>
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
