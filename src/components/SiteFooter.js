import BrandMark from "@/components/BrandMark";

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto px-4 pb-24 pt-8 md:pb-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 border-t border-line/80 px-2 py-8 text-sm leading-7 text-ink-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-ink">
          <BrandMark />
          <p className="font-hand text-2xl leading-none">취향담</p>
        </div>
        <p>조용한 취향을 위한 작은 자리. 일기는 기본적으로 비공개입니다.</p>
      </div>
    </footer>
  );
}
