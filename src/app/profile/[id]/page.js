import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import { isProfileId } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;

  if (!isSupabaseConfigured() || !isProfileId(id)) {
    return { title: "프로필" };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();

  return {
    title: data?.display_name?.trim() || "프로필",
  };
}

export default async function PublicProfilePage({ params }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
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
      <PageFrame>
        <EmptyState
          kicker="없는 자리"
          title="이 자리는 비어 있습니다"
          body="찾는 프로필이 없습니다. 주소를 다시 살펴 주세요."
        />
      </PageFrame>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return (
      <PageFrame>
        <EmptyState
          kicker="없는 자리"
          title="이 자리는 비어 있습니다"
          body="찾는 프로필이 없습니다. 아직 닉네임을 남기지 않았거나, 주소가 다를 수 있습니다."
        />
      </PageFrame>
    );
  }

  const name = profile.display_name?.trim() || "이름 없는 자리";
  const bio = profile.bio?.trim();
  const photo = profile.avatar_url?.trim();
  const isOwn = user?.id === profile.id;

  return (
    <PageFrame>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
          <p className="kicker rise-in">공개 자리</p>
          <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
            프로필
          </h1>
          <p className="rise-in rise-in-2 mt-8 max-w-md text-lg leading-9 text-ink-soft">
            남이 남긴 닉네임과 한 줄, 사진만 보입니다. 고치는 일은 본인만 할 수
            있습니다.
          </p>
        </div>

        <section className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-12 md:px-12 md:py-16">
          <div className="flex items-center gap-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- 소셜·스토리지 아바타는 호스트가 다양해 img로 둡니다.
              <img
                src={photo}
                alt=""
                className="h-16 w-16 rounded-full border border-line object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-line bg-sage-mist font-serif text-2xl text-sage-deep"
                aria-hidden="true"
              >
                {name.slice(0, 1)}
              </span>
            )}
            <p className="kicker">이 사람의 자리</p>
          </div>

          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">{name}</h2>
          <p className="mt-6 whitespace-pre-wrap text-lg leading-9 text-ink-soft">
            {bio || "아직 한 줄이 없습니다."}
          </p>

          {isOwn ? (
            <Link href="/profile" className="btn-quiet mt-10">
              내 프로필 고치기
            </Link>
          ) : (
            <p className="mt-10 font-serif text-sm tracking-[0.22em] text-sage-deep">
              읽기만 할 수 있습니다
            </p>
          )}
        </section>
      </div>
    </PageFrame>
  );
}

function EmptyState({ kicker, title, body }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <div>
        <p className="kicker rise-in">{kicker}</p>
        <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
          프로필
        </h1>
      </div>
      <section className="paper-sheet rise-in rise-in-2 rounded-[2.2rem] px-8 py-12 text-center md:px-12 md:py-16">
        <h2 className="display text-4xl text-ink md:text-5xl">{title}</h2>
        <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">{body}</p>
        <Link href="/" className="btn-ghost mt-10">
          홈으로
        </Link>
      </section>
    </div>
  );
}
