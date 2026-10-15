import Link from "next/link";
import { redirect } from "next/navigation";
import BoardPager from "@/components/BoardPager";
import BoardSearch from "@/components/BoardSearch";
import HobbyPostCard from "@/components/HobbyPostCard";
import IndexTabs from "@/components/notebook/IndexTabs";
import PaperCard from "@/components/notebook/PaperCard";
import WashiTape from "@/components/notebook/WashiTape";
import WritePen from "@/components/notebook/WritePen";
import PageFrame from "@/components/PageFrame";
import {
  boardFilterHref,
  boardListHref,
  boardLocationDrift,
  boardPageCount,
  categoryQuery,
  composeHref,
  emptyBoardCopy,
  emptySearchCopy,
  firstParam,
  hobbyQuery,
  isSearchableQuery,
  parseBoardPage,
  parseBoardScope,
  searchQuery,
  selectedActiveId,
} from "@/lib/board";
import { fetchActiveCategories, fetchActiveHobbyTags, fetchHobbyBoard } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "취미",
};

export default async function HobbiesPage({ searchParams }) {
  const params = await searchParams;
  const board = await loadBoard(params);
  if (board.redirectTo) {
    redirect(board.redirectTo);
  }
  const {
    categories,
    hobbies,
    posts,
    total,
    page,
    query,
    scope,
    selectedCategoryId,
    selectedHobbyId,
    user,
    error,
  } = board;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedHobby = hobbies.find((hobby) => hobby.id === selectedHobbyId) ?? null;
  const writePath = composeHref({ categoryId: selectedCategoryId, hobbyId: selectedHobbyId });
  const writeHref = user ? writePath : loginHref(writePath);
  const searching = isSearchableQuery(query);
  const empty = error
    ? { title: "글을 열지 못했습니다", body: "잠시 뒤 다시 시도해 주세요." }
    : searching
      ? emptySearchCopy(query)
      : emptyBoardCopy({
          category: selectedCategory,
          hobby: selectedHobby,
          configured: isSupabaseConfigured(),
        });
  const totalPages = boardPageCount(total);
  const filterHref = (next) =>
    boardFilterHref({
      q: query,
      scope,
      ...next,
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
                href: filterHref({ hobbyId: selectedHobbyId }),
                current: !selectedCategoryId,
                label: "전체",
              },
              ...categories.map((category) => ({
                key: category.id,
                href: filterHref({ categoryId: category.id, hobbyId: selectedHobbyId }),
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
                href={filterHref({ categoryId: selectedCategoryId })}
                current={!selectedHobbyId}
              >
                전체
              </FilterChip>
            </li>
            {hobbies.map((hobby) => (
              <li key={hobby.id}>
                <FilterChip
                  href={filterHref({ categoryId: selectedCategoryId, hobbyId: hobby.id })}
                  current={hobby.id === selectedHobbyId}
                >
                  {hobby.name}
                </FilterChip>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <BoardSearch
            categoryId={selectedCategoryId}
            hobbyId={selectedHobbyId}
            q={query}
            scope={scope}
          />
          {searching ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft" role="status">
              <span>“{query}” 검색 결과 {total}개</span>
              <Link
                href={filterHref({
                  categoryId: selectedCategoryId,
                  hobbyId: selectedHobbyId,
                  q: "",
                  scope: "all",
                })}
                className="board-search-clear"
                aria-label="검색 지우기"
              >
                ×
              </Link>
            </p>
          ) : query ? (
            <p className="mt-3 text-sm text-ink-soft">두 글자부터 찾습니다.</p>
          ) : null}
        </div>
      </div>

      {posts.length ? (
        <ol className="ruled-sheet">
          {posts.map((post) => (
            <li key={post.id}>
              <HobbyPostCard post={post} highlight={searching ? query : ""} />
            </li>
          ))}
        </ol>
      ) : (
        <PaperCard className="mt-4 px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">{empty.title}</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{empty.body}</p>
          {searching ? null : (
            <Link href={writeHref} className="btn-quiet mt-8 hidden md:inline-flex">
              {user ? "글 남기기" : "들어와 글 남기기"}
            </Link>
          )}
        </PaperCard>
      )}
      <BoardPager
        page={page}
        totalPages={totalPages}
        categoryId={selectedCategoryId}
        hobbyId={selectedHobbyId}
        q={query}
        scope={scope}
      />
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
  const query = searchQuery(params);
  const scope = parseBoardScope(params?.scope);
  const requestedPage = parseBoardPage(params?.page);

  if (!isSupabaseConfigured()) {
    const redirectTo = boardLocationDrift({
      pageRaw: firstParam(params?.page),
      qRaw: firstParam(params?.q),
      scopeRaw: firstParam(params?.scope),
      page: 1,
      q: query,
      scope,
    })
      ? boardListHref({ q: query, scope, page: 1 })
      : "";

    return {
      categories: [],
      hobbies: [],
      posts: [],
      total: 0,
      page: 1,
      query,
      scope,
      selectedCategoryId: "",
      selectedHobbyId: "",
      user: null,
      error: false,
      redirectTo,
    };
  }

  const supabase = await createClient();
  const [categories, hobbies] = await Promise.all([
    fetchActiveCategories(supabase),
    fetchActiveHobbyTags(supabase),
  ]);
  const selectedCategoryId = selectedActiveId(categoryQuery(params), categories);
  const selectedHobbyId = selectedActiveId(hobbyQuery(params), hobbies);
  const [{ data: authData }, board] = await Promise.all([
    supabase.auth.getUser(),
    fetchHobbyBoard(supabase, {
      categoryId: selectedCategoryId,
      hobbyTagId: selectedHobbyId,
      query,
      scope,
      page: requestedPage,
    }),
  ]);
  const redirectTo = boardLocationDrift({
    pageRaw: firstParam(params?.page),
    qRaw: firstParam(params?.q),
    scopeRaw: firstParam(params?.scope),
    page: board.page,
    q: query,
    scope,
  })
    ? boardListHref({
        categoryId: selectedCategoryId,
        hobbyId: selectedHobbyId,
        q: query,
        scope,
        page: board.page,
      })
    : "";

  return {
    categories,
    hobbies,
    posts: board.posts,
    total: board.total,
    page: board.page,
    query,
    scope,
    selectedCategoryId,
    selectedHobbyId,
    user: authData.user,
    error: board.error,
    redirectTo,
  };
}
