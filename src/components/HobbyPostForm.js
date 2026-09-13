"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginHref } from "@/lib/paths";
import {
  POST_IMAGE_MAX_COUNT,
  normalizePostImageUrls,
  postImageErrorMessage,
  removeOwnedPostImages,
  uploadPostImages,
  validatePostImageFile,
} from "@/lib/post-images";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const TITLE_MAX = 80;
const BODY_MAX = 4000;

function keptSlot(url, index) {
  return {
    key: `kept-${index}-${url}`,
    kind: "kept",
    url,
  };
}

function localSlot(file) {
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    key: `local-${nonce}`,
    kind: "local",
    url: URL.createObjectURL(file),
    file,
  };
}

export default function HobbyPostForm({
  mode = "create",
  tag,
  post,
  cancelHref,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const imagesRef = useRef([]);
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [images, setImages] = useState(() =>
    normalizePostImageUrls(post?.image_urls).map(keptSlot),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const isEdit = mode === "edit";
  const remaining = POST_IMAGE_MAX_COUNT - images.length;

  imagesRef.current = images;

  useEffect(() => {
    return () => {
      for (const item of imagesRef.current) {
        if (item.kind === "local" && item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
      }
    };
  }, []);

  function revokeLocal(item) {
    if (item?.kind === "local" && item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  }

  function handleImagePick(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (!files.length) {
      return;
    }

    setImages((current) => {
      const room = POST_IMAGE_MAX_COUNT - current.length;

      if (room <= 0) {
        setError("사진은 네 장까지 담을 수 있습니다.");
        return current;
      }

      const next = [...current];
      let firstInvalid = "";

      for (const file of files) {
        if (next.length >= POST_IMAGE_MAX_COUNT) {
          firstInvalid = firstInvalid || "사진은 네 장까지 담을 수 있습니다.";
          break;
        }

        const invalid = validatePostImageFile(file);
        if (invalid) {
          firstInvalid = firstInvalid || invalid;
          continue;
        }

        next.push(localSlot(file));
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
    setImages((current) => {
      const target = current.find((item) => item.key === key);
      revokeLocal(target);
      return current.filter((item) => item.key !== key);
    });
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextTitle = title.trim().slice(0, TITLE_MAX);
    const nextBody = body.trim().slice(0, BODY_MAX);

    if (!nextTitle || !nextBody) {
      setError("제목과 내용을 모두 적어 주세요.");
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

    const keptUrls = images.filter((item) => item.kind === "kept").map((item) => item.url);
    const localFiles = images.filter((item) => item.kind === "local").map((item) => item.file);
    const { urls: uploadedUrls, error: uploadError } = await uploadPostImages(
      supabase,
      user.id,
      localFiles,
    );

    if (uploadError) {
      setPending(false);
      setError(postImageErrorMessage(uploadError));
      return;
    }

    const imageUrls = [...keptUrls, ...uploadedUrls];
    const previousUrls = normalizePostImageUrls(post?.image_urls);
    const droppedUrls = previousUrls.filter((url) => !keptUrls.includes(url));

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("hobby_posts")
        .update({
          title: nextTitle,
          body: nextBody,
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
          ? "천천히 다듬어도 좋습니다. 고친 글은 이 자리에 그대로 남습니다."
          : "짧게라도 좋습니다. 이 취향을 곁에 둔 마음을 조용히 적어 주세요."}
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

      <label className="mt-6 block text-sm text-ink-soft" htmlFor="hobby-post-body">
        내용
      </label>
      <textarea
        id="hobby-post-body"
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
        rows={10}
        className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
        placeholder="천천히, 짧게라도 좋아요."
        maxLength={BODY_MAX}
      />
      <p className="mt-2 text-xs tracking-wide text-ink-soft">
        {body.trim().length}/{BODY_MAX}
      </p>

      <div className="mt-6">
        <p className="text-sm text-ink-soft" id="hobby-post-photos-label">
          사진
        </p>
        <p className="mt-1 text-xs leading-6 text-ink-soft">
          네 장까지 담을 수 있습니다. jpeg, png, webp, gif, 한 장에 5MB까지.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((item, index) => (
            <li key={item.key} className="relative overflow-hidden rounded-2xl border border-line/80">
              {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기·스토리지 URL은 img로 둡니다. */}
              <img
                src={item.url}
                alt=""
                className="aspect-square w-full bg-paper-deep/40 object-cover"
              />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-card/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm transition-colors duration-500 hover:bg-sage-mist hover:text-ink"
                onClick={() => handleImageRemove(item.key)}
                disabled={pending}
              >
                내리기
              </button>
              <span className="sr-only">사진 {index + 1}</span>
            </li>
          ))}
          {remaining > 0 ? (
            <li>
              <input
                ref={fileInputRef}
                id="hobby-post-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={handleImagePick}
                disabled={pending}
                aria-labelledby="hobby-post-photos-label"
              />
              <label
                htmlFor="hobby-post-photos"
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line/90 bg-paper/40 px-3 text-center text-sm leading-6 text-ink-soft transition-colors duration-500 hover:bg-sage-mist/70 hover:text-ink ${
                  pending ? "pointer-events-none opacity-60" : ""
                }`}
              >
                사진 고르기
              </label>
            </li>
          ) : null}
        </ul>
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
