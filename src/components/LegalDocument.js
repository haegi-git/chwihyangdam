import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import { CONTACT_LINE, OPERATOR_NAME, TERMS_EFFECTIVE_LABEL } from "@/lib/legal";

export default function LegalDocument({ kicker, title, lede, sections }) {
  return (
    <PageFrame narrow>
      <p className="kicker rise-in">{kicker}</p>
      <h1 className="display rise-in rise-in-1 mt-5 text-5xl text-ink md:text-6xl">{title}</h1>
      <p className="rise-in rise-in-2 mt-6 max-w-xl text-lg leading-9 text-ink-soft">{lede}</p>
      <p className="mt-4 text-sm leading-7 text-ink-soft">
        시행 {TERMS_EFFECTIVE_LABEL} · 운영 {OPERATOR_NAME}
      </p>

      <nav className="paper-sheet mt-10 rounded-[1.4rem] p-6 md:p-7" aria-label="목차">
        <p className="text-sm text-ink-soft">목차</p>
        <ol className="mt-3 space-y-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-sage-deep underline-offset-4 hover:underline">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-5">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="legal-section paper-sheet rounded-[1.85rem] p-7 md:p-9"
          >
            <h2 className="display text-3xl text-ink">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-4 space-y-4 text-[1.02rem] leading-8 text-ink-soft">{section.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm leading-7 text-ink-soft">
        {CONTACT_LINE}
        {" · "}
        <Link href="/" className="text-sage-deep underline-offset-4 hover:underline">
          홈으로
        </Link>
      </p>
    </PageFrame>
  );
}
