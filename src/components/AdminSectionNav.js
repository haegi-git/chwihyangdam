import Link from "next/link";

const items = [
  { href: "/admin/reports", label: "살펴보기" },
  { href: "/admin/categories", label: "분류" },
  { href: "/admin/hobbies", label: "말머리" },
];

export default function AdminSectionNav({ current }) {
  return (
    <nav className="mt-8 flex flex-wrap gap-2" aria-label="운영">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition-colors duration-500 ${
              active
                ? "bg-sage-deep text-[#f7f1e6]"
                : "border border-line/90 bg-card/80 text-ink-soft hover:bg-sage-mist hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
