"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import BrandMark from "@/components/BrandMark";
import { navItems } from "@/data/nav";

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className={`header-shell relative z-40 ${open ? "is-open" : ""}`}>
        <div className="flex h-[3.6rem] items-center justify-between px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <BrandMark />
            <span className="font-serif text-[1.2rem] tracking-tight">취향담</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="nav-link"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/90 text-ink transition-colors duration-500 hover:bg-paper-deep/80 md:hidden"
            aria-controls={menuId}
            aria-expanded={open}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
            <span aria-hidden="true" className="flex flex-col items-center gap-1.5">
              <span
                className={`block h-0.5 w-4 rounded-full bg-ink transition-transform duration-500 ${
                  open ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-4 rounded-full bg-ink transition-opacity duration-500 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 w-4 rounded-full bg-ink transition-transform duration-500 ${
                  open ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        {open ? (
          <div className="menu-in md:hidden">
            <nav
              id={menuId}
              aria-label="모바일 메뉴"
              className="border-t border-line/70 px-3 pb-4 pt-2"
            >
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-2xl px-4 py-3 text-base transition-colors duration-500 ${
                          active
                            ? "bg-sage-mist text-sage-deep"
                            : "text-ink hover:bg-paper-deep/80"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        ) : null}
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </header>
  );
}
