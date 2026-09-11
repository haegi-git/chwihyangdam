import BrandMark from "@/components/BrandMark";

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto px-4 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 rounded-[2rem] border border-line/70 bg-card/70 px-6 py-8 text-sm leading-7 text-ink-soft md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-3 text-ink">
          <BrandMark />
          <p className="font-serif text-lg">취향담</p>
        </div>
        <p>조용한 취향을 위한 작은 자리. 일기는 기본적으로 비공개입니다.</p>
      </div>
    </footer>
  );
}
