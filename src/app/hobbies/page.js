import Link from "next/link";
import HobbyPostCard from "@/components/HobbyPostCard";
import PageFrame from "@/components/PageFrame";
import { fetchActivePrefixes, fetchHobbyPosts } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { prefixName, selectedPrefixId } from "@/lib/prefixes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "취미",
};

export default async function HobbiesPage({ searchParams }) {
  const params = await searchParams;
  const { prefixes, posts, selectedId, user } = await loadBoard(params?.prefix);
  const selected = prefixes.find((prefix) => prefix.id === selectedId) ?? null;
  const writeHref = user ? "/hobbies/new" : loginHref("/hobbies/new");

  return (
    <PageFrame>
      <div className="border-b border-line/80 pb-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker rise-in">마이너 · 마니아</p>
            <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">취미</h1>
            <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
              취향을 칸으로 나누지 않습니다. 최근 글이 먼저 보이고, 말머리는 고르고 싶을 때만
              붙입니다.
            </p>
          </div>
          <Link href={writeHref} className="btn-quiet rise-in rise-in-3 shrink-0">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </div>

        <nav className="rise-in rise-in-3 mt-8" aria-label="말머리">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterChip href="/hobbies" current={!selectedId}>
                전체
              </FilterChip>
            </li>
            {prefixes.map((prefix) => (
              <li key={prefix.id}>
                <FilterChip href={`/hobbies?prefix=${prefix.id}`} current={prefix.id === selectedId}>
                  {prefix.name}
                </FilterChip>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {posts.length ? (
        <ol className="mt-12 space-y-6">
          {posts.map((post, index) => (
            <li key={post.id}>
              <HobbyPostCard post={post} index={index} />
            </li>
          ))}
        </ol>
      ) : (
        <section className="paper-sheet rise-in rise-in-3 mt-12 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">
            {selected ? "이 말머리에는 아직 글이 없습니다" : "아직 글이 없습니다"}
          </h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            {selected
              ? `[${prefixName({ board_prefixes: selected })}]로 짧은 기록을 남겨도 좋습니다.`
              : isSupabaseConfigured()
                ? "이 게시판의 첫 기록을 남겨 두어도 좋습니다. 짧게라도 충분합니다."
                : "로컬에서는 .env.local에 Supabase 주소를 적어 주세요."}
          </p>
          <Link href={writeHref} className="btn-quiet mt-8">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </section>
      )}
    </PageFrame>
  );
}

function FilterChip({ href, current, children }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition-colors duration-500 ${
        current
          ? "bg-sage-deep text-[#f7f1e6]"
          : "border border-line/90 bg-card/80 text-ink-soft hover:bg-sage-mist hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

async function loadBoard(prefixParam) {
  if (!isSupabaseConfigured()) {
    return { prefixes: [], posts: [], selectedId: "", user: null };
  }

  const supabase = await createClient();
  const prefixes = await fetchActivePrefixes(supabase);
  const selectedId = selectedPrefixId(prefixParam, prefixes);
  const [{ data: authData }, posts] = await Promise.all([
    supabase.auth.getUser(),
    fetchHobbyPosts(supabase, selectedId),
  ]);

  return {
    prefixes,
    posts,
    selectedId,
    user: authData.user,
  };
}
