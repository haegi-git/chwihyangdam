"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchUnreadNotificationCount } from "@/lib/notifications";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return undefined;
    }

    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (!user) {
        setCount(null);
        return;
      }

      const next = await fetchUnreadNotificationCount(supabase);
      if (!cancelled) {
        setCount(next);
      }
    }

    load();

    function onVisible() {
      if (document.visibilityState === "hidden") {
        return;
      }
      load();
    }

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return;
      }

      if (!session?.user) {
        setCount(null);
        return;
      }

      fetchUnreadNotificationCount(supabase).then((next) => {
        if (!cancelled) {
          setCount(next);
        }
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  if (count === null) {
    return null;
  }

  const label = count > 0 ? `알림, 읽지 않음 ${count}개` : "알림";

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors duration-500 hover:bg-paper-deep/80 hover:text-ink"
      aria-label={label}
    >
      <BellIcon />
      {count > 0 ? (
        <span className="notice-badge">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
      <path
        d="M6.2 9.2a5.8 5.8 0 1 1 11.6 0c0 4.6 1.5 6.1 1.5 6.1H4.7s1.5-1.5 1.5-6.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.2a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
