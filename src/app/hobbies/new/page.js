import { redirect } from "next/navigation";
import Link from "next/link";
import HobbyPostForm from "@/components/HobbyPostForm";
import PageFrame from "@/components/PageFrame";
import { fetchActivePrefixes } from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "글 남기기",
};

export default async function NewHobbyPostPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame narrow>
        <EmptyState
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
    redirect(loginHref("/hobbies/new"));
  }

  const prefixes = await fetchActivePrefixes(supabase);

  return (
    <PageFrame narrow>
      <Link href="/hobbies" className="text-sm text-sage-deep underline-offset-8 hover:underline">
        취미
      </Link>
      <div className="mt-8">
        <p className="kicker rise-in">기록</p>
        <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">글 남기기</h1>
        <p className="rise-in rise-in-2 mt-6 leading-8 text-ink-soft">
          취미 게시판에 짧은 기록을 남겨 둡니다. 누구나 읽을 수 있습니다.
        </p>
      </div>
      <div className="mt-10">
        <HobbyPostForm mode="create" prefixes={prefixes} cancelHref="/hobbies" />
      </div>
    </PageFrame>
  );
}

function EmptyState({ title, body }) {
  return (
    <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h1 className="display text-3xl text-ink md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href="/hobbies" className="btn-ghost mt-8">
        돌아가기
      </Link>
    </section>
  );
}
