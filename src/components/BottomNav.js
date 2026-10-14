"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNav } from "@/data/nav";

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav md:hidden" aria-label="모바일 메뉴">
      {mobileNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="bottom-link"
          >
            <TabIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-5.2v-5.2H10.2V21H5a1 1 0 0 1-1-1v-8.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "board") {
    return (
      <svg {...common}>
        <path d="M6 4.5h12v15H6z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 8.5h6M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "diary") {
    return (
      <svg {...common}>
        <rect x="4.5" y="5" width="15" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3.8v3M16 3.8v3M4.5 9.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="10" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 17.5c.6-2 2.2-3 4.2-3s3.6 1 4.2 3M13.2 14.8c.8-.5 1.7-.7 2.6-.6 1.6.2 2.7 1.2 3.2 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
