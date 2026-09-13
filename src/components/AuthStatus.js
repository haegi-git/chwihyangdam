"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PROFILE_UPDATED_EVENT,
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
        .select("display_name, avatar_url")
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

  return (
    <div
      className={
        isMenu
          ? "flex items-center justify-between gap-3 rounded-2xl bg-paper-deep/50 px-4 py-3"
          : "auth-chip"
      }
    >
      <Link
        href="/profile"
        className="flex min-w-0 items-center gap-2.5 rounded-full transition-colors duration-500 hover:text-sage-deep"
        onClick={onNavigate}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
          <img src={photo} alt="" className="auth-avatar" referrerPolicy="no-referrer" />
        ) : (
          <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">
            {initial}
          </span>
        )}
        <span className={`min-w-0 truncate text-sm text-ink ${isMenu ? "" : "hidden max-w-[9.5rem] lg:inline"}`}>
          {name}
        </span>
      </Link>
      <button
        type="button"
        className={
          isMenu
            ? "shrink-0 rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-card hover:text-ink"
            : "rounded-full px-2.5 py-1 text-xs tracking-wide text-ink-soft transition-colors duration-500 hover:bg-paper-deep hover:text-ink"
        }
        onClick={handleSignOut}
      >
        로그아웃
      </button>
    </div>
  );
}
