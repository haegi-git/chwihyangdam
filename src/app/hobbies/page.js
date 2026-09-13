import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import { fetchHobbyTags, postCountOf } from "@/lib/hobbies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "취미",
};

export default async function HobbiesPage() {
  const tags = await loadTags();

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
          크게 떠들지 않아도 좋은 취향들입니다. 태그를 골라 글을 읽고, 들어와
          있으면 한 편을 조용히 남길 수 있습니다.
        </p>
      </div>

      {tags.length ? (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tags.map((tag, index) => {
            const count = postCountOf(tag);

            return (
              <li key={tag.id}>
                <Link
                  href={`/hobbies/${tag.slug}`}
                  className={`paper-sheet rise-in rise-in-${(index % 6) + 1} flex h-full flex-col rounded-[1.85rem] p-7`}
                >
                  <span className="w-fit rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep">
                    {count ? `글 ${count}` : "아직 비어 있음"}
                  </span>
                  <h2 className="display mt-8 text-3xl text-ink">{tag.name}</h2>
                  <p className="mt-4 flex-1 leading-8 text-ink-soft">
                    {tag.description || "이 취향을 천천히 들여다보는 자리입니다."}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="paper-sheet rise-in rise-in-2 mt-12 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">취향이 천천히 모이고 있습니다</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            {isSupabaseConfigured()
              ? "아직 열린 태그가 없습니다. 잠시 뒤 다시 와 주세요."
              : "로컬에서는 .env.local에 Supabase 주소를 적어 주세요."}
          </p>
        </section>
      )}
    </PageFrame>
  );
}

async function loadTags() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  return fetchHobbyTags(supabase);
}
