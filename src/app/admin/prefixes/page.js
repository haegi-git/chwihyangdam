import Link from "next/link";
import AdminSectionNav from "@/components/AdminSectionNav";
import PrefixManager from "@/components/PrefixManager";
import PageFrame from "@/components/PageFrame";
import { fetchBoardPrefixes } from "@/lib/hobbies";
import { isAdminUser } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  if (!isSupabaseConfigured()) {
    return { title: "말머리" };
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

  return { title: isAdminUser(profile) ? "말머리" : "자리" };
}

export default async function AdminPrefixesPage() {
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

  const prefixes = await fetchBoardPrefixes(supabase);

  return (
    <PageFrame>
      <p className="kicker rise-in">운영</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">말머리</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">
        취미 게시판 앞에 붙는 짧은 이름입니다. 끄면 글 쓰기와 칩에서 사라지고, 이미 붙은 글의
        기록은 남습니다.
      </p>
      <AdminSectionNav current="/admin/prefixes" />
      <PrefixManager
        key={prefixes
          .map((prefix) => `${prefix.id}:${prefix.name}:${prefix.sort_order}:${prefix.is_active}`)
          .join("|")}
        prefixes={prefixes}
      />
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
