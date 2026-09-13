# 취향담 (Chwihyangdam)

조용한 취향을 위한 작은 자리입니다. 마이너·마니아 취미를 둘러보고, 기본적으로 비공개인 일기를 남길 수 있습니다. 가까운 친구와 나누는 기능은 나중에 이어집니다.

## 기술

- Next.js App Router (JavaScript만 사용, TypeScript 없음)
- Tailwind CSS
- Supabase Auth (Google·Kakao OAuth, PKCE)

취미·일기 화면은 아직 목 데이터입니다. 인증과 프로필만 Supabase와 연결되어 있습니다.

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

비밀 키·service role 키는 넣지 않습니다. `.env.local`은 Git에 올리지 마세요.

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
| `/hobbies` | 취미 카드 (정적 목 데이터) |
| `/diary` | 일기 목록과 새 일기 작성 (브라우저에서만 동작) |
| `/friends` | 가까운 친구 / 일기 공유 자리 (준비 중) |
| `/login` | Google·카카오 로그인 |
| `/profile` | 내 프로필 (닉네임·소개 수정, `public.profiles`) |
| `/profile/[id]` | 다른 사람의 닉네임·소개 (읽기 전용) |
| `/auth/callback` | OAuth 코드 교환 후 홈으로 이동 |

## 프로필

로그인한 사용자는 `/profile`에서 닉네임(`display_name`)과 한 줄 소개(`bio`)를 고칠 수 있습니다. 저장은 브라우저의 anon 키로 `profiles` 행을 본인 `id`에 맞춰 갱신합니다. 가입 시 트리거가 프로필 행을 만들고, 헤더의 이름(닉네임 또는 이메일)은 `/profile`로 이어집니다. 아바타는 Google·카카오 메타데이터를 그대로 보여 줍니다.

비밀 키·service role 키는 쓰지 않습니다.

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm start` — 빌드 후 실행
