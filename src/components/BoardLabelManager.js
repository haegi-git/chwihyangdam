"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nextSortOrder, parseSortOrder } from "@/lib/board";
import { CATEGORY_NAME_MAX, categoryNameError, trimCategoryName } from "@/lib/categories";
import { HOBBY_NAME_MAX, hobbyNameError, trimHobbyName } from "@/lib/hobby-tags";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const KINDS = {
  board_categories: {
    noun: "분류",
    addLabel: "새 분류",
    placeholder: "예를 들면 후기",
    emptyTitle: "아직 분류가 없습니다",
    emptyBody: "위에서 하나 적으면 글 쓰기와 목록 탭에 나타납니다.",
    nameMax: CATEGORY_NAME_MAX,
    nameError: categoryNameError,
    trimName: trimCategoryName,
  },
  hobby_tags: {
    noun: "말머리",
    addLabel: "새 말머리",
    placeholder: "예를 들면 클라이밍",
    emptyTitle: "아직 말머리가 없습니다",
    emptyBody: "위에서 하나 적으면 글 쓰기와 목록 칩에 나타납니다.",
    nameMax: HOBBY_NAME_MAX,
    nameError: hobbyNameError,
    trimName: trimHobbyName,
  },
};

export default function BoardLabelManager({ items = [], table }) {
  const kind = KINDS[table];
  const noun = kind?.noun ?? "이름";
  const nameMax = kind?.nameMax ?? 20;
  const nameError = kind?.nameError ?? (() => "이름을 적어 주세요.");
  const trimName = kind?.trimName ?? ((value) => (typeof value === "string" ? value.trim() : ""));
  const addLabel = kind?.addLabel ?? "추가";
  const placeholder = kind?.placeholder ?? "";
  const emptyTitle = kind?.emptyTitle ?? "아직 없습니다";
  const emptyBody = kind?.emptyBody ?? "";
  const router = useRouter();
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState(() => draftsFrom(items));
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function requireClient() {
    if (!kind) {
      setError(`${noun}를 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.`);
      return null;
    }

    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return null;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("운영하는 분으로 들어와 주세요.");
      return null;
    }

    return supabase;
  }

  async function handleAdd(event) {
    event.preventDefault();
    const nextName = trimName(name);
    const invalid = nameError(nextName);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending("add");
    setError("");
    const supabase = await requireClient();
    if (!supabase) {
      setPending("");
      return;
    }

    const { error: insertError } = await supabase.from(table).insert({
      name: nextName,
      sort_order: nextSortOrder(items),
      is_active: true,
    });

    setPending("");
    if (insertError) {
      setError(labelWriteError(insertError, noun, nameMax));
      return;
    }

    setName("");
    router.refresh();
  }

  async function handleSave(item) {
    const draft = drafts[item.id] ?? { name: item.name, sort_order: String(item.sort_order) };
    const nextName = trimName(draft.name);
    const invalid = nameError(nextName);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(item.id);
    setError("");
    const supabase = await requireClient();
    if (!supabase) {
      setPending("");
      return;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({
        name: nextName,
        sort_order: parseSortOrder(draft.sort_order, item.sort_order),
      })
      .eq("id", item.id);

    setPending("");
    if (updateError) {
      setError(labelWriteError(updateError, noun, nameMax));
      return;
    }

    router.refresh();
  }

  async function handleToggle(item) {
    setPending(`${item.id}:toggle`);
    setError("");
    const supabase = await requireClient();
    if (!supabase) {
      setPending("");
      return;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    setPending("");
    if (updateError) {
      setError(`${noun}를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-12 space-y-8">
      <form onSubmit={handleAdd} className="paper-sheet rounded-[1.85rem] p-7 md:p-8">
        <label className="block text-sm text-ink-soft" htmlFor={`${table}-name`}>
          {addLabel}
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id={`${table}-name`}
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, nameMax))}
            className="field-quiet rounded-2xl px-4 py-3"
            placeholder={placeholder}
            maxLength={nameMax}
            disabled={pending === "add"}
          />
          <button type="submit" className="btn-quiet shrink-0" disabled={pending === "add"}>
            {pending === "add" ? "담는 중…" : "추가"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink-soft">
          {trimName(name).length}/{nameMax}
        </p>
      </form>

      {items.length ? (
        <ul className="space-y-4">
          {items.map((item) => {
            const draft = drafts[item.id] ?? {
              name: item.name,
              sort_order: String(item.sort_order),
            };
            const saving = pending === item.id || pending === `${item.id}:toggle`;

            return (
              <li key={item.id} className="paper-sheet rounded-[1.85rem] p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-ink-soft">
                  <span className={item.is_active ? "text-sage-deep" : ""}>
                    {item.is_active ? "보임" : "숨김"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{table === "hobby_tags" ? `[${item.name}]` : item.name}</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_6rem_auto_auto] md:items-end">
                  <div>
                    <label className="block text-sm text-ink-soft" htmlFor={`${table}-name-${item.id}`}>
                      이름
                    </label>
                    <input
                      id={`${table}-name-${item.id}`}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            name: event.target.value.slice(0, nameMax),
                          },
                        }))
                      }
                      className="field-quiet mt-2 rounded-2xl px-4 py-3"
                      maxLength={nameMax}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-soft" htmlFor={`${table}-order-${item.id}`}>
                      순서
                    </label>
                    <input
                      id={`${table}-order-${item.id}`}
                      inputMode="numeric"
                      value={draft.sort_order}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            sort_order: event.target.value.replace(/[^\d-]/g, "").slice(0, 6),
                          },
                        }))
                      }
                      className="field-quiet mt-2 rounded-2xl px-4 py-3"
                      disabled={saving}
                    />
                  </div>
                  <button type="button" className="btn-quiet" onClick={() => handleSave(item)} disabled={saving}>
                    {pending === item.id ? "담는 중…" : "고치기"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => handleToggle(item)} disabled={saving}>
                    {pending === `${item.id}:toggle` ? "바꾸는 중…" : item.is_active ? "끄기" : "켜기"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center">
          <h2 className="display text-3xl text-ink">{emptyTitle}</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{emptyBody}</p>
        </section>
      )}

      {error ? (
        <p className="text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function draftsFrom(items) {
  return Object.fromEntries(
    items.map((item) => [item.id, { name: item.name, sort_order: String(item.sort_order ?? 0) }]),
  );
}

function labelWriteError(error, noun, nameMax) {
  const text = String(error?.message ?? "").toLowerCase();
  if (error?.code === "23505" || text.includes("duplicate") || text.includes("unique")) {
    return `같은 ${noun}가 이미 있습니다.`;
  }
  if (text.includes("check") || text.includes(String(nameMax)) || text.includes("length")) {
    return `${noun}는 1자에서 ${nameMax}자까지입니다.`;
  }
  return `${noun}를 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.`;
}
