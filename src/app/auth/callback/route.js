import { NextResponse } from "next/server";
import { callbackRedirectBase, getSafeNext } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const base = callbackRedirectBase({
        origin,
        forwardedHost: request.headers.get("x-forwarded-host"),
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        isLocalEnv: process.env.NODE_ENV === "development",
      });

      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}
