"use client";

import { useEffect, useState } from "react";
import BlockControl from "@/components/BlockControl";
import PersonFace from "@/components/PersonFace";
import { PROFILE_FACE_SELECT, displayLabel } from "@/lib/friends";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BlockedList({ userId }) {
  const configured = isSupabaseConfigured();
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured || !userId) {
      return undefined;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("user_blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false })
      .then(async ({ data, error: loadError }) => {
        if (cancelled) {
          return;
        }

        if (loadError) {
          setError("차단 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
          setRows([]);
          setLoaded(true);
          return;
        }

        const blocks = data ?? [];
        const ids = blocks.map((row) => row.blocked_id).filter(Boolean);

        if (!ids.length) {
          setRows([]);
          setError("");
          setLoaded(true);
          return;
        }

        const { data: faces } = await supabase.from("profiles").select(PROFILE_FACE_SELECT).in("id", ids);

        if (cancelled) {
          return;
        }

        const byId = new Map((faces ?? []).map((profile) => [profile.id, profile]));
        const next = blocks
          .map((row) => ({
            ...row,
            profile: byId.get(row.blocked_id) ?? { id: row.blocked_id },
          }))
          .sort((left, right) =>
            displayLabel(left.profile).localeCompare(displayLabel(right.profile), "ko"),
          );

        setRows(next);
        setError("");
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [configured, userId]);

  return (
    <section className="paper-sheet rounded-[2.2rem] px-8 py-10 md:px-12 md:py-12">
      <p className="kicker">조용히 가리기</p>
      <h2 className="display mt-5 text-3xl text-ink">차단 목록</h2>
      <p className="mt-4 text-sm leading-7 text-ink-soft">
        차단하면 서로의 취미 글과 댓글이 보이지 않고, 서로 친구로 남을 수
        없습니다. 상대에게는 알리지 않습니다.
      </p>

      {error ? (
        <p className="mt-6 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      {!loaded ? (
        <p className="mt-6 text-sm text-ink-soft">목록을 여는 중…</p>
      ) : rows.length ? (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li
              key={row.blocked_id}
              className="flex flex-col gap-3 rounded-[1.4rem] border border-line/70 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <PersonFace profile={row.profile} size="sm" />
              <BlockControl
                profileId={row.blocked_id}
                currentUserId={userId}
                blocked
                appearance="button"
                onChanged={(nextBlocked) => {
                  if (!nextBlocked) {
                    setRows((current) => current.filter((item) => item.blocked_id !== row.blocked_id));
                  }
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm leading-7 text-ink-soft">차단해 둔 사람이 없습니다.</p>
      )}
    </section>
  );
}
