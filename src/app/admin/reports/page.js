import Link from "next/link";
import AdminReportsList from "@/components/AdminReportsList";
import PageFrame from "@/components/PageFrame";
import { fetchPendingModerationInbox } from "@/lib/moderation";
import { isAdminUser } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  if (!isSupabaseConfigured()) {
    return { title: "살펴보기" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: "자리" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { title: isAdminUser(profile) ? "살펴보기" : "자리" };
}

export default async function AdminReportsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Denied
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PageFrame>
        <Denied
          title="이 자리는 비어 있습니다"
          body="찾는 페이지가 없거나, 볼 수 있는 권한이 없습니다."
        />
      </PageFrame>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminUser(profile)) {
    return (
      <PageFrame>
        <Denied
          title="이 자리는 비어 있습니다"
          body="찾는 페이지가 없거나, 볼 수 있는 권한이 없습니다."
        />
      </PageFrame>
    );
  }

  const items = await fetchPendingModerationInbox(supabase);
  const aiConfigured = Boolean(
    process.env.XAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  );

  return (
    <PageFrame>
      <p className="kicker rise-in">운영</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">살펴보기</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        다섯 명이 살펴 달라고 한 글이 이곳에 모입니다. AI는 초안만 적고, 사람을
        막지는 않습니다.
      </p>

      <div className="mt-12">
        <AdminReportsList items={items} aiConfigured={aiConfigured} />
      </div>
    </PageFrame>
  );
}

function Denied({ title, body }) {
  return (
    <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h1 className="display text-3xl text-ink md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href="/" className="btn-ghost mt-8">
        홈으로
      </Link>
    </section>
  );
}
