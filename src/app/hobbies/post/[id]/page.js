import Link from "next/link";
import HobbyAuthorLink from "@/components/HobbyAuthorLink";
import HobbyPostActions from "@/components/HobbyPostActions";
import HobbyPostImages from "@/components/HobbyPostImages";
import PageFrame from "@/components/PageFrame";
import { formatDate } from "@/lib/dates";
import { fetchHobbyPostById, isPostId } from "@/lib/hobbies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await loadPost(id);

  return {
    title: post?.title || "글",
  };
}

export default async function HobbyPostPage({ params }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  if (!isPostId(id)) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="이 자리는 비어 있습니다"
          body="찾는 글이 없습니다. 주소를 다시 살펴 주세요."
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const post = await fetchHobbyPostById(supabase, id);

  if (!post) {
    return (
      <PageFrame narrow>
        <EmptyState
          title="이 자리는 비어 있습니다"
          body="찾는 글이 없거나, 이미 거두어진 글일 수 있습니다."
        />
      </PageFrame>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tag = post.hobby_tags;
  const isOwner = user?.id === post.author_id;

  return (
    <PageFrame narrow>
      <Link
        href={tag?.slug ? `/hobbies/${tag.slug}` : "/hobbies"}
        className="text-sm text-sage-deep underline-offset-8 hover:underline"
      >
        {tag?.name || "취미"}
      </Link>

      <article className="paper-sheet rise-in rise-in-2 mt-8 rounded-[1.85rem] p-7 md:p-10">
        {tag?.slug ? (
          <Link
            href={`/hobbies/${tag.slug}`}
            className="w-fit rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep"
          >
            {tag.name}
          </Link>
        ) : null}
        <h1 className="display mt-6 text-4xl text-ink md:text-5xl">{post.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
          <HobbyAuthorLink author={post.author} authorId={post.author_id} />
          <span aria-hidden="true">·</span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
        <p className="mt-8 whitespace-pre-wrap text-lg leading-9 text-ink-soft">
          {post.body}
        </p>
        <HobbyPostImages urls={post.image_urls} />
        {isOwner ? (
          <HobbyPostActions
            postId={post.id}
            tagSlug={tag?.slug || ""}
            imageUrls={post.image_urls}
          />
        ) : null}
      </article>
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

function EmptyState({ title, body }) {
  return (
    <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h1 className="display text-3xl text-ink md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href="/hobbies" className="btn-ghost mt-8">
        취미 목록
      </Link>
    </section>
  );
}
