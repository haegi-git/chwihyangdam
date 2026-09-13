import Link from "next/link";
import { authorLabel } from "@/lib/hobbies";

export default function HobbyAuthorLink({ author, authorId, className = "" }) {
  const name = authorLabel(author);
  const photo = author?.avatar_url?.trim() || "";
  const href = `/profile/${author?.id || authorId}`;

  return (
    <Link
      href={href}
      className={`inline-flex min-w-0 items-center gap-2 text-sage-deep underline-offset-8 transition-colors duration-500 hover:text-sage hover:underline ${className}`.trim()}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
        <img
          src={photo}
          alt=""
          className="h-6 w-6 rounded-full border border-line object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-sage-mist font-serif text-[0.7rem] text-sage-deep"
          aria-hidden="true"
        >
          {name.slice(0, 1)}
        </span>
      )}
      <span className="truncate">{name}</span>
    </Link>
  );
}
