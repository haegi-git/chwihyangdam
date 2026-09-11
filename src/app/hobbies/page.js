import PageFrame from "@/components/PageFrame";
import { hobbies } from "@/data/hobbies";

export const metadata = {
  title: "취미",
};

export default function HobbiesPage() {
  return (
    <PageFrame>
      <div className="grid gap-8 border-b border-line/80 pb-12 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] md:items-end">
        <div>
          <p className="kicker rise-in">마이너 · 마니아</p>
          <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
            취미
          </h1>
        </div>
        <p className="rise-in rise-in-2 max-w-xl text-lg leading-9 text-ink-soft">
          크게 떠들지 않아도 좋은 취향들입니다. 지금은 목 데이터로 자리를 채워
          두었고, 나중에 커뮤니티와 연결됩니다.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {hobbies.map((hobby, index) => (
          <li
            key={hobby.id}
            className={`paper-sheet rise-in rise-in-${(index % 6) + 1} flex flex-col rounded-[1.85rem] p-7`}
          >
            <span className="w-fit rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep">
              {hobby.tag}
            </span>
            <h2 className="display mt-8 text-3xl text-ink">{hobby.name}</h2>
            <p className="mt-4 flex-1 leading-8 text-ink-soft">{hobby.summary}</p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
