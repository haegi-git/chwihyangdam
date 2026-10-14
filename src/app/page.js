import Link from "next/link";
import TodayNote from "@/components/notebook/TodayNote";
import WashiTape from "@/components/notebook/WashiTape";
import HobbyPostCard from "@/components/HobbyPostCard";
import { fetchRecentHobbyPosts } from "@/lib/hobbies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const posts = await loadPreview();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-14">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <section className="notebook-page">
          <WashiTape />
          <p className="kicker">취향담</p>
          <h1 className="display mt-6 text-4xl text-ink sm:text-5xl md:text-6xl">
            조용히 좋아하는 것들을 기록해요
          </h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-ink-soft md:text-lg">
            취미는 분류로 나누어 읽고, 말머리는 취미를 고를 때만 붙입니다. 일기는
            기본적으로 혼자 보고, 친구에게 연 날만 나눕니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/hobbies" className="btn-quiet">
              취미 게시판
            </Link>
            <Link href="/diary" className="btn-ghost">
              일기 열기
            </Link>
          </div>
        </section>
        <TodayNote />
      </div>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="display text-4xl text-ink">최근 글</h2>
          <Link href="/hobbies" className="text-sm text-sage-deep underline-offset-4 hover:underline">
            모두 보기
          </Link>
        </div>
        {posts.length ? (
          <ol className="ruled-sheet mt-6">
            {posts.map((post) => (
              <li key={post.id}>
                <HobbyPostCard post={post} />
              </li>
            ))}
          </ol>
        ) : (
          <section className="paper-sheet mt-6 px-8 py-12 text-center">
            <h3 className="display text-3xl text-ink">글이 천천히 모이고 있습니다</h3>
            <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
              첫 기록이 남으면 이곳에 먼저 보입니다.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}

async function loadPreview() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  return fetchRecentHobbyPosts(supabase, 3);
}
