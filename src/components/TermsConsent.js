"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isConsentExempt, needsTermsConsent, TERMS_VERSION } from "@/lib/legal";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function TermsConsentGate() {
  const pathname = usePathname();
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return undefined;
    }

    const supabase = createClient();
    let cancelled = false;

    async function load(user) {
      if (!user) {
        if (!cancelled) {
          setNeeded(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("terms_agreed_at, terms_version")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        setNeeded(false);
        return;
      }

      setNeeded(needsTermsConsent(data));
    }

    supabase.auth.getUser().then(({ data }) => {
      load(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });

    function onAgreed() {
      setNeeded(false);
    }

    window.addEventListener("chwihyangdam:terms", onAgreed);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("chwihyangdam:terms", onAgreed);
    };
  }, []);

  useEffect(() => {
    if (!needed || isConsentExempt(pathname)) {
      document.body.classList.remove("consent-lock");
      return undefined;
    }

    document.body.classList.add("consent-lock");
    return () => {
      document.body.classList.remove("consent-lock");
    };
  }, [needed, pathname]);

  if (!needed || isConsentExempt(pathname)) {
    return null;
  }

  return (
    <div className="consent-overlay" role="presentation">
      <TermsConsentPanel />
    </div>
  );
}

export function TermsConsentPanel() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return undefined;
    }

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user ?? null;
      if (!user || cancelled) {
        return;
      }

      const { data: row, error: readError } = await supabase
        .from("profiles")
        .select("terms_agreed_at, terms_version")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled && !readError && row && !needsTermsConsent(row)) {
        setDone(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function agree() {
    if (!checked) {
      setError("동의를 체크해 주세요.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPending("agree");
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending("");
      setError("로그인한 뒤에 동의할 수 있습니다.");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        terms_agreed_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    setPending("");

    if (updateError || !data) {
      setError("동의를 담지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    window.dispatchEvent(new Event("chwihyangdam:terms"));
    setDone(true);
    router.refresh();
  }

  async function logout() {
    if (!isSupabaseConfigured()) {
      router.push("/");
      return;
    }

    setPending("logout");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.dispatchEvent(new Event("chwihyangdam:terms"));
    router.refresh();
    router.push("/");
  }

  if (done) {
    return (
      <section className="paper-sheet w-full max-w-lg rounded-[1.85rem] px-7 py-10 md:px-10" aria-labelledby="terms-consent-title">
        <p className="kicker">동의</p>
        <h1 id="terms-consent-title" className="display mt-5 text-4xl text-ink">
          이미 동의해 두었습니다
        </h1>
        <p className="mt-4 leading-8 text-ink-soft">이 버전의 약관에 동의한 자리입니다. 이어서 보시면 됩니다.</p>
        <Link href="/" className="btn-quiet mt-8">
          홈으로
        </Link>
      </section>
    );
  }

  return (
    <section
      className="paper-sheet w-full max-w-lg rounded-[1.85rem] px-7 py-10 md:px-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-consent-title"
    >
      <p className="kicker">동의</p>
      <h1 id="terms-consent-title" className="display mt-5 text-4xl text-ink">
        약관을 읽고 들어와 주세요
      </h1>
      <p className="mt-4 leading-8 text-ink-soft">
        취향담은 무료로 연 취미 자리와 일기입니다. 이용약관과 개인정보처리방침에 동의해야 글을 쓰고
        일기를 남길 수 있습니다.
      </p>
      <div className="mt-6 flex items-start gap-3">
        <input
          id="terms-agree"
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          disabled={Boolean(pending)}
        />
        <label htmlFor="terms-agree" className="leading-7 text-ink">
          이용약관 및 개인정보처리방침 동의
        </label>
      </div>
      <p className="mt-3 text-sm leading-7 text-ink-soft">
        <Link href="/terms" className="text-sage-deep underline-offset-4 hover:underline">
          이용약관 읽기
        </Link>
        {" · "}
        <Link href="/privacy" className="text-sage-deep underline-offset-4 hover:underline">
          개인정보처리방침 읽기
        </Link>
      </p>
      {error ? (
        <p className="mt-4 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-2">
        <button type="button" className="btn-quiet" onClick={agree} disabled={Boolean(pending) || !checked}>
          {pending === "agree" ? "담는 중…" : "동의하고 들어가기"}
        </button>
        <button type="button" className="btn-ghost" onClick={logout} disabled={pending === "logout"}>
          {pending === "logout" ? "나가는 중…" : "로그아웃"}
        </button>
      </div>
    </section>
  );
}
