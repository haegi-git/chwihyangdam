export const metadata = {
  title: "친구",
};

export default function FriendsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
      <p className="text-sm text-sage">준비 중</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
        친구
      </h1>
      <p className="mt-4 leading-7 text-ink-soft">
        가까운 이와 일기를 나누는 자리는 아직 비어 있습니다. 인증과 저장소가
        생긴 뒤에, 내가 고른 친구에게만 글을 열 수 있게 할 예정입니다.
      </p>

      <section className="mt-10 rounded-3xl border border-dashed border-line bg-card p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-mist"
        >
          <span className="h-3 w-3 rounded-full bg-leaf" />
        </div>
        <h2 className="mt-5 font-serif text-2xl text-ink">가까운 친구</h2>
        <p className="mx-auto mt-3 max-w-md leading-7 text-ink-soft">
          지금은 나만 보는 일기만 있습니다. 나중에 초대하고, 받은 초대를
          받아들이는 흐름이 이곳에 놓입니다.
        </p>
        <p className="mt-6 text-sm text-sage-deep">일기 공유는 곧 이어집니다.</p>
      </section>
    </div>
  );
}
