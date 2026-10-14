import Link from "next/link";
import HobbyAuthorLink from "@/components/HobbyAuthorLink";
import HiddenNotice from "@/components/HiddenNotice";
import HobbyPostImages from "@/components/HobbyPostImages";
import HighlighterTag from "@/components/notebook/HighlighterTag";
import { categoryName } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import { commentCountOf } from "@/lib/hobbies";
import { hobbyName } from "@/lib/hobby-tags";

export default function HobbyPostCard({ post, index = 0, layout = "row" }) {
  const commentCount = commentCountOf(post);
  const hobby = hobbyName(post);
  const category = categoryName(post);

  if (layout === "row") {
    return (
      <article className="post-row">
        {post.hidden_at ? <HiddenNotice className="mb-2" /> : null}
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="min-w-0 text-lg leading-8 text-ink">
            <Link href={`/hobbies/post/${post.id}`} className="hover:text-sage-deep">
              <HighlighterTag name={hobby} />
              {post.title}
            </Link>
          </h3>
          <time dateTime={post.created_at} className="shrink-0 text-sm text-ink-soft">
            {formatDate(post.created_at)}
          </time>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
          <HobbyAuthorLink author={post.author} authorId={post.author_id} />
          {category ? <span>{category}</span> : null}
          <Link href={`/hobbies/post/${post.id}#comments`} className="hover:text-sage-deep">
            댓글 {commentCount}
          </Link>
        </p>
      </article>
    );
  }

  return (
    <article className={`paper-sheet p-7 md:p-8 rise-in rise-in-${(index % 6) + 1}`}>
      {post.hidden_at ? <HiddenNotice className="mb-5" /> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
        <HobbyAuthorLink author={post.author} authorId={post.author_id} />
        <span aria-hidden="true">·</span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        {category ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{category}</span>
          </>
        ) : null}
        <Link href={`/hobbies/post/${post.id}#comments`} className="hover:text-sage-deep">
          댓글 {commentCount}
        </Link>
      </div>
      <h3 className="display mt-5 text-3xl text-ink">
        <Link href={`/hobbies/post/${post.id}`} className="hover:text-sage-deep">
          <HighlighterTag name={hobby} />
          {post.title}
        </Link>
      </h3>
      <HobbyPostImages urls={post.image_urls} compact limit={1} />
      <p className="mt-4 line-clamp-3 leading-8 text-ink-soft">{post.body}</p>
    </article>
  );
}
