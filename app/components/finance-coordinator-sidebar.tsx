"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildFinanceCoordinatorNav,
  buildFinanceRecordsNav,
  isFinanceCoordinatorNavActive,
  isFinanceRecordsGroupActive,
  isFinanceRecordsSubActive,
  type FinanceCoordinatorNavId,
} from "@/lib/finance-coordinator-nav";

function flyoutPanelPosition(rect: DOMRect): {
  top: number;
  left: number;
  maxHeight: number;
} {
  const margin = 8;
  const preferredMax = Math.min(window.innerHeight * 0.7, 28 * 16);
  const spaceBelow = window.innerHeight - rect.top - margin;
  const spaceAbove = rect.bottom - margin;
  let maxHeight = Math.min(preferredMax, Math.max(spaceBelow, 0));
  let top = rect.top;

  if (maxHeight < 180 && spaceAbove > spaceBelow) {
    maxHeight = Math.min(preferredMax, spaceAbove);
    top = Math.max(margin, rect.bottom - maxHeight);
  }

  if (top + maxHeight > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - margin - maxHeight);
  }

  return { top, left: rect.right + 4, maxHeight };
}

function FlyoutChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "translate-x-0.5" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function NavIcon({ id }: { id: FinanceCoordinatorNavId }) {
  const className = "h-5 w-5 shrink-0";
  switch (id) {
    case "overview":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      );
    case "financial_records":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "financial_reports":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case "audit":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      );
    case "profile":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    default:
      return null;
  }
}

function SidebarLink({
  href,
  active,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-[#f7be2a] text-[#062763]"
          : "text-white hover:bg-white/15"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function SidebarFlyoutSubmenu({
  label,
  icon,
  groupActive,
  open,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  icon: ReactNode;
  groupActive: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) return;
      setPanelPos(flyoutPanelPosition(el.getBoundingClientRect()));
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${
          groupActive
            ? "bg-[#f7be2a] text-[#062763]"
            : "text-white hover:bg-white/15"
        }`}
      >
        {icon}
        <span className="flex-1 text-left whitespace-nowrap">{label}</span>
        <FlyoutChevron open={open} />
      </button>
      {open && panelPos ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={{
            top: panelPos.top,
            left: panelPos.left,
            maxHeight: panelPos.maxHeight,
          }}
          className="fixed z-[70] w-60 overflow-x-hidden overflow-y-auto rounded-lg border border-white/15 bg-[#062763] py-2 shadow-2xl"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FlyoutSubmenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={`block px-4 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-[#f7be2a] text-[#062763]"
          : "text-white hover:bg-white/15"
      }`}
    >
      {children}
    </Link>
  );
}

function FinancialRecordsNav({
  pathname,
  recordParam,
  onNavigate,
  basePath,
}: {
  pathname: string;
  recordParam: string | null;
  onNavigate: () => void;
  basePath: string;
}) {
  const items = buildFinanceRecordsNav(basePath);
  const groupActive = isFinanceRecordsGroupActive(pathname, basePath);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, recordParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Financial Records"
      icon={<NavIcon id="financial_records" />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        const active = isFinanceRecordsSubActive(
          item,
          pathname,
          recordParam,
          basePath
        );
        return (
          <FlyoutSubmenuLink
            key={item.id}
            href={item.href}
            active={active}
            onNavigate={() => {
              setOpen(false);
              onNavigate();
            }}
          >
            {item.label}
          </FlyoutSubmenuLink>
        );
      })}
    </SidebarFlyoutSubmenu>
  );
}

type FinancePortalSidebarProps = {
  basePath?: string;
  portalLabel?: string;
  navAriaLabel?: string;
  includeReportsAndAudit?: boolean;
};

export function FinanceCoordinatorSidebar({
  basePath = "/finance-coordinator",
  portalLabel = "Finance Coordinator",
  navAriaLabel = "Finance coordinator dashboard",
  includeReportsAndAudit = true,
}: FinancePortalSidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nav = buildFinanceCoordinatorNav(basePath, { includeReportsAndAudit });
  const [isHydrated, setIsHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { name: string; role: string };
        };
        if (data.user) setSessionUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  const close = () => setSidebarOpen(false);
  const recordParam =
    isHydrated && pathname.includes("/financial-records")
      ? searchParams.get("record")
      : null;

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 text-[#062763] shadow-sm lg:hidden"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-white/10 bg-[#062763] text-white transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="relative h-10 w-10 shrink-0 rounded-lg bg-white p-1">
            <Image
              src="/images/logo1.png"
              alt="SMECC2E"
              fill
              className="object-contain p-0.5"
              sizes="40px"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#f7be2a]">
              SMECC2E
            </p>
            <p className="text-xs font-bold leading-tight text-white sm:text-sm">
              {portalLabel}
            </p>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
          aria-label={navAriaLabel}
        >
          {nav.map((item) => {
            if (item.nestedMenu === "financial_records") {
              return (
                <FinancialRecordsNav
                  key={item.id}
                  pathname={pathname}
                  recordParam={recordParam}
                  onNavigate={close}
                  basePath={basePath}
                />
              );
            }

            const active = isFinanceCoordinatorNavActive(
              item.id,
              pathname,
              basePath
            );
            return (
              <SidebarLink
                key={item.id}
                href={item.href!}
                active={active}
                icon={<NavIcon id={item.id} />}
                onNavigate={close}
              >
                {item.label}
              </SidebarLink>
            );
          })}
        </nav>

        <div className="mb-8 shrink-0 space-y-2 border-t border-white/10 px-4 py-4">
          {sessionUser ? (
            <div className="rounded-lg bg-white/10 px-3 py-2.5">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">
                {sessionUser.name}
              </p>
              <p className="text-xs text-[#f7be2a]">{sessionUser.role}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              close();
              void handleLogout();
            }}
            disabled={loggingOut}
            className="block w-full rounded-lg border border-[#f7be2a]/50 px-3 py-2 text-center text-xs font-semibold text-[#f7be2a] transition hover:bg-[#f7be2a] hover:text-[#062763] disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
