import { redirect } from "next/navigation";
import Link from "next/link";
import HobbyPostForm from "@/components/HobbyPostForm";
import PageFrame from "@/components/PageFrame";
import { fetchHobbyPostById, isPostId } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await loadPost(id);

  return {
    title: post ? `${post.title} · 고치기` : "글 고치기",
  };
}

export default async function EditHobbyPostPage({ params }) {
  const { id } = await params;

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

  if (!isPostId(id)) {
    redirect("/hobbies");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginHref(`/hobbies/post/${id}/edit`));
  }

  const post = await fetchHobbyPostById(supabase, id);

  if (!post) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="이 자리는 비어 있습니다"
          body="찾는 글이 없거나, 이미 거두어진 글일 수 있습니다."
          href="/hobbies"
        />
      </PageFrame>
    );
  }

  if (user.id !== post.author_id) {
    redirect(`/hobbies/post/${post.id}`);
  }

  const tag = post.hobby_tags || { id: post.hobby_tag_id, slug: "", name: "취미" };

  return (
    <PageFrame narrow>
      <Link
        href={`/hobbies/post/${post.id}`}
        className="text-sm text-sage-deep underline-offset-8 hover:underline"
      >
        글로 돌아가기
      </Link>
      <div className="mt-8">
        <p className="kicker rise-in">기록</p>
        <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">
          글 고치기
        </h1>
        <p className="rise-in rise-in-2 mt-6 leading-8 text-ink-soft">
          남긴 마음을 천천히 다듬을 수 있습니다.
        </p>
      </div>
      <div className="mt-10">
        <HobbyPostForm
          mode="edit"
          tag={tag}
          post={post}
          cancelHref={`/hobbies/post/${post.id}`}
        />
      </div>
    </PageFrame>
  );
}

async function loadPost(id) {
  if (!isSupabaseConfigured() || !isPostId(id)) {
    return null;
  }

  const supabase = await createClient();
  return fetchHobbyPostById(supabase, id);
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
