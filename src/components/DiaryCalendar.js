import {
  DIARY_WEEKDAYS,
  formatDiaryDate,
  isKeyInRange,
} from "@/lib/diary";

export default function DiaryCalendar({
  monthTitle,
  weeks,
  range,
  selectedKey,
  entries,
  canPrev,
  canNext,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
  onSelect,
  caption,
  emptyLabel = "비어 있음",
  filledLabel = "일기 있음",
}) {
  return (
    <section className="diary-calendar rise-in rise-in-3 mt-10 rounded-[1.85rem] p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={onPrev}
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
          onClick={onNext}
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
            onClick={onToday}
          >
            오늘로
          </button>
        </div>
      ) : null}

      <table className="mt-6 w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">{caption || `${monthTitle} 일기 달력`}</caption>
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
                const entry = entries[cell.key];
                const hasEntry = Boolean(entry);
                const shared = Boolean(entry?.shared_with_friends);
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
                      onClick={() => onSelect(cell.key, cell.inMonth)}
                      disabled={!inRange}
                      aria-pressed={selected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${formatDiaryDate(cell.key)}${
                        hasEntry ? `, ${filledLabel}` : `, ${emptyLabel}`
                      }`}
                    >
                      <span>{cell.day}</span>
                      {hasEntry ? (
                        <span
                          className={`diary-day-mark${shared ? " is-shared" : ""}`}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
