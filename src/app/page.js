import Link from "next/link";
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
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-sage-mist/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-72 left-[-5rem] h-64 w-64 rounded-full bg-paper-deep blur-3xl"
      />

      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-14 md:pt-20">
        <p className="text-sm tracking-wide text-sage">마이너 취미 · 비공개 일기</p>
        <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-tight text-ink md:text-6xl">
          조용한 취향을 위한
          <br />
          작은 자리, 취향담
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
          잘 드러내지 않는 취미를 모아 두고, 일기는 기본적으로 혼자 봅니다.
          가까운 친구와 나누는 일은 서두르지 않고 나중에 이어집니다.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/hobbies"
            className="inline-flex h-12 items-center justify-center rounded-full bg-sage px-6 text-sm text-paper transition-colors hover:bg-sage-deep"
          >
            취미 둘러보기
          </Link>
          <Link
            href="/diary"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-card px-6 text-sm text-ink transition-colors hover:bg-paper-deep"
          >
            일기 열기
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-5 pb-16 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.href}
            className="rounded-3xl border border-line bg-card p-6"
          >
            <h2 className="font-serif text-2xl text-ink">{feature.title}</h2>
            <p className="mt-3 leading-7 text-ink-soft">{feature.body}</p>
            <Link
              href={feature.href}
              className="mt-6 inline-flex text-sm text-sage-deep underline-offset-4 hover:underline"
            >
              {feature.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-sage">요즘의 취향</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">천천히 곁에 두는 것들</h2>
          </div>
          <Link
            href="/hobbies"
            className="hidden text-sm text-sage-deep underline-offset-4 hover:underline sm:inline"
          >
            모두 보기
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {preview.map((hobby) => (
            <li
              key={hobby.id}
              className="rounded-3xl border border-line bg-card/80 p-5"
            >
              <span className="rounded-full bg-sage-mist px-2.5 py-0.5 text-xs text-sage-deep">
                {hobby.tag}
              </span>
              <h3 className="mt-4 font-serif text-xl text-ink">{hobby.name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{hobby.summary}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/hobbies"
          className="mt-6 inline-flex text-sm text-sage-deep underline-offset-4 hover:underline sm:hidden"
        >
          모두 보기
        </Link>
      </section>
    </div>
  );
}
