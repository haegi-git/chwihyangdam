import { NextResponse } from "next/server";
import { isPostId } from "@/lib/hobbies";
import { draftModerationOpinion, isAiConfigured } from "@/lib/moderation-ai";
import { isReportTargetType } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const targetType = payload?.targetType;
  const targetId = payload?.targetId;
  const force = Boolean(payload?.force);

  if (!isReportTargetType(targetType) || !isPostId(targetId)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("moderation_ai_context", {
    p_target_type: targetType,
    p_target_id: targetId,
  });

  if (error) {
    console.error("moderation_ai_context", error);
    return NextResponse.json({ ok: false, reason: "context" }, { status: 500 });
  }

  const context = typeof data === "string" ? JSON.parse(data) : data;

  if (!context?.ok) {
    return NextResponse.json({ ok: false, skipped: true, reason: context?.reason || "skipped" });
  }

  if (!force && context.has_ai) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already_reviewed" });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, missingKey: true });
  }

  try {
    const { draft } = await draftModerationOpinion(context);
    const savedResult = await supabase.rpc("save_moderation_ai_draft", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_ai_label: draft.label,
      p_ai_summary: draft.summary,
      p_ai_suggested_action: draft.suggested_action,
      p_ai_raw: draft.raw,
    });
    const saved =
      typeof savedResult.data === "string" ? JSON.parse(savedResult.data) : savedResult.data;

    if (savedResult.error || !saved?.ok) {
      console.error("save_moderation_ai_draft", savedResult.error || saved);
      return NextResponse.json({ ok: false, reason: "save" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      draft: {
        label: draft.label,
        summary: draft.summary,
        suggested_action: draft.suggested_action,
      },
    });
  } catch (aiError) {
    console.error("moderation ai", aiError);
    return NextResponse.json({ ok: false, reason: "ai" }, { status: 502 });
  }
}
