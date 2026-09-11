import BrandMark from "@/components/BrandMark";
import PageFrame from "@/components/PageFrame";

export const metadata = {
  title: "친구",
};

export default function FriendsPage() {
  return (
    <PageFrame>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
          <p className="kicker rise-in">준비 중</p>
          <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-7xl">
            친구
          </h1>
          <p className="rise-in rise-in-2 mt-8 max-w-md text-lg leading-9 text-ink-soft">
            가까운 이와 일기를 나누는 자리는 아직 비어 있습니다. 인증과 저장소가
            생긴 뒤에, 내가 고른 친구에게만 글을 열 수 있게 할 예정입니다.
          </p>
        </div>

        <section className="paper-sheet rise-in rise-in-3 rounded-[2.2rem] px-8 py-12 text-center md:px-12 md:py-16">
          <div className="mx-auto flex justify-center">
            <BrandMark />
          </div>
          <h2 className="display mt-8 text-4xl text-ink md:text-5xl">가까운 친구</h2>
          <p className="mx-auto mt-6 max-w-md text-lg leading-9 text-ink-soft">
            지금은 나만 보는 일기만 있습니다. 나중에 초대하고, 받은 초대를
            받아들이는 흐름이 이곳에 놓입니다.
          </p>
          <p className="mt-10 font-serif text-sm tracking-[0.22em] text-sage-deep">
            일기 공유는 곧 이어집니다
          </p>
        </section>
      </div>
    </PageFrame>
  );
}
