import PageFrame from "@/components/PageFrame";
import { hobbies } from "@/data/hobbies";

export const metadata = {
  title: "취미",
};

export default function HobbiesPage() {
  return (
    <PageFrame>
      <p className="eyebrow rise-in">마이너 · 마니아</p>
      <h1 className="rise-in rise-in-1 mt-3 font-serif text-3xl tracking-tight text-ink md:text-4xl">
        취미
      </h1>
      <p className="rise-in rise-in-2 mt-5 max-w-2xl leading-8 text-ink-soft">
        크게 떠들지 않아도 좋은 취향들입니다. 지금은 목 데이터로 자리를 채워
        두었고, 나중에 커뮤니티와 연결됩니다.
      </p>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hobbies.map((hobby, index) => (
          <li
            key={hobby.id}
            className={`soft-card rise-in rise-in-${(index % 6) + 1} flex flex-col rounded-[1.85rem] p-7`}
          >
            <span className="w-fit rounded-full bg-sage-mist px-2.5 py-1 text-xs tracking-wide text-sage-deep">
              {hobby.tag}
            </span>
            <h2 className="mt-5 font-serif text-2xl text-ink">{hobby.name}</h2>
            <p className="mt-4 flex-1 leading-8 text-ink-soft">{hobby.summary}</p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
