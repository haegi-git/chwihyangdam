export const DIARY_TITLE_MAX = 80;
export const DIARY_BODY_MAX = 8000;
export const DIARY_YEAR_SPAN = 2;
export const DIARY_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function fromDateKey(key) {
  const match = DATE_KEY.exec(normalizeDateKey(key));

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function normalizeDateKey(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }

  if (value instanceof Date) {
    return toDateKey(value);
  }

  return "";
}

export function todayKey(now = new Date()) {
  return toDateKey(now);
}

export function subscribeDiaryDay(onStoreChange) {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const id = setTimeout(onStoreChange, Math.max(25, nextMidnight.getTime() - now.getTime() + 25));
  return () => clearTimeout(id);
}

export function getDiaryDaySnapshot() {
  return todayKey();
}

export function getDiaryDayServerSnapshot() {
  return "";
}

export function shiftYears(key, years) {
  const date = fromDateKey(key);

  if (!date) {
    return "";
  }

  date.setFullYear(date.getFullYear() + years);
  return toDateKey(date);
}

export function diaryRange(now = new Date()) {
  const today = todayKey(now);

  return {
    todayKey: today,
    minKey: shiftYears(today, -DIARY_YEAR_SPAN),
    maxKey: shiftYears(today, DIARY_YEAR_SPAN),
  };
}

export function isKeyInRange(key, minKey, maxKey) {
  const next = normalizeDateKey(key);
  return Boolean(next) && next >= minKey && next <= maxKey;
}

export function yearMonthOf(key) {
  const date = fromDateKey(key);

  if (!date) {
    return null;
  }

  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function shiftMonth(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1);

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function monthBounds(year, month) {
  return {
    startKey: toDateKey(new Date(year, month - 1, 1)),
    endKey: toDateKey(new Date(year, month, 0)),
  };
}

export function monthOverlapsRange(year, month, minKey, maxKey) {
  const { startKey, endKey } = monthBounds(year, month);
  return startKey <= maxKey && endKey >= minKey;
}

export function clampKeyToMonth(year, month, preferredKey, minKey, maxKey) {
  const { startKey, endKey } = monthBounds(year, month);
  const start = startKey < minKey ? minKey : startKey;
  const end = endKey > maxKey ? maxKey : endKey;

  if (start > end) {
    return "";
  }

  const preferred = fromDateKey(preferredKey);
  const day = preferred ? preferred.getDate() : 1;
  const lastDay = fromDateKey(endKey).getDate();
  const sameDay = toDateKey(new Date(year, month - 1, Math.min(day, lastDay)));

  if (sameDay < start) {
    return start;
  }

  if (sameDay > end) {
    return end;
  }

  return sameDay;
}

export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const leading = first.getDay();
  const cells = [];

  for (let offset = 0; offset < 42; offset += 1) {
    const date = new Date(year, month - 1, 1 - leading + offset);

    cells.push({
      key: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() + 1 === month && date.getFullYear() === year,
    });
  }

  return cells;
}

export function monthWeeks(year, month) {
  const cells = monthGrid(year, month);
  const weeks = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

export function formatMonthTitle(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
}

export function formatDiaryDate(key) {
  const date = fromDateKey(key);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function diaryWasEdited(entry) {
  if (!entry?.created_at || !entry?.updated_at) {
    return false;
  }

  return new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 1000;
}

export function trimDiaryTitle(value) {
  return typeof value === "string" ? value.trim().slice(0, DIARY_TITLE_MAX) : "";
}

export function trimDiaryBody(value) {
  return typeof value === "string" ? value.trim().slice(0, DIARY_BODY_MAX) : "";
}

export function entriesByDateKey(rows) {
  const map = {};

  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizeDateKey(row?.entry_date);

    if (key) {
      map[key] = row;
    }
  }

  return map;
}
