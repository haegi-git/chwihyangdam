import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDenied from "@/components/AdminDenied";
import AdminReportsList from "@/components/AdminReportsList";
import AdminShell from "@/components/AdminShell";
import AdminUsers from "@/components/AdminUsers";
import BoardLabelManager from "@/components/BoardLabelManager";
import PageFrame from "@/components/PageFrame";
import { adminHref, adminTabFrom, fetchAdminDashboard, fetchAdminUsers } from "@/lib/admin";
import { adminMetadata, readAdminGate } from "@/lib/admin-gate";
import { fetchBoardCategories, fetchHobbyTags } from "@/lib/hobbies";
import {
  REPORT_SORT_FILTERS,
  REPORT_STATUS_FILTERS,
  REPORT_TYPE_FILTERS,
  fetchReportInbox,
  reportFiltersFrom,
} from "@/lib/moderation";

const SECTIONS = {
  dashboard: {
    title: "대시보드",
    body: "사람, 글, 댓글, 그리고 아직 살펴볼 신고가 몇인지 한 장에 적어둡니다.",
  },
  categories: {
    title: "분류",
    body: "취미 글을 나누는 칸입니다. 끄면 목록 탭과 글쓰기에서 사라지고, 이미 붙은 글은 그 분류를 유지합니다.",
  },
  hobbies: {
    title: "말머리",
    body: "글 앞에 붙는 취미 이름입니다. 끄면 목록 칩과 글쓰기에서 사라지고, 이미 붙은 글은 그 말머리를 유지합니다.",
  },
  reports: {
    title: "신고함",
    body: "게시글, 댓글, 사용자를 살펴 달라는 기록이 이곳에 모입니다. AI는 초안만 적고, 사람을 막지는 않습니다.",
  },
  users: {
    title: "사용자",
    body: "닉네임으로 자리를 찾습니다. 정지는 새 글과 새 댓글만 막습니다.",
  },
};

export async function generateMetadata() {
  return adminMetadata("관리자");
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
  const tab = adminTabFrom(first(params?.tab));
  const gate = await readAdminGate();

  if (gate.state === "offline") {
    return (
      <PageFrame>
        <AdminDenied
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  if (gate.state !== "ok") {
    redirect("/");
  }

  const section = SECTIONS[tab];

  return (
    <PageFrame>
      <p className="kicker rise-in">운영</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">{section.title}</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">{section.body}</p>
      <div className="mt-10">
        <AdminShell tab={tab}>{await renderTab(tab, params, gate.supabase)}</AdminShell>
      </div>
    </PageFrame>
  );
}

async function renderTab(tab, params, supabase) {
  if (tab === "categories") {
    const categories = await fetchBoardCategories(supabase);
    return (
      <BoardLabelManager
        key={labelKey(categories)}
        items={categories}
        table="board_categories"
      />
    );
  }

  if (tab === "hobbies") {
    const hobbies = await fetchHobbyTags(supabase);
    return <BoardLabelManager key={labelKey(hobbies)} items={hobbies} table="hobby_tags" />;
  }

  if (tab === "reports") {
    const filters = reportFiltersFrom({
      type: first(params?.type),
      status: first(params?.status),
      sort: first(params?.sort),
    });
    const items = await fetchReportInbox(supabase, filters);
    const aiConfigured = Boolean(
      process.env.XAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
    );

    return (
      <div>
        <ReportFilters filters={filters} />
        <AdminReportsList items={items} aiConfigured={aiConfigured} />
      </div>
    );
  }

  if (tab === "users") {
    const { query, rows } = await fetchAdminUsers(supabase, first(params?.q));
    return <AdminUsers key={query} query={query} rows={rows} />;
  }

  const counts = await fetchAdminDashboard(supabase);

  return (
    <section className="admin-counts" aria-label="운영 숫자">
      <CountCard label="사용자" value={counts.users} href={adminHref("users")} />
      <CountCard label="게시글" value={counts.posts} />
      <CountCard label="댓글" value={counts.comments} />
      <CountCard label="대기 신고" value={counts.pendingReports} href={adminHref("reports")} />
    </section>
  );
}

function ReportFilters({ filters }) {
  return (
    <div className="mb-8 space-y-4">
      <FilterLine label="종류" items={REPORT_TYPE_FILTERS} current={filters.type} param="type" filters={filters} />
      <FilterLine
        label="상태"
        items={REPORT_STATUS_FILTERS}
        current={filters.status}
        param="status"
        filters={filters}
      />
      <FilterLine label="정렬" items={REPORT_SORT_FILTERS} current={filters.sort} param="sort" filters={filters} />
    </div>
  );
}

function FilterLine({ label, items, current, param, filters }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="shrink-0 text-sm text-ink-soft sm:w-12">{label}</p>
      <div className="chip-scroller">
        {items.map((item) => (
          <Link
            key={item.value}
            href={adminHref("reports", { ...filters, [param]: item.value })}
            className="chip"
            aria-current={item.value === current ? "true" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CountCard({ label, value, href }) {
  const body = (
    <>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="display mt-3 text-4xl text-ink">{value}</p>
    </>
  );

  if (!href) {
    return <article className="paper-sheet rounded-[1.4rem] p-5 md:p-6">{body}</article>;
  }

  return (
    <Link href={href} className="paper-sheet block rounded-[1.4rem] p-5 md:p-6 transition-colors hover:text-sage-deep">
      {body}
    </Link>
  );
}

function labelKey(items) {
  return items
    .map((item) => `${item.id}:${item.name}:${item.sort_order}:${item.is_active}`)
    .join("|");
}

function first(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}
