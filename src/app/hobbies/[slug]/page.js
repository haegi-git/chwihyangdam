import Link from "next/link";
import HobbyPostCard from "@/components/HobbyPostCard";
import PageFrame from "@/components/PageFrame";
import { fetchHobbyPostsForTag, fetchHobbyTagBySlug } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tag = await loadTag(slug);

  return {
    title: tag?.name || "취미",
  };
}

export default async function HobbyTagPage({ params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <EmptyState
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const tag = await fetchHobbyTagBySlug(supabase, slug);

  if (!tag) {
    return (
      <PageFrame>
        <EmptyState
          title="이 자리는 비어 있습니다"
          body="찾는 취미가 없습니다. 주소를 다시 살펴 주세요."
        />
      </PageFrame>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const posts = await fetchHobbyPostsForTag(supabase, tag.id);
  const writeHref = user
    ? `/hobbies/${tag.slug}/new`
    : loginHref(`/hobbies/${tag.slug}/new`);

  return (
    <PageFrame>
      <div className="border-b border-line/80 pb-12">
        <Link
          href="/hobbies"
          className="text-sm text-sage-deep underline-offset-8 hover:underline"
        >
          취미 목록
        </Link>
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker rise-in">취향</p>
            <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
              {tag.name}
            </h1>
            <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
              {tag.description || "이 취향을 천천히 들여다보는 자리입니다."}
            </p>
          </div>
          <Link href={writeHref} className="btn-quiet rise-in rise-in-3 shrink-0">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </div>
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
          <h2 className="display text-3xl text-ink">아직 글이 없습니다</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            이 취향의 첫 기록을 남겨 두어도 좋습니다. 짧게라도 충분합니다.
          </p>
          <Link href={writeHref} className="btn-quiet mt-8">
            {user ? "첫 글 남기기" : "들어와 글 남기기"}
          </Link>
        </section>
      )}
    </PageFrame>
  );
}

async function loadTag(slug) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  return fetchHobbyTagBySlug(supabase, slug);
}

function EmptyState({ title, body }) {
  return (
    <div>
      <p className="kicker rise-in">취미</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
        취미
      </h1>
      <section className="paper-sheet rise-in rise-in-2 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
        <h2 className="display text-3xl text-ink md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
        <Link href="/hobbies" className="btn-ghost mt-8">
          취미 목록
        </Link>
      </section>
    </div>
  );
}
