"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PersonFace from "@/components/PersonFace";
import {
  FRIENDSHIP_SELECT,
  PROFILE_FACE_SELECT,
  SEARCH_LIMIT,
  classifyFriendships,
  displayLabel,
  friendDiaryHref,
  friendshipWith,
  looksLikeProfileLink,
  otherPartyId,
  profileSearchPattern,
  relationOf,
  sanitizeSearchTerm,
  sortByName,
} from "@/lib/friends";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FriendsBoard() {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState(() => (configured ? undefined : null));
  const [friendships, setFriendships] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState({ key: "", rows: [] });
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const profilesById = useMemo(() => new Map(Object.entries(profiles)), [profiles]);
  const searchKey = looksLikeProfileLink(query) || sanitizeSearchTerm(query);
  const searching = Boolean(user && searchKey && hits.key !== searchKey);
  const visibleHits = hits.key === searchKey ? hits.rows : [];
  const grouped = useMemo(() => classifyFriendships(friendships, user?.id), [friendships, user]);
  const incoming = useMemo(
    () => sortByName(grouped.incoming, profilesById, user?.id),
    [grouped.incoming, profilesById, user],
  );
  const outgoing = useMemo(
    () => sortByName(grouped.outgoing, profilesById, user?.id),
    [grouped.outgoing, profilesById, user],
  );
  const accepted = useMemo(
    () => sortByName(grouped.accepted, profilesById, user?.id),
    [grouped.accepted, profilesById, user],
  );

  const mergeProfiles = useCallback((rows) => {
    if (!rows?.length) {
      return;
    }

    setProfiles((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (row?.id) {
          next[row.id] = row;
        }
      }
      return next;
    });
  }, []);

  const loadFriendships = useCallback(
    async (userId) => {
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("friendships")
        .select(FRIENDSHIP_SELECT)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (loadError) {
        setError("친구 자리를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        setFriendships([]);
        setLoaded(true);
        return;
      }

      const rows = data ?? [];
      setFriendships(rows);
      setError("");

      const ids = [
        ...new Set(rows.flatMap((row) => [otherPartyId(row, userId)].filter(Boolean))),
      ];

      if (!ids.length) {
        setLoaded(true);
        return;
      }

      const { data: faces } = await supabase
        .from("profiles")
        .select(PROFILE_FACE_SELECT)
        .in("id", ids);

      mergeProfiles(faces);
      setLoaded(true);
    },
    [mergeProfiles],
  );

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        loadFriendships(nextUser.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setFriendships([]);
        setLoaded(false);
      } else {
        loadFriendships(nextUser.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured, loadFriendships]);

  useEffect(() => {
    const term = sanitizeSearchTerm(query);
    const profileId = looksLikeProfileLink(query);
    const key = profileId || term;

    if (!configured || !user || !key) {
      return undefined;
    }

    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      let rows = [];

      if (profileId && profileId !== user.id) {
        const { data } = await supabase
          .from("profiles")
          .select(PROFILE_FACE_SELECT)
          .eq("id", profileId)
          .maybeSingle();

        if (data) {
          rows = [data];
        }
      } else {
        const pattern = profileSearchPattern(term);
        if (pattern) {
          const { data } = await supabase
            .from("profiles")
            .select(PROFILE_FACE_SELECT)
            .ilike("display_name", pattern)
            .neq("id", user.id)
            .limit(SEARCH_LIMIT);

          rows = data ?? [];
        }
      }

      if (cancelled) {
        return;
      }

      mergeProfiles(rows);
      setHits({ key, rows });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [configured, mergeProfiles, query, user]);

  async function withUser(work) {
    if (!configured) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setUser(null);
      return;
    }

    await work(supabase, currentUser);
    await loadFriendships(currentUser.id);
  }

  async function requestFriend(targetId) {
    if (!targetId || targetId === user?.id) {
      return;
    }

    setPending(`request:${targetId}`);
    setError("");
    setNotice("");

    await withUser(async (supabase, currentUser) => {
      const existing = friendshipWith(friendships, currentUser.id, targetId);

      if (relationOf(existing, currentUser.id) === "accepted") {
        setNotice("이미 가까운 친구입니다.");
        return;
      }

      if (relationOf(existing, currentUser.id) === "incoming") {
        const { error: acceptError } = await supabase
          .from("friendships")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("addressee_id", currentUser.id)
          .eq("status", "pending");

        if (acceptError) {
          setError("요청을 받아들이지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
          return;
        }

        setNotice("가까운 친구가 되었습니다.");
        return;
      }

      if (relationOf(existing, currentUser.id) === "outgoing") {
        setNotice("이미 요청을 보내 두었습니다.");
        return;
      }

      if (existing) {
        const { error: retryError } = await supabase
          .from("friendships")
          .update({
            requester_id: currentUser.id,
            addressee_id: targetId,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (retryError) {
          setError("다시 요청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
          return;
        }

        setNotice("친구 요청을 다시 보내 두었습니다.");
        return;
      }

      const { error: insertError } = await supabase.from("friendships").insert({
        requester_id: currentUser.id,
        addressee_id: targetId,
        status: "pending",
      });

      if (insertError) {
        setError("요청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      setNotice("친구 요청을 보내 두었습니다.");
    });

    setPending("");
  }

  async function acceptFriend(friendship) {
    setPending(`accept:${friendship.id}`);
    setError("");
    setNotice("");

    await withUser(async (supabase, currentUser) => {
      const { error: acceptError } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendship.id)
        .eq("addressee_id", currentUser.id)
        .eq("status", "pending");

      if (acceptError) {
        setError("요청을 받아들이지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      setNotice("가까운 친구가 되었습니다.");
    });

    setPending("");
  }

  async function declineFriend(friendship) {
    setPending(`decline:${friendship.id}`);
    setError("");
    setNotice("");

    await withUser(async (supabase, currentUser) => {
      const { error: declineError } = await supabase
        .from("friendships")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", friendship.id)
        .eq("addressee_id", currentUser.id)
        .eq("status", "pending");

      if (declineError) {
        setError("요청을 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      setNotice("요청을 정중히 거두었습니다.");
    });

    setPending("");
  }

  async function cancelRequest(friendship) {
    setPending(`cancel:${friendship.id}`);
    setError("");
    setNotice("");

    await withUser(async (supabase, currentUser) => {
      const { error: cancelError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id)
        .eq("requester_id", currentUser.id)
        .eq("status", "pending");

      if (cancelError) {
        setError("요청을 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      setNotice("보낸 요청을 거두었습니다.");
    });

    setPending("");
  }

  async function unfriend(friendship) {
    const confirmed = window.confirm(
      "친구를 거둘까요? 서로 나눈 일기도 더 이상 보이지 않습니다.",
    );

    if (!confirmed) {
      return;
    }

    setPending(`unfriend:${friendship.id}`);
    setError("");
    setNotice("");

    await withUser(async (supabase) => {
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (deleteError) {
        setError("친구를 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      setNotice("친구를 거두었습니다.");
    });

    setPending("");
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
            친구 요청과 나눈 일기는 들어와 있는 분만 열고 닫을 수 있습니다.
          </p>
          <Link href={loginHref("/friends")} className="btn-quiet mt-10">
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

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <Intro />

      <div className="rise-in rise-in-3 grid gap-6">
        <section className="paper-sheet rounded-[2.2rem] px-7 py-8 md:px-10 md:py-10">
          <p className="kicker">찾기</p>
          <h2 className="display mt-5 text-3xl text-ink">닉네임으로 초대</h2>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            취미 글의 프로필에서 요청해도 됩니다. 닉네임이나 프로필 주소를 적어
            보세요.
          </p>
          <label className="mt-6 block text-sm text-ink-soft" htmlFor="friend-search">
            닉네임 또는 프로필
          </label>
          <input
            id="friend-search"
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 80))}
            className="field-quiet mt-2 rounded-2xl px-4 py-3"
            placeholder="천천히 부를 이름"
            autoComplete="off"
          />

          {searching ? (
            <p className="mt-4 text-sm text-ink-soft" role="status">
              찾는 중…
            </p>
          ) : null}

          {visibleHits.length ? (
            <ul className="mt-5 grid gap-3">
              {visibleHits.map((profile) => (
                <li key={profile.id}>
                  <FriendRow
                    userId={user.id}
                    profile={profile}
                    relation={relationOf(friendshipWith(friendships, user.id, profile.id), user.id)}
                    friendship={friendshipWith(friendships, user.id, profile.id)}
                    pending={pending}
                    onRequest={() => requestFriend(profile.id)}
                    onAccept={acceptFriend}
                    onDecline={declineFriend}
                    onCancel={cancelRequest}
                    onUnfriend={unfriend}
                  />
                </li>
              ))}
            </ul>
          ) : searchKey ? (
            searching ? null : (
              <p className="mt-5 text-sm leading-7 text-ink-soft">
                그 이름의 자리는 아직 보이지 않습니다.
              </p>
            )
          ) : null}
        </section>

        {error ? (
          <p className="text-sm text-clay" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm text-sage-deep" role="status">
            {notice}
          </p>
        ) : null}

        <FriendSection
          title="받은 요청"
          empty="지금은 받은 요청이 없습니다."
          loading={!loaded}
          items={incoming}
          renderItem={(friendship) => (
            <FriendRow
              userId={user.id}
              profile={profiles[otherPartyId(friendship, user.id)]}
              relation="incoming"
              friendship={friendship}
              pending={pending}
              onAccept={acceptFriend}
              onDecline={declineFriend}
            />
          )}
        />

        <FriendSection
          title="보낸 요청"
          empty="기다리는 요청이 없습니다."
          loading={!loaded}
          items={outgoing}
          renderItem={(friendship) => (
            <FriendRow
              userId={user.id}
              profile={profiles[otherPartyId(friendship, user.id)]}
              relation="outgoing"
              friendship={friendship}
              pending={pending}
              onCancel={cancelRequest}
            />
          )}
        />

        <FriendSection
          title="가까운 친구"
          empty="아직 받아 둔 친구가 없습니다. 프로필에서 요청을 보내 보세요."
          loading={!loaded}
          items={accepted}
          renderItem={(friendship) => (
            <FriendRow
              userId={user.id}
              profile={profiles[otherPartyId(friendship, user.id)]}
              relation="accepted"
              friendship={friendship}
              pending={pending}
              onUnfriend={unfriend}
            />
          )}
        />
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div>
      <p className="kicker rise-in">가까운 이</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">친구</h1>
      <p className="rise-in rise-in-2 mt-8 max-w-md text-lg leading-9 text-ink-soft">
        요청을 주고받은 뒤에, 친구가 체크한 날의 일기만 읽을 수 있습니다. 혼자
        보는 날은 열리지 않습니다.
      </p>
    </div>
  );
}

function FriendSection({ title, empty, loading, items, renderItem }) {
  return (
    <section className="rounded-[2rem] border border-line/80 bg-card/70 px-6 py-7 md:px-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="display text-2xl text-ink">{title}</h2>
        <p className="text-xs tracking-wide text-ink-soft">{loading ? "…" : items.length}</p>
      </div>
      {loading ? (
        <p className="mt-5 text-sm text-ink-soft">자리를 여는 중…</p>
      ) : items.length ? (
        <ul className="mt-5 grid gap-3">
          {items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-7 text-ink-soft">{empty}</p>
      )}
    </section>
  );
}

function FriendRow({
  userId,
  profile,
  relation,
  friendship,
  pending,
  onRequest,
  onAccept,
  onDecline,
  onCancel,
  onUnfriend,
}) {
  const busy = Boolean(pending);
  const otherId = profile?.id || otherPartyId(friendship, userId);
  const name = displayLabel(profile);

  return (
    <div className="flex flex-col gap-3 rounded-[1.4rem] border border-line/70 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <PersonFace profile={profile || { id: otherId, display_name: name }} size="sm" />
      <div className="flex flex-wrap gap-2">
        {relation === "accepted" && otherId ? (
          <>
            <Link href={friendDiaryHref(otherId)} className="btn-quiet !min-h-9 !px-4 text-sm">
              나눈 일기
            </Link>
            <button
              type="button"
              className="btn-ghost !min-h-9 !px-4 text-sm"
              onClick={() => onUnfriend(friendship)}
              disabled={busy}
            >
              {pending === `unfriend:${friendship.id}` ? "거두는 중…" : "친구 끊기"}
            </button>
          </>
        ) : null}
        {relation === "incoming" ? (
          <>
            <button
              type="button"
              className="btn-quiet !min-h-9 !px-4 text-sm"
              onClick={() => onAccept(friendship)}
              disabled={busy}
            >
              {pending === `accept:${friendship.id}` ? "담는 중…" : "수락"}
            </button>
            <button
              type="button"
              className="btn-ghost !min-h-9 !px-4 text-sm"
              onClick={() => onDecline(friendship)}
              disabled={busy}
            >
              {pending === `decline:${friendship.id}` ? "거두는 중…" : "거절"}
            </button>
          </>
        ) : null}
        {relation === "outgoing" ? (
          <button
            type="button"
            className="btn-ghost !min-h-9 !px-4 text-sm"
            onClick={() => onCancel(friendship)}
            disabled={busy}
          >
            {pending === `cancel:${friendship.id}` ? "거두는 중…" : "요청 취소"}
          </button>
        ) : null}
        {relation === "none" || relation === "declined_by_me" || relation === "declined_by_them" ? (
          <button
            type="button"
            className="btn-quiet !min-h-9 !px-4 text-sm"
            onClick={onRequest}
            disabled={busy}
          >
            {pending === `request:${otherId}` ? "보내는 중…" : "친구 요청"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
