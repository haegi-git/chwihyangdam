import Link from "next/link";
import { boardListHref, pageWindow } from "@/lib/board";

export default function BoardPager({
  page,
  totalPages,
  categoryId = "",
  hobbyId = "",
  q = "",
  scope = "all",
}) {
  if (totalPages <= 1) {
    return null;
  }

  const hrefFor = (nextPage) =>
    boardListHref({ categoryId, hobbyId, q, scope, page: nextPage });
  const items = pageWindow(page, totalPages, 5);

  return (
    <nav className="board-pager" aria-label="페이지">
      <Step href={page > 1 ? hrefFor(page - 1) : ""} label="이전" direction="prev" />
      <ol className="board-pager-pages">
        {items.map((item, index) =>
          item === "…" ? (
            <li key={`ellipsis-${index}`} className="board-pager-ellipsis" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span className="board-pager-current" aria-current="page">
                  {item}
                </span>
              ) : (
                <Link href={hrefFor(item)} className="board-pager-link cursor-pointer">
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      <Step href={page < totalPages ? hrefFor(page + 1) : ""} label="다음" direction="next" />
    </nav>
  );
}

function Step({ href, label, direction }) {
  const content = (
    <>
      {direction === "prev" ? <span aria-hidden="true">‹</span> : null}
      <span className="board-pager-word">{label}</span>
      {direction === "next" ? <span aria-hidden="true">›</span> : null}
    </>
  );

  if (!href) {
    return (
      <span className="board-pager-link is-disabled cursor-not-allowed" aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className="board-pager-link cursor-pointer" aria-label={direction === "prev" ? "이전 페이지" : "다음 페이지"}>
      {content}
    </Link>
  );
}
