import { isAdminUser } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function readAdminGate() {
  if (!isSupabaseConfigured()) {
    return { state: "offline", supabase: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { state: "denied", supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminUser(profile)) {
    return { state: "denied", supabase };
  }

  return { state: "ok", supabase, profile };
}

export async function adminMetadata(title) {
  const gate = await readAdminGate();
  if (gate.state === "ok" || gate.state === "offline") {
    return { title };
  }
  return { title: "자리" };
}
