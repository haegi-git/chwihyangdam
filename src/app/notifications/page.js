import Link from "next/link";
import NotificationsList from "@/components/NotificationsList";
import PageFrame from "@/components/PageFrame";
import { fetchNotifications } from "@/lib/notifications";
import { loginHref } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame narrow>
        <Header />
        <Empty
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
      <PageFrame narrow>
        <Header />
        <Empty
          title="들어와 주세요"
          body="소식은 로그인한 뒤에만 보입니다."
          href={loginHref("/notifications")}
          action="로그인"
        />
      </PageFrame>
    );
  }

  const items = await fetchNotifications(supabase);

  return (
    <PageFrame narrow>
      <Header />
      <NotificationsList items={items} />
    </PageFrame>
  );
}

function Header() {
  return (
    <div>
      <p className="kicker rise-in">소식</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">알림</h1>
      <p className="rise-in rise-in-2 mt-6 leading-8 text-ink-soft">
        친구와 댓글만 알려 드립니다. 글의 내용은 여기에 적지 않습니다.
      </p>
    </div>
  );
}

function Empty({ title, body, href = "/", action = "홈으로" }) {
  return (
    <section className="paper-sheet rise-in rise-in-2 mt-12 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h2 className="display text-3xl text-ink">{title}</h2>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href={href} className="btn-ghost mt-8">
        {action}
      </Link>
    </section>
  );
}
