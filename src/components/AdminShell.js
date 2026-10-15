import Link from "next/link";
import { ADMIN_TABS, adminHref } from "@/lib/admin";

export default function AdminShell({ tab, children }) {
  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="관리자">
        {ADMIN_TABS.map((item) => (
          <Link
            key={item.id}
            href={adminHref(item.id)}
            aria-current={item.id === tab ? "page" : undefined}
            className="cursor-pointer"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
