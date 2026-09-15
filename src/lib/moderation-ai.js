const SYSTEM_PROMPT = `당신은 취향담(Chwihyangdam)의 운영자를 돕는 초안 의견만 적습니다.
취향담은 마이너·마니아 취미를 조용히 나누는 작은 자리입니다. 싸움보다 평온을, 훈계보다 안내를 택합니다.

표시해야 할 것:
- 혐오, 욕설, 인신공격
- 근거 없는 깎아내리기·모욕
- 싸움을 부추기는 말(갈등 미끼)
- 스팸, 광고, 반복 도배

처벌하지 말 것:
- 가벼운 의견 차이, 취향 다툼
- 취미 은어·전문 용어, 직설적이지만 모욕이 아닌 말
- 운영자 대신 사람을 정지하거나 차단하는 결정

이것은 초안입니다. 사람을 자동으로 처벌하지 않습니다. 최종 결정은 사람 운영자에게 있습니다.
계정 정지·1일 금지·영구 차단을 제안하지 마세요. 제안 가능한 조치는 cleared(문제없음·다시 보이기), keep_hidden(가리기 유지), removed(해당 글/댓글만 삭제) 뿐입니다.

반드시 JSON 객체만 반환하세요:
{
  "label": "ok" | "hate_abuse" | "baseless_attack" | "conflict_bait" | "spam" | "unclear",
  "summary": "한국어 2~4문장의 차분한 초안 의견",
  "suggested_action": "cleared" | "keep_hidden" | "removed",
  "confidence": "low" | "medium" | "high",
  "advisory": true
}`;

const ALLOWED_LABELS = new Set([
  "ok",
  "hate_abuse",
  "baseless_attack",
  "conflict_bait",
  "spam",
  "unclear",
]);

const ALLOWED_ACTIONS = new Set(["cleared", "keep_hidden", "removed"]);
const ALLOWED_CONFIDENCE = new Set(["low", "medium", "high"]);

export function getAiProvider() {
  const xai = process.env.XAI_API_KEY?.trim();

  if (xai) {
    return {
      name: "xai",
      apiKey: xai,
      baseUrl: "https://api.x.ai/v1",
      model: process.env.XAI_MODEL?.trim() || "grok-4",
    };
  }

  const openai = process.env.OPENAI_API_KEY?.trim();

  if (openai) {
    return {
      name: "openai",
      apiKey: openai,
      baseUrl: "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  return null;
}

export function isAiConfigured() {
  return Boolean(getAiProvider());
}

function buildUserPrompt(context) {
  const reports = Array.isArray(context?.reports) ? context.reports : [];
  const reasonLines = reports.length
    ? reports
        .map((report, index) => {
          const detail = report?.detail ? ` / ${String(report.detail).slice(0, 500)}` : "";
          return `${index + 1}. ${report?.reason || "other"}${detail}`;
        })
        .join("\n")
    : "(신고 사유 없음)";

  const title = context?.title ? String(context.title) : "(댓글)";
  const body = String(context?.body ?? "").slice(0, 4000);

  return `대상: ${context?.target_type === "comment" ? "댓글" : "글"}
신고 수: ${context?.distinct_report_count ?? reports.length}

제목:
${title}

본문:
${body}

신고 사유:
${reasonLines}

위 내용을 취향담 기준으로 살펴 초안 JSON을 적어 주세요. 사람을 처벌하지 마세요.`;
}

function parseJsonContent(text) {
  const raw = String(text ?? "").trim();

  if (!raw) {
    return null;
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeDraft(parsed, rawText, provider) {
  const label = ALLOWED_LABELS.has(parsed?.label) ? parsed.label : "unclear";
  const suggested = ALLOWED_ACTIONS.has(parsed?.suggested_action)
    ? parsed.suggested_action
    : "keep_hidden";
  const confidence = ALLOWED_CONFIDENCE.has(parsed?.confidence) ? parsed.confidence : "low";
  const summary =
    typeof parsed?.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 1200)
      : "초안을 다듬지 못했습니다. 사람이 한 번 더 살펴 주세요.";

  return {
    label,
    summary,
    suggested_action: suggested,
    raw: {
      provider: provider.name,
      model: provider.model,
      parsed: parsed && typeof parsed === "object" ? parsed : { text: rawText },
      confidence,
      advisory: true,
    },
  };
}

export async function draftModerationOpinion(context) {
  const provider = getAiProvider();

  if (!provider) {
    return { missingKey: true, draft: null };
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(context) },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || `AI 요청이 거절되었습니다 (${response.status}).`;
    throw new Error(message);
  }

  const text = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonContent(text);
  return {
    missingKey: false,
    draft: normalizeDraft(parsed, text, provider),
  };
}
