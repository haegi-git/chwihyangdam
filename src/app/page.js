import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import { hobbies } from "@/data/hobbies";

const features = [
  {
    href: "/hobbies",
    title: "취미",
    body: "잘 알려지지 않은 취향도, 오래 곁에 둔 마니아의 마음도 이곳에 모아 둡니다.",
    label: "취미 둘러보기",
  },
  {
    href: "/diary",
    title: "일기",
    body: "오늘의 결은 기본적으로 나만 봅니다. 남겨 둔 글은 조용히 쌓입니다.",
    label: "일기 쓰기",
  },
  {
    href: "/friends",
    title: "친구",
    body: "가까운 이와 일기를 나누는 자리는 천천히 열 예정입니다.",
    label: "준비 중인 자리",
  },
];

export default function HomePage() {
  const preview = hobbies.slice(0, 3);

  return (
    <div className="relative">
      <FadeIn
        as="section"
        className="mx-auto w-full max-w-5xl px-6 pb-20 pt-16 md:px-8 md:pt-28"
      >
        <p className="text-sm tracking-[0.18em] text-sage">
          마이너 취미 · 비공개 일기
        </p>
        <h1 className="mt-5 max-w-xl font-serif text-4xl leading-tight tracking-tight text-ink md:text-6xl">
          조용한 취향을 위한
          <br />
          작은 자리, 취향담
        </h1>
        <span
          aria-hidden="true"
          className="mt-7 block h-px w-16 bg-sage/35"
        />
        <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-soft">
          잘 드러내지 않는 취미를 모아 두고, 일기는 기본적으로 혼자 봅니다.
          가까운 친구와 나누는 일은 서두르지 않고 나중에 이어집니다.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/hobbies"
            className="inline-flex h-12 items-center justify-center rounded-full bg-sage px-7 text-sm text-paper transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-sage-deep"
          >
            취미 둘러보기
          </Link>
          <Link
            href="/diary"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line/90 bg-card/80 px-7 text-sm text-ink transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-paper-deep/80"
          >
            일기 열기
          </Link>
        </div>
      </FadeIn>

      <FadeIn
        as="section"
        delay={120}
        className="mx-auto grid w-full max-w-5xl gap-5 px-6 pb-20 md:grid-cols-3 md:px-8"
      >
        {features.map((feature) => (
          <article key={feature.href} className="surface surface-hover p-7">
            <h2 className="font-serif text-2xl text-ink">{feature.title}</h2>
            <p className="mt-4 leading-8 text-ink-soft">{feature.body}</p>
            <Link
              href={feature.href}
              className="mt-7 inline-flex text-sm text-sage-deep underline-offset-8 transition-opacity duration-500 hover:opacity-70 hover:underline"
            >
              {feature.label}
            </Link>
          </article>
        ))}
      </FadeIn>

      <FadeIn
        as="section"
        delay={220}
        className="mx-auto w-full max-w-5xl px-6 pb-24 md:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.16em] text-sage">요즘의 취향</p>
            <h2 className="mt-3 font-serif text-3xl text-ink">
              천천히 곁에 두는 것들
            </h2>
          </div>
          <Link
            href="/hobbies"
            className="hidden text-sm text-sage-deep underline-offset-8 transition-opacity duration-500 hover:opacity-70 hover:underline sm:inline"
          >
            모두 보기
          </Link>
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {preview.map((hobby) => (
            <li key={hobby.id} className="surface surface-hover p-6">
              <span className="rounded-full bg-sage-mist/90 px-2.5 py-0.5 text-xs text-sage-deep">
                {hobby.tag}
              </span>
              <h3 className="mt-5 font-serif text-xl text-ink">{hobby.name}</h3>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                {hobby.summary}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/hobbies"
          className="mt-8 inline-flex text-sm text-sage-deep underline-offset-8 transition-opacity duration-500 hover:opacity-70 hover:underline sm:hidden"
        >
          모두 보기
        </Link>
      </FadeIn>
    </div>
  );
}
