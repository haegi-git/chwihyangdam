"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  PROFILE_UPDATED_EVENT,
  isAdminUser,
  profileAvatarUrl,
  profileLabel,
} from "@/lib/profiles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AuthStatus({ onNavigate, variant = "header" }) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef(null);
  const [user, setUser] = useState(() => (isSupabaseConfigured() ? undefined : null));
  const [profile, setProfile] = useState(null);
  const [menuPath, setMenuPath] = useState("");
  const open = menuPath === pathname;

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

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuPath("");
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMenuPath("");
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

  function closeMenu() {
    setMenuPath("");
    onNavigate?.();
  }

  const menuItems = (
    <>
      <p className="account-menu-label">{name}</p>
      <Link href="/profile" className="account-menu-item cursor-pointer" role="menuitem" onClick={closeMenu}>
        프로필
      </Link>
      {admin ? (
        <Link href="/admin" className="account-menu-item cursor-pointer" role="menuitem" onClick={closeMenu}>
          관리자 페이지
        </Link>
      ) : null}
      <button type="button" className="account-menu-item cursor-pointer" role="menuitem" onClick={handleSignOut}>
        로그아웃
      </button>
    </>
  );

  if (isMenu) {
    return <div className="grid gap-0.5 rounded-2xl bg-paper-deep/50 px-2 py-2">{menuItems}</div>;
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-trigger cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${name} 계정`}
        onClick={() => setMenuPath(open ? "" : pathname)}
      >
        {face()}
        <span className="account-name">{name}</span>
      </button>
      {open ? (
        <div className="account-menu-panel" role="menu">
          {menuItems}
        </div>
      ) : null}
    </div>
  );
}
