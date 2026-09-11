import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import PageFrame from "@/components/PageFrame";

export const metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <PageFrame>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
          <p className="kicker rise-in">들어오기</p>
          <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
            로그인
          </h1>
          <p className="rise-in rise-in-2 mt-8 max-w-md text-lg leading-9 text-ink-soft">
            취향을 모아 두고, 일기를 혼자 보기 위한 작은 문입니다. 지금은 Google
            로 이어지고, 카카오는 천천히 열 예정입니다.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="paper-sheet min-h-[22rem] rounded-[2.2rem]" aria-hidden="true" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </PageFrame>
  );
}
