import Link from "next/link";
import FriendDiaryBoard from "@/components/FriendDiaryBoard";
import PageFrame from "@/components/PageFrame";
import { isProfileId } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;

  if (!isSupabaseConfigured() || !isProfileId(id)) {
    return { title: "나눈 일기" };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  const name = data?.display_name?.trim();
  return { title: name ? `${name}의 일기` : "나눈 일기" };
}

export default async function FriendDiaryPage({ params }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame narrow>
        <EmptyState
          kicker="연결 전"
          title="아직 열리지 않았습니다"
          body="로컬에서는 .env.local에 Supabase 주소를 적어 주세요."
        />
      </PageFrame>
    );
  }

  if (!isProfileId(id)) {
    return (
      <PageFrame narrow>
        <EmptyState
          kicker="없는 자리"
          title="이 자리는 비어 있습니다"
          body="찾는 친구가 없습니다. 주소를 다시 살펴 주세요."
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return (
      <PageFrame narrow>
        <EmptyState
          kicker="없는 자리"
          title="이 자리는 비어 있습니다"
          body="찾는 프로필이 없습니다. 아직 닉네임을 남기지 않았거나, 주소가 다를 수 있습니다."
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame narrow>
      <FriendDiaryBoard authorId={profile.id} author={profile} />
    </PageFrame>
  );
}

function EmptyState({ kicker, title, body }) {
  return (
    <div>
      <p className="kicker rise-in">{kicker}</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">나눈 일기</h1>
      <section className="paper-sheet rise-in rise-in-2 mt-10 rounded-[1.85rem] px-8 py-12 text-center md:px-12 md:py-16">
        <h2 className="display text-4xl text-ink md:text-5xl">{title}</h2>
        <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">{body}</p>
        <Link href="/friends" className="btn-ghost mt-10">
          친구 자리
        </Link>
      </section>
    </div>
  );
}
