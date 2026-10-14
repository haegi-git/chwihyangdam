import Link from "next/link";
import HobbyPostCard from "@/components/HobbyPostCard";
import PageFrame from "@/components/PageFrame";
import {
  boardFilterHref,
  categoryQuery,
  composeHref,
  emptyBoardCopy,
  hobbyQuery,
  selectedActiveId,
} from "@/lib/board";
import { fetchActiveCategories, fetchActiveHobbyTags, fetchHobbyPosts } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "취미",
};

export default async function HobbiesPage({ searchParams }) {
  const params = await searchParams;
  const board = await loadBoard(params);
  const { categories, hobbies, posts, selectedCategoryId, selectedHobbyId, user } = board;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedHobby = hobbies.find((hobby) => hobby.id === selectedHobbyId) ?? null;
  const writePath = composeHref({ categoryId: selectedCategoryId, hobbyId: selectedHobbyId });
  const writeHref = user ? writePath : loginHref(writePath);
  const empty = emptyBoardCopy({
    category: selectedCategory,
    hobby: selectedHobby,
    configured: isSupabaseConfigured(),
  });

  return (
    <PageFrame>
      <div className="border-b border-line/80 pb-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker rise-in">마이너 · 마니아</p>
            <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">취미</h1>
            <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
              자유, 정보, 질문으로 나누어 읽고, 말머리는 취미를 고르고 싶을 때 붙입니다.
            </p>
          </div>
          <Link href={writeHref} className="btn-quiet rise-in rise-in-3 shrink-0">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </div>

        <nav className="rise-in rise-in-3 mt-8" aria-label="분류">
          <ul className="flex flex-wrap gap-x-1 gap-y-1 border-b border-line/80">
            <li>
              <CategoryTab
                href={boardFilterHref({ hobbyId: selectedHobbyId })}
                current={!selectedCategoryId}
              >
                전체
              </CategoryTab>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryTab
                  href={boardFilterHref({ categoryId: category.id, hobbyId: selectedHobbyId })}
                  current={category.id === selectedCategoryId}
                >
                  {category.name}
                </CategoryTab>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="mt-4" aria-label="말머리">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterChip
                href={boardFilterHref({ categoryId: selectedCategoryId })}
                current={!selectedHobbyId}
              >
                전체
              </FilterChip>
            </li>
            {hobbies.map((hobby) => (
              <li key={hobby.id}>
                <FilterChip
                  href={boardFilterHref({ categoryId: selectedCategoryId, hobbyId: hobby.id })}
                  current={hobby.id === selectedHobbyId}
                >
                  {hobby.name}
                </FilterChip>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {posts.length ? (
        <ol className="mt-12 space-y-6">
          {posts.map((post, index) => (
            <li key={post.id}>
              <HobbyPostCard post={post} index={index} />
            </li>
          ))}
        </ol>
      ) : (
        <section className="paper-sheet rise-in rise-in-3 mt-12 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">{empty.title}</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{empty.body}</p>
          <Link href={writeHref} className="btn-quiet mt-8">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </section>
      )}
    </PageFrame>
  );
}

function CategoryTab({ href, current, children }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm transition-colors duration-500 ${
        current
          ? "border-sage-deep text-ink"
          : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function FilterChip({ href, current, children }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition-colors duration-500 ${
        current
          ? "bg-sage-deep text-[#f7f1e6]"
          : "border border-line/90 bg-card/80 text-ink-soft hover:bg-sage-mist hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

async function loadBoard(params) {
  if (!isSupabaseConfigured()) {
    return {
      categories: [],
      hobbies: [],
      posts: [],
      selectedCategoryId: "",
      selectedHobbyId: "",
      user: null,
    };
  }

  const supabase = await createClient();
  const [categories, hobbies] = await Promise.all([
    fetchActiveCategories(supabase),
    fetchActiveHobbyTags(supabase),
  ]);
  const selectedCategoryId = selectedActiveId(categoryQuery(params), categories);
  const selectedHobbyId = selectedActiveId(hobbyQuery(params), hobbies);
  const [{ data: authData }, posts] = await Promise.all([
    supabase.auth.getUser(),
    fetchHobbyPosts(supabase, { categoryId: selectedCategoryId, hobbyTagId: selectedHobbyId }),
  ]);

  return {
    categories,
    hobbies,
    posts,
    selectedCategoryId,
    selectedHobbyId,
    user: authData.user,
  };
}
