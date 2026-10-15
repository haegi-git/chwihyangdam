"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import BrandMark from "@/components/BrandMark";
import NotificationBell from "@/components/NotificationBell";
import { desktopNav } from "@/data/nav";

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="header-shell px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-ink">
          <BrandMark />
          <span className="font-hand whitespace-nowrap text-[1.7rem] leading-none">취향담</span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-1 md:flex" aria-label="주요 메뉴">
          {desktopNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="nav-link cursor-pointer"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
