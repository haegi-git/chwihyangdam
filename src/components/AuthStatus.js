"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PROFILE_UPDATED_EVENT,
  isAdminUser,
  profileAvatarUrl,
  profileLabel,
} from "@/lib/profiles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AuthStatus({ onNavigate, variant = "header" }) {
  const router = useRouter();
  const [user, setUser] = useState(() => (isSupabaseConfigured() ? undefined : null));
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return undefined;
    }

    const supabase = createClient();

    function applyUser(nextUser) {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        return;
      }

      supabase
        .from("profiles")
        .select("display_name, avatar_url, is_admin")
        .eq("id", nextUser.id)
        .maybeSingle()
        .then(({ data }) => {
          setProfile(data);
        });
    }

    supabase.auth.getUser().then(({ data }) => {
      applyUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    function onProfileUpdated(event) {
      if (event.detail) {
        setProfile((current) => ({
          ...current,
          ...event.detail,
        }));
      }
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
  }, []);

  async function handleSignOut() {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    onNavigate?.();
    router.refresh();
    router.push("/");
  }

  const isMenu = variant === "menu";

  if (user === undefined) {
    return (
      <span
        className={
          isMenu
            ? "block h-12 rounded-2xl bg-paper-deep/60"
            : "inline-flex h-9 min-w-[4.2rem] rounded-full bg-paper-deep/70"
        }
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={
          isMenu
            ? "block rounded-2xl px-4 py-3 text-base text-ink hover:bg-paper-deep/80"
            : "nav-link"
        }
        onClick={onNavigate}
      >
        로그인
      </Link>
    );
  }

  const name = profileLabel(profile, user);
  const photo = profileAvatarUrl(profile, user);
  const initial = name.slice(0, 1);
  const admin = isAdminUser(profile);

  function face(className = "auth-avatar") {
    if (photo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
        <img src={photo} alt="" className={className} referrerPolicy="no-referrer" />
      );
    }

    return (
      <span className={className} aria-hidden="true">
        {initial}
      </span>
    );
  }

  function links(showName) {
    return (
      <>
        <Link
          href="/profile"
          className="flex min-w-0 items-center gap-2.5 rounded-full px-1 py-1 text-ink hover:text-sage-deep"
          onClick={onNavigate}
        >
          {face()}
          {showName ? (
            <span className={`min-w-0 truncate text-sm text-ink ${showName === "wide" ? "hidden max-w-[9.5rem] lg:inline" : ""}`}>
              {name}
            </span>
          ) : null}
        </Link>
        {admin ? (
          <>
            <Link href="/admin/reports" className="rounded-full px-2.5 py-1.5 text-sm text-sage-deep hover:bg-paper-deep" onClick={onNavigate}>
              살펴보기
            </Link>
            <Link href="/admin/categories" className="rounded-full px-2.5 py-1.5 text-sm text-sage-deep hover:bg-paper-deep" onClick={onNavigate}>
              분류
            </Link>
            <Link href="/admin/hobbies" className="rounded-full px-2.5 py-1.5 text-sm text-sage-deep hover:bg-paper-deep" onClick={onNavigate}>
              말머리
            </Link>
          </>
        ) : null}
        <button
          type="button"
          className="rounded-full px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-paper-deep hover:text-ink"
          onClick={handleSignOut}
        >
          로그아웃
        </button>
      </>
    );
  }

  if (isMenu) {
    return <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-paper-deep/50 px-3 py-3">{links(true)}</div>;
  }

  return (
    <>
      <div className="auth-chip hidden items-center md:flex">
        {links("wide")}
      </div>
      <details className="account-menu md:hidden">
        <summary className="list-none" aria-label={`${name} 계정`}>
          {face()}
        </summary>
        <div className="account-menu-panel">{links(true)}</div>
      </details>
    </>
  );
}
