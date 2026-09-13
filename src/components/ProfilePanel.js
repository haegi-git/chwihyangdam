"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  announceProfileUpdate,
  avatarUrlFromAuth,
  displayNameFromAuth,
  profileAvatarUrl,
  profileLabel,
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!configured || !user) {
      setError("지금은 프로필을 저장할 수 없습니다.");
      return;
    }

    const nextName = displayName.trim().slice(0, NAME_MAX);
    const nextBio = bio.trim().slice(0, BIO_MAX);
    const nextAvatar = profile?.avatar_url?.trim() || avatarUrlFromAuth(user) || null;
    const updatedAt = new Date().toISOString();

    setPending(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const payload = {
      display_name: nextName || null,
      bio: nextBio || null,
      avatar_url: nextAvatar,
      updated_at: updatedAt,
    };

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("id, display_name, bio, avatar_url, updated_at")
      .maybeSingle();

    let saved = updated;

    if (!updateError && !updated) {
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, ...payload })
        .select("id, display_name, bio, avatar_url, updated_at")
        .maybeSingle();

      if (insertError) {
        setPending(false);
        setError("담아 두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      saved = inserted;
    }

    if (updateError) {
      setPending(false);
      setError("담아 두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setProfile(saved);
    setDisplayName(saved?.display_name ?? nextName);
    setBio(saved?.bio ?? nextBio);
    announceProfileUpdate(saved);
    setPending(false);
    setMessage("잘 담아 두었습니다.");
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
            줄을 조용히 남겨 둘 수 있습니다.
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
            // eslint-disable-next-line @next/next/no-img-element -- 소셜 아바타는 호스트가 다양해 img로 둡니다.
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
          <button type="submit" className="btn-quiet" disabled={pending}>
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
        닉네임과 한 줄을 남겨 두면, 헤더와 공개 자리에 조용히 보입니다. 서두르지
        않아도 됩니다.
      </p>
    </div>
  );
}
