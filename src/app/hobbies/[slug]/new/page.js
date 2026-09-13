import { redirect } from "next/navigation";
import Link from "next/link";
import HobbyPostForm from "@/components/HobbyPostForm";
import PageFrame from "@/components/PageFrame";
import { fetchHobbyTagBySlug } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tag = await loadTag(slug);

  return {
    title: tag ? `${tag.name} · 글 남기기` : "글 남기기",
  };
}

export default async function NewHobbyPostPage({ params }) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
          href="/hobbies"
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const tag = await fetchHobbyTagBySlug(supabase, slug);

  if (!tag) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="이 자리는 비어 있습니다"
          body="찾는 취미가 없습니다. 주소를 다시 살펴 주세요."
          href="/hobbies"
        />
      </PageFrame>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginHref(`/hobbies/${tag.slug}/new`));
  }

  return (
    <PageFrame narrow>
      <Link
        href={`/hobbies/${tag.slug}`}
        className="text-sm text-sage-deep underline-offset-8 hover:underline"
      >
        {tag.name}
      </Link>
      <div className="mt-8">
        <p className="kicker rise-in">기록</p>
        <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">
          글 남기기
        </h1>
        <p className="rise-in rise-in-2 mt-6 leading-8 text-ink-soft">
          {tag.name}에 짧은 기록을 남겨 둡니다. 누구나 읽을 수 있습니다.
        </p>
      </div>
      <div className="mt-10">
        <HobbyPostForm
          mode="create"
          tag={tag}
          cancelHref={`/hobbies/${tag.slug}`}
        />
      </div>
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

function EmptyState({ title, body, href }) {
  return (
    <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h1 className="display text-3xl text-ink md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href={href} className="btn-ghost mt-8">
        돌아가기
      </Link>
    </section>
  );
}
