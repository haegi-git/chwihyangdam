import { blocksFromPost } from "@/lib/post-content";

export default function HobbyPostBody({ post }) {
  const blocks = blocksFromPost(post).filter((block) => {
    if (block.type === "paragraph") {
      return Boolean(block.text.trim());
    }

    return Boolean(block.url);
  });

  if (!blocks.length) {
    return null;
  }

  return (
    <div className="mt-8 space-y-7">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${index}`}
              className="whitespace-pre-wrap text-lg leading-9 text-ink-soft"
            >
              {block.text}
            </p>
          );
        }

        return (
          <figure key={`image-${block.url}-${index}`} className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- 스토리지 공개 URL은 호스트가 다양해 img로 둡니다. */}
            <img
              src={block.url}
              alt=""
              className="w-full rounded-2xl border border-line/70 bg-paper-deep/40 object-cover"
              referrerPolicy="no-referrer"
            />
          </figure>
        );
      })}
    </div>
  );
}
