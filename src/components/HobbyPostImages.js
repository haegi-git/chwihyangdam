import { normalizePostImageUrls } from "@/lib/post-images";

export default function HobbyPostImages({ urls, compact = false, limit }) {
  const images = normalizePostImageUrls(urls).slice(
    0,
    Number.isFinite(limit) && limit > 0 ? limit : undefined,
  );

  if (!images.length) {
    return null;
  }

  const single = images.length === 1;

  return (
    <ul
      className={`grid gap-2 ${
        compact
          ? `mt-5 ${single ? "grid-cols-1" : "grid-cols-2"}`
          : `mt-8 ${single ? "grid-cols-1" : "sm:grid-cols-2"}`
      }`}
    >
      {images.map((url, index) => (
        <li key={`${url}-${index}`} className={single && !compact ? "sm:col-span-2" : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 스토리지 공개 URL은 호스트가 다양해 img로 둡니다. */}
          <img
            src={url}
            alt=""
            className={`w-full rounded-2xl border border-line/70 bg-paper-deep/40 object-cover ${
              compact ? (single ? "max-h-52" : "aspect-[4/3] max-h-40") : "max-h-[28rem]"
            }`}
            referrerPolicy="no-referrer"
          />
        </li>
      ))}
    </ul>
  );
}
