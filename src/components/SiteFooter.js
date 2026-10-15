import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { CONTACT_MAILTO } from "@/lib/legal";

export default function SiteFooter() {
  return (
    <footer id="site-footer" className="site-footer relative mt-auto px-4 pt-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 border-t border-line/80 px-2 py-8 text-sm leading-7 text-ink-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-ink">
          <BrandMark />
          <p className="font-hand text-2xl leading-none">취향담</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <p>조용한 취향을 위한 작은 자리. 일기는 기본적으로 비공개입니다.</p>
          <nav className="site-legal" aria-label="약관과 문의">
            <Link href="/terms">이용약관</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="font-bold text-ink">
              개인정보처리방침
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/guide">운영 정책</Link>
            <span aria-hidden="true">·</span>
            <a href={CONTACT_MAILTO}>문의</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
