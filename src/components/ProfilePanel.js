"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AVATAR_BUCKET,
  announceProfileUpdate,
  avatarErrorMessage,
  avatarObjectPath,
  displayNameFromAuth,
  profileAvatarUrl,
  profileLabel,
  validateAvatarFile,
  withCacheBust,
} from "@/lib/profiles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const NAME_MAX = 40;
const BIO_MAX = 280;

export default function ProfilePanel() {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState(() => (configured ? undefined : null));
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, updated_at")
        .eq("id", nextUser.id)
        .maybeSingle();

      setProfile(row);
      setDisplayName(row?.display_name?.trim() || displayNameFromAuth(nextUser));
      setBio(row?.bio ?? "");
    });

    return undefined;
  }, [configured]);

  async function persistProfile({ nextName, nextBio, nextAvatar }) {
    const supabase = createClient();
    const payload = {
      display_name: nextName || null,
      bio: nextBio || null,
      avatar_url: nextAvatar || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("id, display_name, bio, avatar_url, updated_at")
      .maybeSingle();

    if (updateError) {
      return { saved: null, persistError: updateError };
    }

    if (updated) {
      return { saved: updated, persistError: null };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, ...payload })
      .select("id, display_name, bio, avatar_url, updated_at")
      .maybeSingle();

    return { saved: inserted, persistError: insertError };
  }

  function applySaved(saved, nextName, nextBio) {
    setProfile(saved);
    setDisplayName(saved?.display_name ?? nextName);
    setBio(saved?.bio ?? nextBio);
    announceProfileUpdate(saved);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!configured || !user) {
      setError("지금은 프로필을 저장할 수 없습니다.");
      return;
    }

    const nextName = displayName.trim().slice(0, NAME_MAX);
    const nextBio = bio.trim().slice(0, BIO_MAX);
    const nextAvatar = profile?.avatar_url?.trim() || null;

    setPending(true);
    setError("");
    setMessage("");

    const { saved, persistError } = await persistProfile({
      nextName,
      nextBio,
      nextAvatar,
    });

    if (persistError || !saved) {
      setPending(false);
      setError("담아 두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    applySaved(saved, nextName, nextBio);
    setPending(false);
    setMessage("잘 담아 두었습니다.");
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !configured || !user) {
      return;
    }

    const invalid = validateAvatarFile(file);
    if (invalid) {
      setError(invalid);
      setMessage("");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const path = avatarObjectPath(user.id, file);
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (uploadError) {
      setUploading(false);
      setError(avatarErrorMessage(uploadError));
      return;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const publicUrl = withCacheBust(data.publicUrl);
    const nextName = displayName.trim().slice(0, NAME_MAX);
    const nextBio = bio.trim().slice(0, BIO_MAX);

    const { saved, persistError } = await persistProfile({
      nextName,
      nextBio,
      nextAvatar: publicUrl,
    });

    if (persistError || !saved) {
      setUploading(false);
      setError("사진은 올렸지만 프로필에 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    const keepName = path.split("/").pop();
    const { data: objects } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
    const stale = (objects ?? [])
      .map((object) => object.name)
      .filter((name) => name && name !== keepName)
      .map((name) => `${user.id}/${name}`);

    if (stale.length) {
      await supabase.storage.from(AVATAR_BUCKET).remove(stale);
    }

    applySaved(saved, nextName, nextBio);
    setUploading(false);
    setMessage("사진을 담아 두었습니다.");
  }

  async function handleAvatarRemove() {
    if (!configured || !user) {
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { data: objects } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);

    if (objects?.length) {
      const { error: removeError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(objects.map((object) => `${user.id}/${object.name}`));

      if (removeError) {
        setUploading(false);
        setError("사진을 내리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
    }

    const nextName = displayName.trim().slice(0, NAME_MAX);
    const nextBio = bio.trim().slice(0, BIO_MAX);
    const { saved, persistError } = await persistProfile({
      nextName,
      nextBio,
      nextAvatar: null,
    });

    if (persistError || !saved) {
      setUploading(false);
      setError("사진을 내리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    applySaved(saved, nextName, nextBio);
    setUploading(false);
    setMessage("사진을 내렸습니다.");
  }

  if (user === undefined) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <Intro />
        <div className="paper-sheet min-h-[22rem] rounded-[2.2rem]" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <Intro />
        <section className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-12 text-center md:px-12 md:py-16">
          <p className="kicker justify-center">아직 비어 있습니다</p>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">먼저 들어와 주세요</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            프로필은 들어와 있는 분만 고칠 수 있습니다. 로그인하면 닉네임과 한
            줄, 사진을 조용히 남겨 둘 수 있습니다.
          </p>
          <Link href="/login" className="btn-quiet mt-10">
            로그인
          </Link>
          {!configured ? (
            <p className="mt-8 text-sm leading-7 text-ink-soft" role="status">
              로컬에서는 <code className="font-serif">.env.local</code>에
              Supabase 주소를 적어 주세요.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const photo = profileAvatarUrl(profile, user);
  const label = profileLabel(profile, user);
  const initial = label.slice(0, 1);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <Intro />

      <form
        onSubmit={handleSubmit}
        className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-10 md:px-12 md:py-14"
      >
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
            <img
              src={photo}
              alt=""
              className="h-16 w-16 rounded-full border border-line object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-line bg-sage-mist font-serif text-2xl text-sage-deep"
              aria-hidden="true"
            >
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="kicker">나의 자리</p>
            <p className="mt-2 truncate text-sm text-ink-soft">{user.email || label}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleAvatarChange}
                disabled={pending || uploading}
              />
              <label
                htmlFor="profile-avatar"
                className={`inline-flex cursor-pointer items-center rounded-full border border-line/90 px-3.5 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-sage-mist/80 hover:text-ink ${
                  pending || uploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {uploading ? "올리는 중…" : "사진 고르기"}
              </label>
              {profile?.avatar_url?.trim() ? (
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-paper-deep/80 hover:text-ink"
                  onClick={handleAvatarRemove}
                  disabled={pending || uploading}
                >
                  사진 내리기
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="mt-9 block text-sm text-ink-soft" htmlFor="profile-name">
          닉네임
        </label>
        <input
          id="profile-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value.slice(0, NAME_MAX))}
          className="field-quiet mt-2 rounded-2xl px-4 py-3"
          placeholder="천천히 부를 이름"
          maxLength={NAME_MAX}
          autoComplete="nickname"
        />
        <p className="mt-2 text-xs tracking-wide text-ink-soft">
          {displayName.trim().length}/{NAME_MAX}
        </p>

        <label className="mt-6 block text-sm text-ink-soft" htmlFor="profile-bio">
          한 줄 소개
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX))}
          rows={5}
          className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
          placeholder="곁에 두고 싶은 취향을 짧게."
          maxLength={BIO_MAX}
        />
        <p className="mt-2 text-xs tracking-wide text-ink-soft">
          {bio.trim().length}/{BIO_MAX}
        </p>

        {error ? (
          <p className="mt-5 text-sm leading-7 text-clay" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 text-sm leading-7 text-sage-deep" role="status">
            {message}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/profile/${user.id}`}
            className="text-sm text-sage-deep underline-offset-8 hover:underline"
          >
            남들이 보는 자리
          </Link>
          <button type="submit" className="btn-quiet" disabled={pending || uploading}>
            {pending ? "담는 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Intro() {
  return (
    <div>
      <p className="kicker rise-in">나의 자리</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">프로필</h1>
      <p className="rise-in rise-in-2 mt-8 max-w-md text-lg leading-9 text-ink-soft">
        닉네임과 한 줄, 사진을 남겨 두면 헤더와 공개 자리에 조용히 보입니다.
        서두르지 않아도 됩니다.
      </p>
    </div>
  );
}
