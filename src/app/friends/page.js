import FadeIn from "@/components/FadeIn";
import PageShell from "@/components/PageShell";

export const metadata = {
  title: "친구",
};

export default function FriendsPage() {
  return (
    <PageShell narrow>
      <FadeIn>
        <p className="text-sm tracking-[0.16em] text-sage">준비 중</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-ink md:text-4xl">
          친구
        </h1>
        <span
          aria-hidden="true"
          className="mt-6 block h-px w-12 bg-sage/35"
        />
        <p className="mt-6 leading-8 text-ink-soft">
          가까운 이와 일기를 나누는 자리는 아직 비어 있습니다. 인증과 저장소가
          생긴 뒤에, 내가 고른 친구에게만 글을 열 수 있게 할 예정입니다.
        </p>
      </FadeIn>

      <FadeIn delay={140}>
        <section className="surface surface-dashed mt-12 p-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-mist/90"
          >
            <span className="pulse-soft h-2.5 w-2.5 rounded-full bg-leaf" />
          </div>
          <h2 className="mt-6 font-serif text-2xl text-ink">가까운 친구</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            지금은 나만 보는 일기만 있습니다. 나중에 초대하고, 받은 초대를
            받아들이는 흐름이 이곳에 놓입니다.
          </p>
          <p className="mt-7 text-sm tracking-wide text-sage-deep">
            일기 공유는 곧 이어집니다.
          </p>
        </section>
      </FadeIn>
    </PageShell>
  );
}
