import Link from "next/link";
import HobbyPostCard from "@/components/HobbyPostCard";
import IndexTabs from "@/components/notebook/IndexTabs";
import PaperCard from "@/components/notebook/PaperCard";
import WashiTape from "@/components/notebook/WashiTape";
import WritePen from "@/components/notebook/WritePen";
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
      <div className="relative pb-8">
        <WashiTape tone="pink" />
        <div className="flex flex-col gap-6 pt-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">마이너 · 마니아</p>
            <h1 className="display mt-4 text-5xl text-ink md:text-6xl">취미 게시판</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">
              자유, 정보, 질문으로 나누어 읽고, 말머리는 취미를 고르고 싶을 때 붙입니다.
            </p>
          </div>
          <Link href={writeHref} className="btn-quiet hidden shrink-0 md:inline-flex">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </div>

        <div className="mt-8">
          <IndexTabs
            label="분류"
            items={[
              {
                href: boardFilterHref({ hobbyId: selectedHobbyId }),
                current: !selectedCategoryId,
                label: "전체",
              },
              ...categories.map((category) => ({
                key: category.id,
                href: boardFilterHref({ categoryId: category.id, hobbyId: selectedHobbyId }),
                current: category.id === selectedCategoryId,
                label: category.name,
              })),
            ]}
          />
        </div>

        <nav className="chip-row mt-4" aria-label="말머리">
          <ul className="chip-scroller">
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
        <ol className="ruled-sheet">
          {posts.map((post) => (
            <li key={post.id}>
              <HobbyPostCard post={post} />
            </li>
          ))}
        </ol>
      ) : (
        <PaperCard className="mt-4 px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">{empty.title}</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{empty.body}</p>
          <Link href={writeHref} className="btn-quiet mt-8 hidden md:inline-flex">
            {user ? "글 남기기" : "들어와 글 남기기"}
          </Link>
        </PaperCard>
      )}
      <WritePen href={writeHref} label={user ? "글 남기기" : "들어와 글 남기기"} />
    </PageFrame>
  );
}

function FilterChip({ href, current, children }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className="chip"
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
