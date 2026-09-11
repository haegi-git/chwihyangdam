"use client";

import { useState } from "react";
import { initialDiaries, moods } from "@/data/diary";

function formatToday() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DiaryBoard() {
  const [entries, setEntries] = useState(initialDiaries);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState(moods[0]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setTitle("");
    setMood(moods[0]);
    setBody("");
    setError("");
  }

  function openComposer() {
    setError("");
    setComposing(true);
  }

  function closeComposer() {
    resetForm();
    setComposing(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextBody = body.trim();

    if (!nextTitle || !nextBody) {
      setError("제목과 내용을 모두 적어 주세요.");
      return;
    }

    setEntries((current) => [
      {
        id: `new-${Date.now()}`,
        date: formatToday(),
        mood,
        title: nextTitle,
        body: nextBody,
        private: true,
      },
      ...current,
    ]);
    closeComposer();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-sage">비공개</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
            나의 일기
          </h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            적어 둔 글은 나만 봅니다. 가까운 친구와 나누는 기능은 나중에 이어질
            예정입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openComposer}
          className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-5 text-sm text-paper transition-colors hover:bg-sage-deep"
        >
          새 일기
        </button>
      </div>

      {composing ? (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_-24px_rgba(58,54,48,0.35)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl text-ink">새 일기</h2>
              <p className="mt-1 text-sm text-ink-soft">저장하면 목록 맨 위에 나타납니다.</p>
            </div>
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              닫기
            </button>
          </div>

          <label className="mt-6 block text-sm text-ink-soft" htmlFor="diary-title">
            제목
          </label>
          <input
            id="diary-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-ink outline-none ring-sage/30 placeholder:text-ink-soft/70 focus:ring-2"
            placeholder="오늘의 한 줄"
          />

          <label className="mt-5 block text-sm text-ink-soft" htmlFor="diary-mood">
            마음
          </label>
          <select
            id="diary-mood"
            value={mood}
            onChange={(event) => setMood(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-ink outline-none ring-sage/30 focus:ring-2"
          >
            {moods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="mt-5 block text-sm text-ink-soft" htmlFor="diary-body">
            내용
          </label>
          <textarea
            id="diary-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            className="mt-2 w-full resize-y rounded-2xl border border-line bg-paper px-4 py-3 text-ink outline-none ring-sage/30 placeholder:text-ink-soft/70 focus:ring-2"
            placeholder="천천히, 짧게라도 좋아요."
          />

          {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeComposer}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-5 text-sm text-paper hover:bg-sage-deep"
            >
              일기 남기기
            </button>
          </div>
        </form>
      ) : null}

      <ol className="mt-10 space-y-4">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-3xl border border-line bg-card p-6"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <time>{entry.date}</time>
              <span aria-hidden="true">·</span>
              <span>{entry.mood}</span>
              {entry.private ? (
                <span className="rounded-full bg-sage-mist px-2.5 py-0.5 text-xs text-sage-deep">
                  비공개
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 font-serif text-2xl text-ink">{entry.title}</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-ink-soft">
              {entry.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
