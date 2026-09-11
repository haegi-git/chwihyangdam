# 취향담 (Chwihyangdam)

조용한 취향을 위한 작은 자리입니다. 마이너·마니아 취미를 둘러보고, 기본적으로 비공개인 일기를 남길 수 있습니다. 가까운 친구와 나누는 기능은 나중에 이어집니다.

## 기술

- Next.js App Router (JavaScript만 사용, TypeScript 없음)
- Tailwind CSS
- 데이터베이스·인증·ORM 없음 (화면용 목 데이터)

Supabase 연동은 이후 단계에서 추가할 예정입니다.

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 페이지

| 경로 | 설명 |
| --- | --- |
| `/` | 소개 |
| `/hobbies` | 취미 카드 (정적 목 데이터) |
| `/diary` | 일기 목록과 새 일기 작성 (브라우저에서만 동작) |
| `/friends` | 가까운 친구 / 일기 공유 자리 (준비 중) |

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm start` — 빌드 후 실행
