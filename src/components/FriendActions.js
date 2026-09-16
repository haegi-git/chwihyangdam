"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FRIENDSHIP_SELECT,
  friendDiaryHref,
  relationOf,
} from "@/lib/friends";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FriendActions({ profileId, returnTo }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState(() => (configured ? undefined : null));
  const [friendship, setFriendship] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    async (userId) => {
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("friendships")
        .select(FRIENDSHIP_SELECT)
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
        .limit(1)
        .maybeSingle();

      if (loadError) {
        setError("친구 자리를 확인하지 못했습니다.");
        setFriendship(null);
        setLoaded(true);
        return;
      }

      const mine =
        data && (data.requester_id === userId || data.addressee_id === userId) ? data : null;
      setFriendship(mine);
      setError("");
      setLoaded(true);
    },
    [profileId],
  );

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);

      if (nextUser && nextUser.id !== profileId) {
        load(nextUser.id);
      } else {
        setLoaded(true);
      }
    });

    return undefined;
  }, [configured, load, profileId]);

  async function withUser(work) {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setUser(null);
      return;
    }

    await work(supabase, currentUser);
    await load(currentUser.id);
  }

  async function requestFriend() {
    setPending("request");
    setError("");

    await withUser(async (supabase, currentUser) => {
      const existing = friendship;
      const relation = relationOf(existing, currentUser.id);

      if (relation === "incoming") {
        const { error: acceptError } = await supabase
          .from("friendships")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("addressee_id", currentUser.id);

        if (acceptError) {
          setError("요청을 받아들이지 못했습니다.");
        }
        return;
      }

      if (existing) {
        const { error: retryError } = await supabase
          .from("friendships")
          .update({
            requester_id: currentUser.id,
            addressee_id: profileId,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (retryError) {
          setError("다시 요청하지 못했습니다.");
        }
        return;
      }

      const { error: insertError } = await supabase.from("friendships").insert({
        requester_id: currentUser.id,
        addressee_id: profileId,
        status: "pending",
      });

      if (insertError) {
        setError("요청을 보내지 못했습니다.");
      }
    });

    setPending("");
  }

  async function acceptFriend() {
    if (!friendship) {
      return;
    }

    setPending("accept");
    setError("");

    await withUser(async (supabase, currentUser) => {
      const { error: acceptError } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendship.id)
        .eq("addressee_id", currentUser.id)
        .eq("status", "pending");

      if (acceptError) {
        setError("요청을 받아들이지 못했습니다.");
      }
    });

    setPending("");
  }

  async function declineFriend() {
    if (!friendship) {
      return;
    }

    setPending("decline");
    setError("");

    await withUser(async (supabase, currentUser) => {
      const { error: declineError } = await supabase
        .from("friendships")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", friendship.id)
        .eq("addressee_id", currentUser.id)
        .eq("status", "pending");

      if (declineError) {
        setError("요청을 거두지 못했습니다.");
      }
    });

    setPending("");
  }

  async function cancelRequest() {
    if (!friendship) {
      return;
    }

    setPending("cancel");
    setError("");

    await withUser(async (supabase, currentUser) => {
      const { error: cancelError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id)
        .eq("requester_id", currentUser.id)
        .eq("status", "pending");

      if (cancelError) {
        setError("요청을 거두지 못했습니다.");
      }
    });

    setPending("");
  }

  async function unfriend() {
    if (!friendship) {
      return;
    }

    const confirmed = window.confirm(
      "친구를 거둘까요? 서로 나눈 일기도 더 이상 보이지 않습니다.",
    );

    if (!confirmed) {
      return;
    }

    setPending("unfriend");
    setError("");

    await withUser(async (supabase) => {
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (deleteError) {
        setError("친구를 거두지 못했습니다.");
      }
    });

    setPending("");
  }

  if (user === undefined || !loaded) {
    return <div className="mt-10 h-12 rounded-full bg-paper-deep/60" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="mt-10">
        <Link href={loginHref(returnTo || `/profile/${profileId}`)} className="btn-quiet">
          로그인하고 친구 요청
        </Link>
      </div>
    );
  }

  if (user.id === profileId) {
    return (
      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/profile" className="btn-quiet">
          내 프로필 고치기
        </Link>
        <Link href="/friends" className="btn-ghost">
          친구 자리
        </Link>
      </div>
    );
  }

  const relation = relationOf(friendship, user.id);
  const busy = Boolean(pending);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2">
        {relation === "accepted" ? (
          <>
            <Link href={friendDiaryHref(profileId)} className="btn-quiet">
              나눈 일기 보기
            </Link>
            <button type="button" className="btn-ghost" onClick={unfriend} disabled={busy}>
              {pending === "unfriend" ? "거두는 중…" : "친구 끊기"}
            </button>
          </>
        ) : null}
        {relation === "incoming" ? (
          <>
            <button type="button" className="btn-quiet" onClick={acceptFriend} disabled={busy}>
              {pending === "accept" ? "담는 중…" : "요청 수락"}
            </button>
            <button type="button" className="btn-ghost" onClick={declineFriend} disabled={busy}>
              {pending === "decline" ? "거두는 중…" : "거절"}
            </button>
          </>
        ) : null}
        {relation === "outgoing" ? (
          <button type="button" className="btn-ghost" onClick={cancelRequest} disabled={busy}>
            {pending === "cancel" ? "거두는 중…" : "요청 취소"}
          </button>
        ) : null}
        {relation === "none" || relation === "declined_by_me" || relation === "declined_by_them" ? (
          <button type="button" className="btn-quiet" onClick={requestFriend} disabled={busy}>
            {pending === "request" ? "보내는 중…" : "친구 요청"}
          </button>
        ) : null}
      </div>
      {relation === "outgoing" ? (
        <p className="mt-4 text-sm leading-7 text-ink-soft">요청을 보내 두었습니다. 상대가 받아들이기를 기다립니다.</p>
      ) : null}
      {relation === "accepted" ? (
        <p className="mt-4 font-serif text-sm tracking-[0.22em] text-sage-deep">가까운 친구</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
