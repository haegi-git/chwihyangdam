import { hobbies } from "@/data/hobbies";

export const metadata = {
  title: "취미",
};

export default function HobbiesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 md:py-16">
      <p className="text-sm text-sage">마이너 · 마니아</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
        취미
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-soft">
        크게 떠들지 않아도 좋은 취향들입니다. 지금은 목 데이터로 자리를 채워
        두었고, 나중에 커뮤니티와 연결됩니다.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hobbies.map((hobby) => (
          <li
            key={hobby.id}
            className="flex flex-col rounded-3xl border border-line bg-card p-6"
          >
            <span className="w-fit rounded-full bg-sage-mist px-2.5 py-0.5 text-xs text-sage-deep">
              {hobby.tag}
            </span>
            <h2 className="mt-4 font-serif text-2xl text-ink">{hobby.name}</h2>
            <p className="mt-3 flex-1 leading-7 text-ink-soft">{hobby.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
