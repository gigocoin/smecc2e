"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APPLICANT_LOGIN_PATH } from "@/lib/applicant-login-paths";

const triggerClass =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[#f7be2a]/60 hover:bg-[#f7be2a] hover:text-[#062763] focus:outline-none focus:ring-2 focus:ring-[#f7be2a]/50 sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-[0.15em]";

const menuItemClass =
  "block px-4 py-2.5 text-sm font-semibold text-[#062763] transition hover:bg-[#f7be2a]/20";

export function FooterLoginMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative mx-auto sm:ml-auto sm:mr-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Login options"
        className={
          compact
            ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white transition hover:border-[#f7be2a]/60 hover:bg-[#f7be2a] hover:text-[#062763] focus:outline-none focus:ring-2 focus:ring-[#f7be2a]/50 sm:px-3.5 sm:py-1.5 sm:text-[0.65rem]"
            : triggerClass
        }
      >
        Login
        <svg
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Login options"
          className="absolute bottom-full right-0 z-50 mb-2 min-w-44 overflow-hidden rounded-lg border border-white/20 bg-white py-1 shadow-lg"
        >
          <Link
            href="/scholar/login"
            role="menuitem"
            className={menuItemClass}
            onClick={() => setOpen(false)}
          >
            Scholar Login
          </Link>
          <Link
            href={APPLICANT_LOGIN_PATH}
            role="menuitem"
            className={menuItemClass}
            onClick={() => setOpen(false)}
          >
            Applicant Login
          </Link>
          <Link
            href="/login"
            role="menuitem"
            className={menuItemClass}
            onClick={() => setOpen(false)}
          >
            Admin Login
          </Link>
        </div>
      )}
    </div>
  );
}
