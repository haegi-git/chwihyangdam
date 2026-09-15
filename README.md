# 취향담 (Chwihyangdam)

조용한 취향을 위한 작은 자리입니다. 마이너·마니아 취미를 둘러보고, 기본적으로 비공개인 일기를 남길 수 있습니다. 가까운 친구와 나누는 기능은 나중에 이어집니다.

## 기술

- Next.js App Router (JavaScript만 사용, TypeScript 없음)
- Tailwind CSS
- Supabase Auth (Google·Kakao OAuth, PKCE)

취미 태그와 글은 Supabase의 `hobby_tags`·`hobby_posts`에서 읽습니다. 작성자 이름은 `profiles`와 이어집니다. 일기는 아직 브라우저 목 데이터입니다.

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 프로젝트 URL과 anon 키를 넣은 뒤, 브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon(publishable) 키 |
| `XAI_API_KEY` | (선택) xAI 키. 있으면 운영함 초안 의견에 사용 |
| `OPENAI_API_KEY` | (선택) OpenAI 키. xAI 키가 없을 때만 사용 |
| `XAI_MODEL` | (선택) 기본 `grok-4` |
| `OPENAI_MODEL` | (선택) 기본 `gpt-4o-mini` |

비밀 키·service role 키는 넣지 않습니다. `.env.local`은 Git에 올리지 마세요.

운영함의 AI 초안은 `XAI_API_KEY`가 있으면 xAI(`https://api.x.ai/v1`, OpenAI 호환)를 쓰고, 없으면 `OPENAI_API_KEY`를 씁니다. 둘 다 없으면 살펴보기 페이지에서 수동 결정만 할 수 있습니다. 키가 있어도 사람을 자동으로 막거나 정지하지 않습니다.

## 인증 (Supabase)

Google·카카오 로그인은 앱의 `/login`에서 같은 OAuth 흐름을 씁니다. 버튼을 누르면 제공자 → Supabase → `/auth/callback` 순으로 돌아온 뒤 세션이 헤더에 보입니다.

Authentication → Providers 에서 각 제공자를 켜고 비밀 값을 넣어야 합니다. 제공자만 켜고 값이 비어 있으면 Supabase가 `missing OAuth secret`을 반환합니다.

### Google

Authentication → Providers → Google 에 Google Cloud의 **Client ID**와 **Client Secret**을 넣습니다.

Google Cloud 쪽 리디렉션은 Supabase가 안내하는 `https://<project-ref>.supabase.co/auth/v1/callback` 을 사용합니다.

### 카카오

[Kakao Developers](https://developers.kakao.com)에서 앱을 만든 뒤 아래를 맞춥니다.

- **REST API 키** → Supabase Kakao 제공자의 Client ID
- **Kakao Login Client Secret** → Client Secret (반드시 활성화)
- **Redirect URI** (카카오 앱): `https://<project-ref>.supabase.co/auth/v1/callback`
- Product Settings → Kakao Login → **사용 설정 ON**
- Consent Items: `profile_nickname`, `profile_image` (이메일이 필요하면 `account_email`, Biz App 필요)
- 이메일을 받지 않으면 Supabase Kakao 설정에서 **Allow users without an email**을 켭니다.

비밀 값은 대시보드에만 두고, 저장소에는 올리지 않습니다.

### 로컬 URL 설정

Supabase 대시보드 → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs** (허용 목록)에 다음을 넣습니다.
  - `http://localhost:3000/auth/callback`
  - 배포 주소가 생기면 `https://your-domain/auth/callback` 도 함께 등록합니다.

앱의 `/auth/callback`은 PKCE 코드를 세션으로 바꾸는 자리입니다.

세션 갱신은 Next.js 16의 `src/proxy.js`에서 처리합니다. (예전의 middleware 역할입니다.)

## 페이지

| 경로 | 설명 |
| --- | --- |
| `/` | 소개 |
| `/hobbies` | 취미 태그 목록 (`hobby_tags`) |
| `/hobbies/[slug]` | 태그 소개와 최근 글 |
| `/hobbies/[slug]/new` | 글 쓰기 (로그인 필요, 손님은 `/login`으로) |
| `/hobbies/post/[id]` | 글 상세와 댓글. 작성자 이름은 `/profile/[id]`로 이어짐 |
| `/hobbies/post/[id]/edit` | 본인 글 고치기 |
| `/diary` | 일기 목록과 새 일기 작성 (브라우저에서만 동작) |
| `/friends` | 가까운 친구 / 일기 공유 자리 (준비 중) |
| `/login` | Google·카카오 로그인 |
| `/profile` | 내 프로필 (닉네임·소개·사진 수정, `public.profiles`) |
| `/profile/[id]` | 다른 사람의 닉네임·소개·사진과 남긴 취미 글 (읽기 전용) |
| `/admin/reports` | 운영함. `profiles.is_admin`인 분만. `/admin/moderation`도 같은 자리 |
| `/auth/callback` | OAuth 코드 교환 후 원래 자리로 이동 |

## 프로필

로그인한 사용자는 `/profile`에서 닉네임(`display_name`)과 한 줄 소개(`bio`)를 고칠 수 있습니다. 저장은 브라우저의 anon 키로 `profiles` 행을 본인 `id`에 맞춰 갱신합니다. 가입 시 트리거가 프로필 행을 만들고, 헤더의 이름(닉네임 또는 이메일)은 `/profile`로 이어집니다. 프로필 사진은 공개 버킷 `avatars`에 `{user.id}/` 아래로 올린 뒤 공개 URL을 `profiles.avatar_url`에 저장하며, 없으면 Google·카카오 메타데이터를 보여 줍니다.

비밀 키·service role 키는 쓰지 않습니다.

## 취미 글

`hobby_tags`는 누구나 읽을 수 있습니다. `hobby_posts`도 읽기는 열려 있고, 쓰기는 로그인한 본인(`author_id = auth.uid()`)만 가능합니다. 목록에서는 `profiles`의 `display_name`과 `avatar_url`을 붙여 작성자를 보여 줍니다. 손님은 읽고, 글 남기기는 `/login`을 거친 뒤에만 열립니다.

글 아래 댓글은 `hobby_comments`에 쌓입니다. 맨 위 댓글 아래에만 한 겹의 답글을 달 수 있고, 답글의 답글은 없습니다. 읽기는 열려 있고, 남기거나 고치거나 거두는 일은 로그인한 본인만 할 수 있습니다. 본문은 1–1000자의 평범한 글만 담습니다. 손님은 댓글과 답글을 읽고, 남기기는 `/login`을 거친 뒤에만 열립니다. 글 카드의 댓글 수는 답글을 포함한 전체 행입니다. 부모 댓글을 거두면 아래 답글도 함께 사라집니다. 스키마는 `supabase/migrations/20260914032224_hobby_comments.sql`과 `supabase/migrations/20260914073400_hobby_comment_replies.sql`에 맞춰 두었습니다. 연결된 chwihyangdam 프로젝트에는 이미 적용되어 있고, 다른 환경은 SQL Editor에서 같은 파일을 실행하면 됩니다.

글에 붙인 사진은 공개 버킷 `post-images`에 `{user.id}/` 아래로 올린 뒤, 문단과 같은 순서로 `hobby_posts.content`(jsonb)에 담습니다.

```json
{
  "version": 1,
  "blocks": [
    { "type": "paragraph", "text": "첫 문단" },
    { "type": "image", "url": "https://…/post-images/{user_id}/….jpg" },
    { "type": "paragraph", "text": "사진 아래 문단" }
  ]
}
```

`body`에는 문단만 이어 붙여 목록 미리보기에 쓰고, `image_urls`에는 같은 순서의 사진 URL을 넣어 카드 썸네일과 스토리지 정리에 씁니다. 한 글에 여덟 장까지, jpeg·png·webp·gif, 장당 5MB입니다. `content`가 비어 있거나 형식이 다른 예전 글은 `body` 다음에 `image_urls`를 이어 보여 줍니다.

스키마 변경은 `supabase/migrations/20260914000000_hobby_posts_content.sql`을 Supabase SQL Editor에서 실행하면 됩니다.

## 살펴보기 (신고·가림)

취향담은 싸우지 않는 취미 자리입니다. 로그인한 사람은 남의 글·댓글에 **신고**를 남길 수 있습니다. 내 글은 신고할 수 없고, 하루에 열 번 정도만 부탁할 수 있습니다. 같은 대상은 한 번만 담깁니다.

다섯 명이 같은 글(또는 댓글)을 살펴 달라고 하면 그 내용은 `hidden_at`으로 잠시 가려지고, `/admin/reports` 운영함에 올라옵니다. 작성자와 운영하는 분만 가려진 글을 보며, 위에 「커뮤니티 안내에 따라 잠시 가려졌어요」가 붙습니다. 다른 사람에게는 RLS로 보이지 않습니다.

운영하는 분은 문제없음(다시 보이기), 가리기 유지, 삭제만 고릅니다. 사람을 하루 정지하거나 막지는 않습니다. AI는 초안 의견만 적습니다.

스키마는 `supabase/migrations/20260915040736_moderation_reports_auto_hide.sql`과 `supabase/migrations/20260915043000_moderation_operator_actions.sql`에 맞춰 두었습니다. 연결된 chwihyangdam 프로젝트에는 이미 적용되어 있고, 다른 환경은 SQL Editor에서 같은 파일을 순서대로 실행하면 됩니다.

### 로컬에서 살펴보기

1. `.env.local`에 Supabase URL·anon 키를 넣습니다.
2. (선택) AI 초안을 받으려면 같은 파일에 `XAI_API_KEY` 또는 `OPENAI_API_KEY`를 넣습니다. xAI 키가 있으면 그쪽을 먼저 씁니다.
3. `npm run dev` 후 로그인합니다.
4. 운영함은 `profiles.is_admin = true`인 계정만 열립니다. 로컬/SQL Editor에서 본인 프로필을 켜 주세요.

```sql
update public.profiles
set is_admin = true
where id = auth.uid(); -- 또는 본인 프로필 UUID
```

연결된 프로젝트의 운영 계정(닉네임 대머리, `db87bca6-6c17-4fb2-b499-533a09a3a0be`)은 이미 켜져 있습니다.

5. 다른 계정으로 남의 글·댓글에서 「신고」를 고르고 이유를 보냅니다. 같은 글을 다시 보내면 이미 살펴 달라는 안내가 뜹니다.
6. 서로 다른 다섯 명이 같은 대상을 신고하면 글이 가려지고 `/admin/reports`에 올라옵니다. 운영 계정으로 문제없음 / 가리기 유지 / 삭제를 고릅니다.
7. AI 키가 있으면 다섯 번째 신고 뒤 또는 운영함의 「AI 의견 받기」로 초안이 채워집니다. 키가 없으면 「AI 키를 .env.local에 넣으면 초안 의견을 받을 수 있어요」만 보이고, 수동 결정은 그대로 됩니다.
8. 운영이 아닌 계정으로 `/admin/reports`를 열면 빈 자리만 보입니다.

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm start` — 빌드 후 실행
