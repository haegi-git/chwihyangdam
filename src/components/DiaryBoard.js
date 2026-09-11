"use client";

import { useState } from "react";
import FadeIn from "@/components/FadeIn";
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
      <FadeIn className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-[0.16em] text-sage">비공개</p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-ink md:text-4xl">
            나의 일기
          </h1>
          <span
            aria-hidden="true"
            className="mt-6 block h-px w-12 bg-sage/35"
          />
          <p className="mt-6 max-w-xl leading-8 text-ink-soft">
            적어 둔 글은 나만 봅니다. 가까운 친구와 나누는 기능은 나중에 이어질
            예정입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openComposer}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-sage px-6 text-sm text-paper transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-sage-deep"
        >
          새 일기
        </button>
      </FadeIn>

      {composing ? (
        <form
          onSubmit={handleSubmit}
          className="surface fade-rise mt-10 p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl text-ink">새 일기</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                저장하면 목록 맨 위에 나타납니다.
              </p>
            </div>
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-paper-deep/80 hover:text-ink"
            >
              닫기
            </button>
          </div>

          <label className="mt-7 block text-sm text-ink-soft" htmlFor="diary-title">
            제목
          </label>
          <input
            id="diary-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line/90 bg-paper/80 px-4 py-3 text-ink outline-none ring-sage/25 placeholder:text-ink-soft/70 transition-shadow duration-500 focus:ring-2"
            placeholder="오늘의 한 줄"
          />

          <label className="mt-5 block text-sm text-ink-soft" htmlFor="diary-mood">
            마음
          </label>
          <select
            id="diary-mood"
            value={mood}
            onChange={(event) => setMood(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line/90 bg-paper/80 px-4 py-3 text-ink outline-none ring-sage/25 transition-shadow duration-500 focus:ring-2"
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
            className="mt-2 w-full resize-y rounded-2xl border border-line/90 bg-paper/80 px-4 py-3 text-ink outline-none ring-sage/25 placeholder:text-ink-soft/70 transition-shadow duration-500 focus:ring-2"
            placeholder="천천히, 짧게라도 좋아요."
          />

          {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeComposer}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm text-ink-soft transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-paper-deep/80 hover:text-ink"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-5 text-sm text-paper transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-sage-deep"
            >
              일기 남기기
            </button>
          </div>
        </form>
      ) : null}

      <FadeIn delay={140} as="ol" className="mt-12 space-y-5">
        {entries.map((entry) => (
          <li key={entry.id} className="surface surface-hover p-7">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <time>{entry.date}</time>
              <span aria-hidden="true">·</span>
              <span>{entry.mood}</span>
              {entry.private ? (
                <span className="rounded-full bg-sage-mist/90 px-2.5 py-0.5 text-xs text-sage-deep">
                  비공개
                </span>
              ) : null}
            </div>
            <h2 className="mt-4 font-serif text-2xl text-ink">{entry.title}</h2>
            <p className="mt-4 whitespace-pre-wrap leading-8 text-ink-soft">
              {entry.body}
            </p>
          </li>
        ))}
      </FadeIn>
    </div>
  );
}
