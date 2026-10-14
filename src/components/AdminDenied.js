import Link from "next/link";

export default function AdminDenied({ title, body }) {
  return (
    <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
      <h1 className="display text-3xl text-ink md:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">{body}</p>
      <Link href="/" className="btn-ghost mt-8">
        홈으로
      </Link>
    </section>
  );
}
