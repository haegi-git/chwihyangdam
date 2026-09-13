"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSafeNext } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function callbackUrl(next) {
  const url = new URL("/auth/callback", window.location.origin);

  if (next && next !== "/") {
    url.searchParams.set("next", next);
  }

  return url.toString();
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(() => (isSupabaseConfigured() ? undefined : null));
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const errorCode = searchParams.get("error");
  const nextPath = getSafeNext(searchParams.get("next"));
  const configured = isSupabaseConfigured();
  const writing = nextPath.includes("/hobbies/") && (nextPath.endsWith("/new") || nextPath.endsWith("/edit"));

  const errorHint = useMemo(() => {
    if (errorCode === "callback") {
      return "로그인 연결이 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.";
    }
    return "";
  }, [errorCode]);

  useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);

      if (nextUser && nextPath !== "/") {
        router.replace(nextPath);
      }
    });

    return undefined;
  }, [configured, nextPath, router]);

  async function signInWithProvider(provider, failMessage) {
    if (!configured) {
      setMessage("Supabase 환경 변수가 없어 지금은 로그인할 수 없습니다.");
      return;
    }

    setPending(provider);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(nextPath),
      },
    });

    if (error) {
      setPending("");
      setMessage(failMessage);
    }
  }

  function signInWithGoogle() {
    return signInWithProvider(
      "google",
      "Google 로그인을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    );
  }

  function signInWithKakao() {
    return signInWithProvider(
      "kakao",
      "카카오 로그인을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    );
  }

  if (user) {
    return (
      <section className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-12 text-center md:px-12 md:py-16">
        <p className="kicker justify-center">이미 들어와 있습니다</p>
        <h2 className="display mt-8 text-4xl text-ink md:text-5xl">
          {user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.nickname ||
            user.email ||
            "손님"}
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
          취향담은 이미 열려 있습니다. 천천히 이어서 보시면 됩니다.
        </p>
        <Link href={nextPath} className="btn-quiet mt-10">
          {nextPath === "/" ? "홈으로" : "이어서 가기"}
        </Link>
      </section>
    );
  }

  return (
    <section className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-12 md:px-12 md:py-16">
      <p className="kicker">소셜 로그인</p>
      <h2 className="display mt-6 text-3xl text-ink md:text-4xl">
        조용히 들어와 주세요
      </h2>
      <p className="mt-5 max-w-md leading-8 text-ink-soft">
        {writing
          ? "글을 남기려면 먼저 들어와 주세요. Google 또는 카카오 계정으로 조용히 이어집니다."
          : "Google 또는 카카오 계정으로 조용히 이어집니다."}
      </p>

      <div className="mt-10 flex flex-col gap-3">
        <button
          type="button"
          className="btn-quiet w-full gap-3"
          onClick={signInWithGoogle}
          disabled={Boolean(pending) || !configured}
        >
          <GoogleMark />
          {pending === "google" ? "연결하는 중…" : "Google로 계속"}
        </button>

        <button
          type="button"
          className="btn-oauth-kakao w-full"
          onClick={signInWithKakao}
          disabled={Boolean(pending) || !configured}
        >
          <KakaoMark />
          {pending === "kakao" ? "연결하는 중…" : "카카오로 계속"}
        </button>
      </div>

      {errorHint ? (
        <p className="mt-6 text-sm leading-7 text-ink-soft" role="status">
          {errorHint}
        </p>
      ) : null}
      {message ? (
        <p className="mt-6 text-sm leading-7 text-ink-soft" role="status">
          {message}
        </p>
      ) : null}
      {!configured ? (
        <p className="mt-6 text-sm leading-7 text-ink-soft" role="status">
          로컬에서는 <code className="font-serif">.env.local</code>에 Supabase
          주소를 적어 주세요.
        </p>
      ) : null}
    </section>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.42Z"
        fill="#f7f1e6"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.62-2.35l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
        fill="#f7f1e6"
      />
      <path
        d="M6.4 13.99A6 6 0 0 1 6.08 12c0-.69.12-1.36.32-1.99V7.43H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.57l3.34-2.58Z"
        fill="#f7f1e6"
      />
      <path
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.43l3.34 2.58C7.19 7.72 9.4 5.96 12 5.96Z"
        fill="#f7f1e6"
      />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 4.2c-4.6 0-8.3 2.9-8.3 6.5 0 2.3 1.6 4.4 4 5.5l-.9 3.3c-.1.3.2.6.5.4l3.9-2.6c.3 0 .5.1.8.1 4.6 0 8.3-2.9 8.3-6.5S16.6 4.2 12 4.2Z" />
    </svg>
  );
}
