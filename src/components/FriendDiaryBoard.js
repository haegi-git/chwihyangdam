"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import DiaryCalendar from "@/components/DiaryCalendar";
import PersonFace from "@/components/PersonFace";
import ShareBadge from "@/components/ShareBadge";
import {
  DIARY_SELECT,
  clampKeyToMonth,
  diaryRange,
  diaryWasEdited,
  entriesByDateKey,
  formatDiaryDate,
  formatMonthTitle,
  fromDateKey,
  getDiaryDayServerSnapshot,
  getDiaryDaySnapshot,
  isKeyInRange,
  monthOverlapsRange,
  monthWeeks,
  shiftMonth,
  subscribeDiaryDay,
  yearMonthOf,
} from "@/lib/diary";
import { displayLabel, friendDiaryHref, profileHref } from "@/lib/friends";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function FriendDiaryBoard({ authorId, author }) {
  const configured = isSupabaseConfigured();
  const today = useSyncExternalStore(
    subscribeDiaryDay,
    getDiaryDaySnapshot,
    getDiaryDayServerSnapshot,
  );
  const range = today ? diaryRange(fromDateKey(today)) : null;
  const [user, setUser] = useState(() => (configured ? undefined : null));
  const [isFriend, setIsFriend] = useState(null);
  const [view, setView] = useState(null);
  const [entries, setEntries] = useState({});
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");

  const year = view?.year ?? yearMonthOf(today)?.year ?? null;
  const month = view?.month ?? yearMonthOf(today)?.month ?? null;
  const selectedKey = view?.selectedKey ?? today;
  const weeks = useMemo(
    () => (year && month ? monthWeeks(year, month) : []),
    [year, month],
  );
  const monthTitle = year && month ? formatMonthTitle(year, month) : "";
  const selectedEntry = entries[selectedKey] ?? null;
  const previousMonth = year && month ? shiftMonth(year, month, -1) : null;
  const nextMonth = year && month ? shiftMonth(year, month, 1) : null;
  const canPrev = Boolean(
    range &&
      previousMonth &&
      monthOverlapsRange(previousMonth.year, previousMonth.month, range.minKey, range.maxKey),
  );
  const canNext = Boolean(
    range &&
      nextMonth &&
      monthOverlapsRange(nextMonth.year, nextMonth.month, range.minKey, range.maxKey),
  );
  const isCurrentMonth = Boolean(
    range && year === yearMonthOf(range.todayKey)?.year && month === yearMonthOf(range.todayKey)?.month,
  );
  const own = Boolean(user && user.id === authorId);
  const gridKey =
    user && !own && isFriend && weeks.length
      ? `${weeks[0][0].key}:${weeks[weeks.length - 1][weeks[0].length - 1].key}`
      : "";
  const loading = Boolean(gridKey && loadedKey !== gridKey);
  const name = displayLabel(author);
  const nextPath = friendDiaryHref(authorId);

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();

    function applyUser(nextUser) {
      setUser(nextUser);

      if (!nextUser) {
        setIsFriend(null);
        setEntries({});
        setLoadedKey("");
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      applyUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!user || own || !configured) {
      return undefined;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase.rpc("are_friends", { a: user.id, b: authorId }).then(({ data, error: friendError }) => {
      if (cancelled) {
        return;
      }

      if (friendError) {
        setError("친구 자리를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        setIsFriend(false);
        return;
      }

      setError("");
      setIsFriend(Boolean(data));
    });

    return () => {
      cancelled = true;
    };
  }, [user, own, authorId, configured]);

  useEffect(() => {
    if (!user || !isFriend || !gridKey) {
      return undefined;
    }

    let cancelled = false;
    const [from, to] = gridKey.split(":");
    const supabase = createClient();

    supabase
      .from("diary_entries")
      .select(DIARY_SELECT)
      .eq("author_id", authorId)
      .eq("shared_with_friends", true)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .then(({ data, error: loadError }) => {
        if (cancelled) {
          return;
        }

        if (loadError) {
          setError("나눈 달력을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
          setEntries({});
        } else {
          setError("");
          setEntries(entriesByDateKey(data));
        }

        setLoadedKey(gridKey);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isFriend, gridKey, authorId]);

  function moveMonth(delta) {
    const next = shiftMonth(year, month, delta);

    if (!monthOverlapsRange(next.year, next.month, range.minKey, range.maxKey)) {
      return;
    }

    setView({
      year: next.year,
      month: next.month,
      selectedKey: clampKeyToMonth(next.year, next.month, selectedKey, range.minKey, range.maxKey),
    });
  }

  function goToToday() {
    setView(null);
  }

  function selectDay(key, inMonth) {
    if (!isKeyInRange(key, range.minKey, range.maxKey)) {
      return;
    }

    if (key === selectedKey && inMonth) {
      return;
    }

    const next = inMonth ? { year, month } : yearMonthOf(key);

    if (!next) {
      return;
    }

    setView({
      year: next.year,
      month: next.month,
      selectedKey: key,
    });
  }

  if (user === undefined) {
    return (
      <div>
        <Intro name={name} author={author} />
        <div className="diary-calendar mt-10 min-h-[22rem] rounded-[1.85rem]" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Intro name={name} author={author} />
        <section className="paper-sheet rise-in rise-in-3 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12 md:py-16">
          <p className="kicker justify-center">아직 비어 있습니다</p>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">먼저 들어와 주세요</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            친구가 나눈 날은 들어와 있는 분만 읽을 수 있습니다.
          </p>
          <Link href={loginHref(nextPath)} className="btn-quiet mt-10">
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

  if (own) {
    return (
      <div>
        <Intro name={name} author={author} />
        <section className="paper-sheet rise-in rise-in-3 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12 md:py-16">
          <p className="kicker justify-center">나의 자리</p>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">내 일기입니다</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            남들이 보는 나눈 날이 아니라, 내가 쓰고 고치는 달력은 일기 자리에
            있습니다.
          </p>
          <Link href="/diary" className="btn-quiet mt-10">
            내 일기 열기
          </Link>
        </section>
      </div>
    );
  }

  if (isFriend === null) {
    return (
      <div>
        <Intro name={name} author={author} />
        <div className="diary-calendar mt-10 min-h-[22rem] rounded-[1.85rem]" aria-hidden="true" />
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div>
        <Intro name={name} author={author} />
        <section className="paper-sheet rise-in rise-in-3 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12 md:py-16">
          <p className="kicker justify-center">아직 닫혀 있습니다</p>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">친구가 되면 열립니다</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            요청을 주고받은 뒤에, 이 사람이 체크한 날만 읽을 수 있습니다.
            혼자 보는 날은 열리지 않습니다.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={profileHref(authorId)} className="btn-quiet">
              프로필 보기
            </Link>
            <Link href="/friends" className="btn-ghost">
              친구 자리
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!range || !year || !month) {
    return (
      <div>
        <Intro name={name} author={author} />
        <div className="diary-calendar mt-10 min-h-[22rem] rounded-[1.85rem]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <Intro name={name} author={author} />

      <DiaryCalendar
        monthTitle={monthTitle}
        weeks={weeks}
        range={range}
        selectedKey={selectedKey}
        entries={entries}
        canPrev={canPrev}
        canNext={canNext}
        isCurrentMonth={isCurrentMonth}
        onPrev={() => moveMonth(-1)}
        onNext={() => moveMonth(1)}
        onToday={goToToday}
        onSelect={selectDay}
        caption={`${name}의 ${monthTitle} 나눈 일기`}
        emptyLabel="나누지 않음"
        filledLabel="나눈 일기 있음"
      />

      {error ? (
        <p className="mt-6 text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !selectedEntry ? (
        <p className="mt-8 text-sm text-ink-soft" role="status">
          이 날을 여는 중…
        </p>
      ) : (
        <ReadDayPanel dateKey={selectedKey} entry={selectedEntry} />
      )}
    </div>
  );
}

function Intro({ name, author }) {
  return (
    <div className="border-b border-line/80 pb-10">
      <p className="kicker rise-in">나눈 날만</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">
        {name}의 일기
      </h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        친구가 체크한 날만 보입니다. 비워 둔 날과 혼자 보는 날은 내용이 열리지
        않습니다.
      </p>
      <div className="rise-in rise-in-3 mt-8">
        <PersonFace profile={author} size="sm">
          <span className="mt-0.5 block text-xs tracking-wide text-ink-soft">프로필로 돌아가기</span>
        </PersonFace>
      </div>
    </div>
  );
}

function ReadDayPanel({ dateKey, entry }) {
  if (!entry) {
    return (
      <section className="paper-sheet journal-entry rise-in mt-8 rounded-[1.85rem] p-7 md:p-8">
        <p className="text-sm text-ink-soft">
          <time dateTime={dateKey}>{formatDiaryDate(dateKey)}</time>
        </p>
        <h2 className="display mt-4 text-2xl text-ink">나누지 않은 날</h2>
        <p className="mt-3 text-sm leading-7 text-ink-soft">
          이 날은 비어 있거나, 혼자만 보는 글입니다. 친구가 공유를 켠 날만 읽을
          수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <article className="paper-sheet journal-entry rise-in mt-8 rounded-[1.85rem] p-7 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <time dateTime={dateKey}>{formatDiaryDate(dateKey)}</time>
        <span aria-hidden="true">·</span>
        <ShareBadge shared />
        {diaryWasEdited(entry) ? (
          <>
            <span aria-hidden="true">·</span>
            <span>고침</span>
          </>
        ) : null}
      </div>
      <h2 className="display mt-5 text-3xl text-ink">{entry.title || "제목 없는 하루"}</h2>
      {entry.body ? (
        <p className="mt-4 whitespace-pre-wrap leading-8 text-ink-soft">{entry.body}</p>
      ) : (
        <p className="mt-4 leading-8 text-ink-soft">내용 없이 제목만 남겨 두었습니다.</p>
      )}
    </article>
  );
}
