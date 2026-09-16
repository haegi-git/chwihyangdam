import Link from "next/link";
import HobbyPostCard from "@/components/HobbyPostCard";
import { fetchHobbyTags, fetchRecentHobbyPosts, postCountOf } from "@/lib/hobbies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const rooms = [
  {
    href: "/hobbies",
    index: "01",
    title: "취미",
    body: "잘 알려지지 않은 취향도, 오래 곁에 둔 마니아의 마음도 이곳에 모아 둡니다.",
    label: "취미 둘러보기",
  },
  {
    href: "/diary",
    index: "02",
    title: "일기",
    body: "오늘의 결은 기본적으로 나만 봅니다. 친구에게 나눌 날은 따로 고릅니다.",
    label: "일기 쓰기",
  },
  {
    href: "/friends",
    index: "03",
    title: "친구",
    body: "요청을 주고받은 뒤에, 친구가 체크한 날의 일기만 읽습니다.",
    label: "친구 자리",
  },
];

export default async function HomePage() {
  const { tags, posts } = await loadPreview();
  const [featured, ...rest] = tags;

  return (
    <div className="relative overflow-hidden">
      <section className="mx-auto grid w-full max-w-6xl items-end gap-10 px-6 pb-10 pt-10 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] md:gap-16 md:px-10 md:pb-8 md:pt-16">
        <div>
          <p className="kicker rise-in">마이너 취미 · 비공개 일기</p>
          <h1 className="display rise-in rise-in-1 mt-7 text-[2.7rem] text-ink sm:text-6xl md:text-7xl">
            조용한 취향을
            <br />
            위한 작은 자리
            <br />
            <span className="text-sage-deep">취향담</span>
          </h1>
          <p className="rise-in rise-in-2 mt-8 max-w-xl text-lg leading-9 text-ink-soft">
            잘 드러내지 않는 취미를 모아 두고, 일기는 기본적으로 혼자 봅니다.
            가까운 친구와 나누는 일은 체크한 날만 열립니다.
          </p>
          <div className="rise-in rise-in-3 mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/hobbies" className="btn-quiet">
              취미 둘러보기
            </Link>
            <Link href="/diary" className="btn-ghost">
              일기 열기
            </Link>
          </div>
        </div>

        <aside className="rise-in rise-in-2 relative">
          <p className="hero-scroll absolute -left-8 top-6 hidden h-48 lg:block">
            천천히, 고요히
          </p>
          <div className="paper-sheet rounded-[2rem] px-7 py-8 md:min-h-[22rem] md:px-8 md:py-10">
            <p className="kicker">오늘의 결</p>
            <p className="display mt-6 text-3xl text-ink md:text-4xl">
              혼자 보는 일기,
              <br />
              고른 날만 나누는 친구.
            </p>
            <p className="mt-6 leading-8 text-ink-soft">
              이곳에선 소리가 작아도 충분합니다. 취향은 모으고, 마음은 잠시 접어
              둡니다.
            </p>
            <p className="mt-10 font-serif text-sm tracking-[0.2em] text-sage-deep">
              다실처럼, 천천히
            </p>
          </div>
        </aside>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-8 md:px-10">
        <div className="section-rule rise-in">
          <span>자리</span>
        </div>
        <ol className="mt-4 divide-y divide-line/80">
          {rooms.map((room, index) => (
            <li
              key={room.href}
              className={`rise-in rise-in-${index + 2} grid gap-3 py-8 md:grid-cols-[5rem_8rem_minmax(0,1fr)_auto] md:items-center md:gap-8 md:py-10`}
            >
              <p className="font-serif text-2xl text-sage">{room.index}</p>
              <h2 className="display text-3xl text-ink">{room.title}</h2>
              <p className="max-w-xl leading-8 text-ink-soft">{room.body}</p>
              <Link
                href={room.href}
                className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:text-sage hover:underline"
              >
                {room.label}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-6 md:px-10">
        <div className="rise-in flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">요즘의 취향</p>
            <h2 className="display mt-4 text-4xl text-ink md:text-5xl">
              천천히 곁에 두는 것들
            </h2>
          </div>
          <Link
            href="/hobbies"
            className="hidden text-sm text-sage-deep underline-offset-8 hover:underline md:inline"
          >
            모두 보기
          </Link>
        </div>

        {featured ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Link
              href={`/hobbies/${featured.slug}`}
              className="paper-sheet rise-in rise-in-2 block rounded-[2rem] p-8 md:min-h-[20rem] md:p-10"
            >
              <span className="rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep">
                {postCountOf(featured) ? `글 ${postCountOf(featured)}` : "아직 비어 있음"}
              </span>
              <h3 className="display mt-8 text-4xl text-ink md:text-5xl">
                {featured.name}
              </h3>
              <p className="mt-5 max-w-lg text-lg leading-9 text-ink-soft">
                {featured.description || "이 취향을 천천히 들여다보는 자리입니다."}
              </p>
            </Link>
            <ul className="grid gap-6">
              {rest.map((tag, index) => (
                <li key={tag.id}>
                  <Link
                    href={`/hobbies/${tag.slug}`}
                    className={`paper-sheet rise-in rise-in-${index + 3} block rounded-[1.75rem] p-7`}
                  >
                    <span className="rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep">
                      {postCountOf(tag) ? `글 ${postCountOf(tag)}` : "아직 비어 있음"}
                    </span>
                    <h3 className="display mt-4 text-2xl text-ink">{tag.name}</h3>
                    <p className="mt-3 leading-7 text-ink-soft">
                      {tag.description || "이 취향을 천천히 들여다보는 자리입니다."}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <section className="paper-sheet rise-in rise-in-2 mt-10 rounded-[2rem] px-8 py-12 text-center">
            <h3 className="display text-3xl text-ink">취향이 천천히 모이고 있습니다</h3>
            <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
              취미 태그가 열리면 이곳에 먼저 보입니다.
            </p>
          </section>
        )}

        {posts.length ? (
          <div className="mt-16">
            <div className="section-rule rise-in">
              <span>최근 글</span>
            </div>
            <ol className="mt-10 grid gap-6 lg:grid-cols-3">
              {posts.map((post, index) => (
                <li key={post.id}>
                  <HobbyPostCard post={post} index={index} showTag />
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <Link
          href="/hobbies"
          className="mt-8 inline-flex text-sm text-sage-deep underline-offset-8 hover:underline md:hidden"
        >
          모두 보기
        </Link>
      </section>
    </div>
  );
}

async function loadPreview() {
  if (!isSupabaseConfigured()) {
    return { tags: [], posts: [] };
  }

  const supabase = await createClient();
  const [allTags, posts] = await Promise.all([
    fetchHobbyTags(supabase),
    fetchRecentHobbyPosts(supabase, 3),
  ]);

  return {
    tags: allTags.slice(0, 3),
    posts,
  };
}
