import Link from "next/link";
import { displayAvatar, displayLabel, profileHref } from "@/lib/friends";

export default function PersonFace({ profile, href, size = "md", children }) {
  const name = displayLabel(profile);
  const photo = displayAvatar(profile);
  const target = href || (profile?.id ? profileHref(profile.id) : "");
  const compact = size === "sm";
  const face = compact ? "h-9 w-9 text-sm" : "h-12 w-12 text-lg";

  const avatar = photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
    <img
      src={photo}
      alt=""
      className={`${face} rounded-full border border-line object-cover`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      className={`inline-flex ${face} items-center justify-center rounded-full border border-line bg-sage-mist font-serif text-sage-deep`}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  );

  const identity = (
    <span className="min-w-0">
      <span className={`block truncate ${compact ? "text-sm text-ink" : "display text-xl text-ink"}`}>
        {name}
      </span>
      {children}
    </span>
  );

  if (!target) {
    return (
      <span className="flex min-w-0 items-center gap-3">
        {avatar}
        {identity}
      </span>
    );
  }

  return (
    <Link href={target} className="flex min-w-0 items-center gap-3 text-ink transition-colors duration-500 hover:text-sage-deep">
      {avatar}
      {identity}
    </Link>
  );
}
