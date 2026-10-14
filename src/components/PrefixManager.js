"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PREFIX_NAME_MAX,
  nextSortOrder,
  parseSortOrder,
  prefixNameError,
  trimPrefixName,
} from "@/lib/prefixes";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function PrefixManager({ prefixes = [] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState(() => draftsFrom(prefixes));
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function requireClient() {
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
    const nextName = trimPrefixName(name);
    const invalid = prefixNameError(nextName);
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

    const { error: insertError } = await supabase.from("board_prefixes").insert({
      name: nextName,
      sort_order: nextSortOrder(prefixes),
      is_active: true,
    });

    setPending("");
    if (insertError) {
      setError(prefixWriteError(insertError));
      return;
    }

    setName("");
    router.refresh();
  }

  async function handleSave(prefix) {
    const draft = drafts[prefix.id] ?? { name: prefix.name, sort_order: String(prefix.sort_order) };
    const nextName = trimPrefixName(draft.name);
    const invalid = prefixNameError(nextName);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(prefix.id);
    setError("");
    const supabase = await requireClient();
    if (!supabase) {
      setPending("");
      return;
    }

    const { error: updateError } = await supabase
      .from("board_prefixes")
      .update({
        name: nextName,
        sort_order: parseSortOrder(draft.sort_order, prefix.sort_order),
      })
      .eq("id", prefix.id);

    setPending("");
    if (updateError) {
      setError(prefixWriteError(updateError));
      return;
    }

    router.refresh();
  }

  async function handleToggle(prefix) {
    setPending(`${prefix.id}:toggle`);
    setError("");
    const supabase = await requireClient();
    if (!supabase) {
      setPending("");
      return;
    }

    const { error: updateError } = await supabase
      .from("board_prefixes")
      .update({ is_active: !prefix.is_active })
      .eq("id", prefix.id);

    setPending("");
    if (updateError) {
      setError("말머리를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-12 space-y-8">
      <form onSubmit={handleAdd} className="paper-sheet rounded-[1.85rem] p-7 md:p-8">
        <label className="block text-sm text-ink-soft" htmlFor="prefix-name">
          새 말머리
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="prefix-name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, PREFIX_NAME_MAX))}
            className="field-quiet rounded-2xl px-4 py-3"
            placeholder="예를 들면 후기"
            maxLength={PREFIX_NAME_MAX}
            disabled={pending === "add"}
          />
          <button type="submit" className="btn-quiet shrink-0" disabled={pending === "add"}>
            {pending === "add" ? "담는 중…" : "추가"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink-soft">
          {trimPrefixName(name).length}/{PREFIX_NAME_MAX}
        </p>
      </form>

      {prefixes.length ? (
        <ul className="space-y-4">
          {prefixes.map((prefix) => {
            const draft = drafts[prefix.id] ?? {
              name: prefix.name,
              sort_order: String(prefix.sort_order),
            };
            const saving = pending === prefix.id || pending === `${prefix.id}:toggle`;

            return (
              <li key={prefix.id} className="paper-sheet rounded-[1.85rem] p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-ink-soft">
                  <span className={prefix.is_active ? "text-sage-deep" : ""}>
                    {prefix.is_active ? "보임" : "숨김"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>[{prefix.name}]</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_6rem_auto_auto] md:items-end">
                  <div>
                    <label className="block text-sm text-ink-soft" htmlFor={`prefix-name-${prefix.id}`}>
                      이름
                    </label>
                    <input
                      id={`prefix-name-${prefix.id}`}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [prefix.id]: {
                            ...draft,
                            name: event.target.value.slice(0, PREFIX_NAME_MAX),
                          },
                        }))
                      }
                      className="field-quiet mt-2 rounded-2xl px-4 py-3"
                      maxLength={PREFIX_NAME_MAX}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-soft" htmlFor={`prefix-order-${prefix.id}`}>
                      순서
                    </label>
                    <input
                      id={`prefix-order-${prefix.id}`}
                      inputMode="numeric"
                      value={draft.sort_order}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [prefix.id]: {
                            ...draft,
                            sort_order: event.target.value.replace(/[^\d-]/g, "").slice(0, 6),
                          },
                        }))
                      }
                      className="field-quiet mt-2 rounded-2xl px-4 py-3"
                      disabled={saving}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => handleSave(prefix)}
                    disabled={saving}
                  >
                    {pending === prefix.id ? "담는 중…" : "고치기"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleToggle(prefix)}
                    disabled={saving}
                  >
                    {pending === `${prefix.id}:toggle` ? "바꾸는 중…" : prefix.is_active ? "끄기" : "켜기"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center">
          <h2 className="display text-3xl text-ink">아직 말머리가 없습니다</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            위에서 하나 적으면 글 쓰기와 목록 칩에 나타납니다.
          </p>
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

function draftsFrom(prefixes) {
  return Object.fromEntries(
    prefixes.map((prefix) => [
      prefix.id,
      { name: prefix.name, sort_order: String(prefix.sort_order ?? 0) },
    ]),
  );
}

function prefixWriteError(error) {
  const text = String(error?.message ?? "").toLowerCase();
  if (error?.code === "23505" || text.includes("duplicate") || text.includes("unique")) {
    return "같은 말머리가 이미 있습니다.";
  }
  if (text.includes("prefix") || text.includes("20") || text.includes("check")) {
    return "말머리는 1자에서 20자까지입니다.";
  }
  return "말머리를 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}
