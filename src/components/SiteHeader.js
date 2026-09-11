"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-5xl items-center justify-between px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-ink transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-80"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-mist/90 text-sage"
          >
            <span className="h-2 w-2 rounded-full bg-sage/80" />
          </span>
          <span className="font-serif text-xl tracking-tight">취향담</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="주요 메뉴">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nav-link rounded-full px-4 py-2 text-sm ${
                  active ? "text-sage-deep" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/80 text-ink transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-paper-deep/70 md:hidden"
          aria-controls={menuId}
          aria-expanded={open}
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
          <span aria-hidden="true" className="flex flex-col items-center gap-1.5">
            <span
              className={`block h-0.5 w-4 rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-4 rounded-full bg-ink transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-0.5 w-4 rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div className="md:hidden">
          <button
            type="button"
            className="overlay-enter fixed inset-0 top-[4.25rem] z-30 bg-ink/10"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <nav
            id={menuId}
            aria-label="모바일 메뉴"
            className="menu-enter relative z-40 border-t border-line/70 bg-card/95 px-6 py-5 backdrop-blur-sm"
          >
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-2xl px-4 py-3 text-base transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        active
                          ? "bg-sage-mist/80 text-sage-deep"
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
    </header>
  );
}
