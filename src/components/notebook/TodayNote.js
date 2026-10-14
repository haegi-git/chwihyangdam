"use client";

import { useSyncExternalStore } from "react";
import {
  DIARY_WEEKDAYS,
  formatDiaryDate,
  getDiaryDayServerSnapshot,
  getDiaryDaySnapshot,
  monthWeeks,
  subscribeDiaryDay,
  yearMonthOf,
} from "@/lib/diary";

export default function TodayNote() {
  const today = useSyncExternalStore(
    subscribeDiaryDay,
    getDiaryDaySnapshot,
    getDiaryDayServerSnapshot,
  );
  const parts = yearMonthOf(today);
  const weeks = parts ? monthWeeks(parts.year, parts.month) : [];
  const day = today ? Number(today.slice(-2)) : null;

  return (
    <aside className="sticky-note hidden p-6 lg:block" aria-label="오늘">
      <p className="font-hand text-3xl text-ink">Today</p>
      <p className="mt-2 font-hand text-5xl leading-none text-ink">{day || "·"}</p>
      <p className="mt-3 text-sm text-ink-soft">{today ? formatDiaryDate(today) : "날짜를 여는 중"}</p>
      {weeks.length ? (
        <table className="mt-5 w-full table-fixed">
          <caption className="sr-only">이번 달</caption>
          <thead>
            <tr>
              {DIARY_WEEKDAYS.map((name) => (
                <th key={name} className="pb-1 text-center text-[0.68rem] font-normal text-ink-soft">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((cell) => {
                  const current = cell.key === today;
                  return (
                    <td key={cell.key} className="p-0.5 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.72rem] ${
                          current
                            ? "bg-sage-deep text-[#f7f3ea]"
                            : cell.inMonth
                              ? "text-ink"
                              : "text-ink-soft/45"
                        }`}
                      >
                        {cell.day}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-5 h-36" aria-hidden="true" />
      )}
    </aside>
  );
}
