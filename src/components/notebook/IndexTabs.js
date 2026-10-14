import Link from "next/link";

export default function IndexTabs({ label = "분류", items }) {
  return (
    <nav aria-label={label}>
      <ul className="index-tabs">
        {items.map((item) => (
          <li key={item.key || item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "true" : undefined}
              className="index-tab"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
