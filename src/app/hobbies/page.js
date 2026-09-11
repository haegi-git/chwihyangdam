import FadeIn from "@/components/FadeIn";
import PageShell from "@/components/PageShell";
import { hobbies } from "@/data/hobbies";

export const metadata = {
  title: "취미",
};

export default function HobbiesPage() {
  return (
    <PageShell>
      <FadeIn>
        <p className="text-sm tracking-[0.16em] text-sage">마이너 · 마니아</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-ink md:text-4xl">
          취미
        </h1>
        <span
          aria-hidden="true"
          className="mt-6 block h-px w-12 bg-sage/35"
        />
        <p className="mt-6 max-w-2xl leading-8 text-ink-soft">
          크게 떠들지 않아도 좋은 취향들입니다. 지금은 목 데이터로 자리를 채워
          두었고, 나중에 커뮤니티와 연결됩니다.
        </p>
      </FadeIn>

      <FadeIn delay={140}>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hobbies.map((hobby) => (
            <li key={hobby.id} className="surface surface-hover flex flex-col p-7">
              <span className="w-fit rounded-full bg-sage-mist/90 px-2.5 py-0.5 text-xs text-sage-deep">
                {hobby.tag}
              </span>
              <h2 className="mt-5 font-serif text-2xl text-ink">{hobby.name}</h2>
              <p className="mt-4 flex-1 leading-8 text-ink-soft">{hobby.summary}</p>
            </li>
          ))}
        </ul>
      </FadeIn>
    </PageShell>
  );
}
