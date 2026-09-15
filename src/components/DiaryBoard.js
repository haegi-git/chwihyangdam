"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  DIARY_BODY_MAX,
  DIARY_TITLE_MAX,
  DIARY_WEEKDAYS,
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
  normalizeDateKey,
  shiftMonth,
  subscribeDiaryDay,
  trimDiaryBody,
  trimDiaryTitle,
  yearMonthOf,
} from "@/lib/diary";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DIARY_SELECT = "id, author_id, entry_date, title, body, created_at, updated_at";

export default function DiaryBoard() {
  const configured = isSupabaseConfigured();
  const today = useSyncExternalStore(
    subscribeDiaryDay,
    getDiaryDaySnapshot,
    getDiaryDayServerSnapshot,
  );
  const range = today ? diaryRange(fromDateKey(today)) : null;
  const [user, setUser] = useState(() => (configured ? undefined : null));
  const [view, setView] = useState(null);
  const [entries, setEntries] = useState({});
  const [loadedKey, setLoadedKey] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState("");
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
  const gridKey =
    user && weeks.length
      ? `${weeks[0][0].key}:${weeks[weeks.length - 1][weeks[0].length - 1].key}`
      : "";
  const loading = Boolean(gridKey && loadedKey !== gridKey);

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();

    function applyUser(nextUser) {
      setUser(nextUser);

      if (!nextUser) {
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
    if (!user || !gridKey) {
      return undefined;
    }

    let cancelled = false;
    const [from, to] = gridKey.split(":");
    const supabase = createClient();

    supabase
      .from("diary_entries")
      .select(DIARY_SELECT)
      .eq("author_id", user.id)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .then(({ data, error: loadError }) => {
        if (cancelled) {
          return;
        }

        if (loadError) {
          setError("달력을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
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
  }, [user, gridKey]);

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
    closeEditor();
  }

  function goToToday() {
    setView(null);
    closeEditor();
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
    closeEditor();
  }

  function closeEditor() {
    setEditing(false);
    setTitle("");
    setBody("");
    setError("");
  }

  function openEditor(entry) {
    setEditing(true);
    setTitle(entry?.title ?? "");
    setBody(entry?.body ?? "");
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();

    const nextTitle = trimDiaryTitle(title);
    const nextBody = trimDiaryBody(body);

    if (!nextTitle && !nextBody) {
      setError("제목이나 내용을 적어 주세요.");
      return;
    }

    if (!configured) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPending("save");
    setError("");

    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setPending("");
      setUser(null);
      return;
    }

    const payload = {
      author_id: currentUser.id,
      entry_date: selectedKey,
      title: nextTitle,
      body: nextBody,
      updated_at: new Date().toISOString(),
    };

    if (selectedEntry?.id) {
      payload.id = selectedEntry.id;
    }

    const { data, error: saveError } = await supabase
      .from("diary_entries")
      .upsert(payload, { onConflict: "author_id,entry_date" })
      .select(DIARY_SELECT)
      .maybeSingle();

    if (saveError || !data) {
      setPending("");
      setError("일기를 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    const key = normalizeDateKey(data.entry_date) || selectedKey;
    setEntries((current) => ({ ...current, [key]: data }));
    setPending("");
    closeEditor();
  }

  async function handleDelete() {
    if (!selectedEntry?.id) {
      return;
    }

    const confirmed = window.confirm("이 날의 일기를 거두어 둘까요? 달력에서 사라집니다.");

    if (!confirmed) {
      return;
    }

    if (!configured) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPending("delete");
    setError("");

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("diary_entries")
      .delete()
      .eq("id", selectedEntry.id)
      .eq("author_id", user.id);

    if (deleteError) {
      setPending("");
      setError("일기를 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setEntries((current) => {
      const next = { ...current };
      delete next[selectedKey];
      return next;
    });
    setPending("");
    closeEditor();
  }

  if (user === undefined) {
    return (
      <div>
        <Intro />
        <div className="diary-calendar mt-10 min-h-[22rem] rounded-[1.85rem]" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Intro />
        <section className="paper-sheet rise-in rise-in-3 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12 md:py-16">
          <p className="kicker justify-center">아직 비어 있습니다</p>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">먼저 들어와 주세요</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            일기는 들어와 있는 분만 보고 남길 수 있습니다. 달력에 조용히 쌓이며,
            다른 사람에게는 열리지 않습니다.
          </p>
          <Link href={loginHref("/diary")} className="btn-quiet mt-10">
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

  if (!range || !year || !month) {
    return (
      <div>
        <Intro />
        <div className="diary-calendar mt-10 min-h-[22rem] rounded-[1.85rem]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <Intro />

      <section className="diary-calendar rise-in rise-in-3 mt-10 rounded-[1.85rem] p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => moveMonth(-1)}
            disabled={!canPrev}
            aria-label="이전 달"
          >
            이전 달
          </button>
          <div className="text-center">
            <h2 className="display text-2xl text-ink md:text-3xl">{monthTitle}</h2>
            <p className="mt-1 text-xs tracking-wide text-ink-soft">
              오늘을 기준으로 앞뒤 2년만 열립니다
            </p>
          </div>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => moveMonth(1)}
            disabled={!canNext}
            aria-label="다음 달"
          >
            다음 달
          </button>
        </div>

        {!isCurrentMonth ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              className="rounded-full px-3 py-1 text-sm text-sage-deep transition-colors duration-500 hover:bg-sage-mist/80"
              onClick={goToToday}
            >
              오늘로
            </button>
          </div>
        ) : null}

        <table className="mt-6 w-full table-fixed border-separate border-spacing-1">
          <caption className="sr-only">{monthTitle} 일기 달력</caption>
          <thead>
            <tr>
              {DIARY_WEEKDAYS.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="pb-2 text-center text-xs font-normal tracking-wide text-ink-soft"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((cell) => {
                  const inRange = isKeyInRange(cell.key, range.minKey, range.maxKey);
                  const hasEntry = Boolean(entries[cell.key]);
                  const selected = cell.key === selectedKey;
                  const isToday = cell.key === range.todayKey;

                  return (
                    <td key={cell.key}>
                      <button
                        type="button"
                        className={[
                          "diary-day",
                          cell.inMonth ? "" : "is-muted",
                          selected ? "is-selected" : "",
                          isToday ? "is-today" : "",
                          !inRange ? "is-out" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => selectDay(cell.key, cell.inMonth)}
                        disabled={!inRange}
                        aria-pressed={selected}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${formatDiaryDate(cell.key)}${
                          hasEntry ? ", 일기 있음" : ", 비어 있음"
                        }`}
                      >
                        <span>{cell.day}</span>
                        {hasEntry ? <span className="diary-day-mark" aria-hidden="true" /> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {loading && !selectedEntry ? (
        <p className="mt-8 text-sm text-ink-soft" role="status">
          이 날을 여는 중…
        </p>
      ) : (
        <DayPanel
          key={selectedKey}
          dateKey={selectedKey}
          entry={selectedEntry}
          editing={editing || !selectedEntry}
          title={title}
          body={body}
          pending={pending}
          error={error}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onSubmit={handleSave}
          onEdit={() => openEditor(selectedEntry)}
          onCancel={closeEditor}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function Intro() {
  return (
    <div className="border-b border-line/80 pb-10">
      <p className="kicker rise-in">비공개</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">나의 일기</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        적어 둔 글은 나만 봅니다. 날짜를 눌러 그날을 읽고 남길 수 있습니다.
        가까운 친구와 나누는 기능은 나중에 이어질 예정입니다.
      </p>
    </div>
  );
}

function DayPanel({
  dateKey,
  entry,
  editing,
  title,
  body,
  pending,
  error,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onEdit,
  onCancel,
  onDelete,
}) {
  const busy = Boolean(pending);
  const empty = !entry;
  const showForm = editing || empty;

  if (showForm) {
    return (
      <form
        onSubmit={onSubmit}
        className="paper-sheet journal-entry rise-in mt-8 rounded-[1.85rem] p-7 md:p-8"
      >
        <p className="text-sm text-ink-soft">
          <time dateTime={dateKey}>{formatDiaryDate(dateKey)}</time>
        </p>
        <h2 className="display mt-4 text-2xl text-ink">
          {empty ? "아직 비어 있습니다" : "일기 고치기"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {empty
            ? "이 날에 짧은 한 줄을 남겨 보세요. 제목만 있어도 됩니다."
            : "고친 뒤에는 이 날의 글만 바뀝니다."}
        </p>

        <label className="mt-7 block text-sm text-ink-soft" htmlFor="diary-title">
          제목
        </label>
        <input
          id="diary-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value.slice(0, DIARY_TITLE_MAX))}
          className="field-quiet mt-2 rounded-2xl px-4 py-3"
          placeholder="오늘의 한 줄"
          maxLength={DIARY_TITLE_MAX}
          autoComplete="off"
          disabled={busy}
        />
        <p className="mt-2 text-xs tracking-wide text-ink-soft">
          {title.trim().length}/{DIARY_TITLE_MAX}
        </p>

        <label className="mt-6 block text-sm text-ink-soft" htmlFor="diary-body">
          내용
        </label>
        <textarea
          id="diary-body"
          value={body}
          onChange={(event) => onBodyChange(event.target.value.slice(0, DIARY_BODY_MAX))}
          rows={7}
          className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
          placeholder="천천히, 짧게라도 좋아요."
          maxLength={DIARY_BODY_MAX}
          disabled={busy}
        />
        <p className="mt-2 text-xs tracking-wide text-ink-soft">
          {body.trim().length}/{DIARY_BODY_MAX}
        </p>

        {error ? (
          <p className="mt-4 text-sm text-clay" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {empty ? null : (
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost border-transparent hover:border-line"
              disabled={busy}
            >
              취소
            </button>
          )}
          <button type="submit" className="btn-quiet" disabled={busy}>
            {pending === "save" ? "담는 중…" : empty ? "일기 남기기" : "담기"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="paper-sheet journal-entry rise-in mt-8 rounded-[1.85rem] p-7 md:p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <time dateTime={dateKey}>{formatDiaryDate(dateKey)}</time>
        <span aria-hidden="true">·</span>
        <span className="rounded-full bg-sage-mist px-2.5 py-1 text-xs tracking-wide text-sage-deep">
          비공개
        </span>
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
      {error ? (
        <p className="mt-5 text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={onEdit} disabled={busy}>
          고치기
        </button>
        <button type="button" className="btn-ghost" onClick={onDelete} disabled={busy}>
          {pending === "delete" ? "거두는 중…" : "거두기"}
        </button>
      </div>
    </article>
  );
}
