import Link from "next/link";
import HobbyAuthorLink from "@/components/HobbyAuthorLink";
import HobbyPostImages from "@/components/HobbyPostImages";
import { formatDate } from "@/lib/dates";

export default function HobbyPostCard({ post, index = 0, showTag = false }) {
  const tag = post.hobby_tags;

  return (
    <article
      className={`paper-sheet rise-in rise-in-${(index % 6) + 1} rounded-[1.85rem] p-7 md:p-8`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
        <HobbyAuthorLink author={post.author} authorId={post.author_id} />
        <span aria-hidden="true">·</span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        {showTag && tag?.slug ? (
          <>
            <span aria-hidden="true">·</span>
            <Link
              href={`/hobbies/${tag.slug}`}
              className="rounded-full bg-sage-mist px-2.5 py-1 text-xs tracking-wide text-sage-deep"
            >
              {tag.name}
            </Link>
          </>
        ) : null}
      </div>
      <h3 className="display mt-5 text-3xl text-ink">
        <Link
          href={`/hobbies/post/${post.id}`}
          className="transition-colors duration-500 hover:text-sage-deep"
        >
          {post.title}
        </Link>
      </h3>
      <HobbyPostImages urls={post.image_urls} compact limit={1} />
      <p className="mt-4 line-clamp-3 leading-8 text-ink-soft">{post.body}</p>
      <Link
        href={`/hobbies/post/${post.id}`}
        className="mt-6 inline-flex text-sm text-sage-deep underline-offset-8 hover:underline"
      >
        이어서 읽기
      </Link>
    </article>
  );
}
