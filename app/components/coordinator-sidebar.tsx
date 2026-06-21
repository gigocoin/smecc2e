"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isDashboardNavActive, type CoordinatorNavId } from "@/lib/coordinator-nav";
import {
  buildApplicantsManagementNav,
  buildCriterionWeightsNav,
  EVALUATOR_APPLICANTS_MANAGEMENT_HIDDEN_IDS,
  isApplicantsManagementGroupActive,
  isApplicantsManagementSubActive,
  isCriterionWeightsGroupActive,
  isCriterionWeightsSubActive,
  type ApplicantsManagementNavId,
} from "@/lib/coordinator-applicants-nav";
import {
  buildFinancialManagementNav,
  isFinancialManagementGroupActive,
  isFinancialManagementSubActive,
} from "@/lib/coordinator-financial-nav";
import {
  buildCommunicationDocumentsNav,
  buildCommunicationKnowledgeNav,
  isCommunicationDocumentsGroupActive,
  isCommunicationDocumentsSubActive,
  isCommunicationKnowledgeGroupActive,
  isCommunicationKnowledgeSubActive,
} from "@/lib/coordinator-communication-nav";
import {
  buildProjectManagementNav,
  isProjectManagementGroupActive,
  isProjectManagementSubActive,
} from "@/lib/coordinator-project-nav";
import {
  buildScholarsManagementNav,
  isScholarsManagementGroupActive,
  isScholarsManagementSubActive,
} from "@/lib/coordinator-scholars-nav";
import { useDashboardPortal } from "./dashboard-portal-provider";

function NavIcon({ section }: { section: CoordinatorNavId }) {
  const className = "h-5 w-5 shrink-0";
  switch (section) {
    case "overview":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "regions":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "institutions":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "applicants":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "scholars":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824 2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      );
    case "programs":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}

function FlyoutChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "translate-x-0.5" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
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
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelPos({ top: rect.top, left: rect.right + 4 });
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
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
          groupActive
            ? "bg-[#f7be2a] text-[#062763]"
            : "text-white hover:bg-white/15"
        }`}
      >
        {icon}
        <span className="flex-1 text-left whitespace-nowrap">{label}</span>
        <FlyoutChevron open={open} />
      </button>
      {open && panelPos && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={{ top: panelPos.top, left: panelPos.left }}
          className="fixed z-[70] w-56 max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto rounded-lg border border-white/15 bg-[#062763] py-2 shadow-2xl"
        >
          {children}
        </div>
      )}
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

function ApplicantsManagementIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-4-4h.01M9 16h.01"
      />
    </svg>
  );
}

function ApplicantsManagementNav({
  basePath,
  pathname,
  statusParam,
  onNavigate,
  hideIds,
}: {
  basePath: string;
  pathname: string;
  statusParam: string | null;
  onNavigate: () => void;
  hideIds?: ApplicantsManagementNavId[];
}) {
  const items = buildApplicantsManagementNav(basePath, { hideIds });
  const criterionWeightsItems = buildCriterionWeightsNav(basePath);
  const criterionWeightsGroupActive = isCriterionWeightsGroupActive(
    pathname,
    basePath
  );
  const groupActive = isApplicantsManagementGroupActive(
    items,
    pathname,
    statusParam,
    basePath
  );
  const [open, setOpen] = useState(false);
  const [criterionWeightsOpen, setCriterionWeightsOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setCriterionWeightsOpen(false);
  }, [pathname, statusParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Applicants management"
      icon={<ApplicantsManagementIcon />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        if (item.nestedMenu === "criterion_weights") {
          return (
            <FlyoutNestedSubmenu
              key={item.id}
              label={item.label}
              groupActive={criterionWeightsGroupActive}
              open={criterionWeightsOpen}
              onToggle={() => setCriterionWeightsOpen((prev) => !prev)}
              onClose={() => setCriterionWeightsOpen(false)}
            >
              {criterionWeightsItems.map((cwItem) => {
                const active = isCriterionWeightsSubActive(
                  cwItem,
                  pathname,
                  basePath
                );
                return (
                  <FlyoutSubmenuLink
                    key={cwItem.id}
                    href={cwItem.href}
                    active={active}
                    onNavigate={() => {
                      setCriterionWeightsOpen(false);
                      setOpen(false);
                      onNavigate();
                    }}
                  >
                    {cwItem.label}
                  </FlyoutSubmenuLink>
                );
              })}
            </FlyoutNestedSubmenu>
          );
        }

        const active = isApplicantsManagementSubActive(
          item,
          pathname,
          statusParam,
          basePath
        );
        return (
          <FlyoutSubmenuLink
            key={item.id}
            href={item.href!}
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

function ScholarsManagementIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l9-5-9-5-9 5 9 5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824 2.998 12.078 12.078 0 01.665-6.479L12 14z"
      />
    </svg>
  );
}

function ScholarsManagementNav({
  basePath,
  pathname,
  sectionParam,
  onNavigate,
}: {
  basePath: string;
  pathname: string;
  sectionParam: string | null;
  onNavigate: () => void;
}) {
  const items = buildScholarsManagementNav(basePath);
  const groupActive = isScholarsManagementGroupActive(
    items,
    pathname,
    sectionParam,
    basePath
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, sectionParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Scholars management"
      icon={<ScholarsManagementIcon />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        const active = isScholarsManagementSubActive(
          item,
          pathname,
          sectionParam,
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

function FinancialManagementIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function FinancialManagementNav({
  basePath,
  pathname,
  sectionParam,
  onNavigate,
}: {
  basePath: string;
  pathname: string;
  sectionParam: string | null;
  onNavigate: () => void;
}) {
  const items = buildFinancialManagementNav(basePath);
  const groupActive = isFinancialManagementGroupActive(
    items,
    pathname,
    sectionParam,
    basePath
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, sectionParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Financial management"
      icon={<FinancialManagementIcon />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        const active = isFinancialManagementSubActive(
          item,
          pathname,
          sectionParam,
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

function ProjectManagementIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function ProjectManagementNav({
  basePath,
  pathname,
  sectionParam,
  onNavigate,
}: {
  basePath: string;
  pathname: string;
  sectionParam: string | null;
  onNavigate: () => void;
}) {
  const items = buildProjectManagementNav(basePath);
  const groupActive = isProjectManagementGroupActive(
    items,
    pathname,
    sectionParam,
    basePath
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, sectionParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Project management"
      icon={<ProjectManagementIcon />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        const active = isProjectManagementSubActive(
          item,
          pathname,
          sectionParam,
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

function CommunicationKnowledgeIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  );
}

function FlyoutNestedSubmenu({
  label,
  groupActive,
  open,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  groupActive: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelPos({ top: rect.top, left: rect.right + 4 });
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
        triggerRef.current?.contains(target) ||
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
    <div ref={triggerRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold transition sm:text-sm ${
          groupActive
            ? "bg-[#f7be2a] text-[#062763]"
            : "text-white hover:bg-white/15"
        }`}
      >
        <span className="flex-1 text-left">{label}</span>
        <FlyoutChevron open={open} />
      </button>
      {open && panelPos && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={{ top: panelPos.top, left: panelPos.left }}
          className="fixed z-[80] w-56 max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto rounded-lg border border-white/15 bg-[#062763] py-2 shadow-2xl"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function CommunicationKnowledgeNav({
  basePath,
  pathname,
  sectionParam,
  documentsViewParam,
  onNavigate,
}: {
  basePath: string;
  pathname: string;
  sectionParam: string | null;
  documentsViewParam: string | null;
  onNavigate: () => void;
}) {
  const items = buildCommunicationKnowledgeNav(basePath);
  const documentsItems = buildCommunicationDocumentsNav(basePath);
  const groupActive = isCommunicationKnowledgeGroupActive(
    items,
    pathname,
    sectionParam,
    basePath
  );
  const documentsGroupActive = isCommunicationDocumentsGroupActive(
    pathname,
    sectionParam,
    basePath
  );
  const [open, setOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setDocumentsOpen(false);
  }, [pathname, sectionParam, documentsViewParam]);

  return (
    <SidebarFlyoutSubmenu
      label="Communication & Knowledge"
      icon={<CommunicationKnowledgeIcon />}
      groupActive={groupActive}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {items.map((item) => {
        if (item.section === "documents") {
          return (
            <FlyoutNestedSubmenu
              key={item.id}
              label={item.label}
              groupActive={documentsGroupActive}
              open={documentsOpen}
              onToggle={() => setDocumentsOpen((prev) => !prev)}
              onClose={() => setDocumentsOpen(false)}
            >
              {documentsItems.map((docItem) => {
                const active = isCommunicationDocumentsSubActive(
                  docItem,
                  pathname,
                  sectionParam,
                  documentsViewParam,
                  basePath
                );
                return (
                  <FlyoutSubmenuLink
                    key={docItem.id}
                    href={docItem.href}
                    active={active}
                    onNavigate={() => {
                      setDocumentsOpen(false);
                      setOpen(false);
                      onNavigate();
                    }}
                  >
                    {docItem.label}
                  </FlyoutSubmenuLink>
                );
              })}
            </FlyoutNestedSubmenu>
          );
        }

        const active = isCommunicationKnowledgeSubActive(
          item,
          pathname,
          sectionParam,
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

export function CoordinatorSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { basePath, label, nav, portalKey } = useDashboardPortal();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const section = isHydrated ? searchParams.get("section") : null;
  const statusParam = isHydrated ? searchParams.get("status") : null;
  const scholarsSectionParam =
    isHydrated && pathname.includes("/scholars") ? section : null;
  const financeSectionParam =
    isHydrated && pathname.includes("/finance") ? section : null;
  const projectSectionParam =
    isHydrated && pathname.includes("/project") ? section : null;
  const communicationSectionParam =
    isHydrated && pathname.includes("/communication") ? section : null;
  const documentsViewParam =
    isHydrated &&
    pathname.includes("/communication") &&
    communicationSectionParam === "documents"
      ? searchParams.get("view")
      : null;

  const close = () => {
    setSidebarOpen(false);
    onNavigate?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 text-[#062763] shadow-sm lg:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
            <p className="text-xs font-bold leading-tight text-white sm:text-sm">{label}</p>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
          aria-label="Dashboard"
        >
          {nav.map((item) => {
            if (portalKey === "evaluator" && item.id === "users") {
              return (
                <div key={item.id} className="space-y-1">
                  <ApplicantsManagementNav
                    basePath={basePath}
                    pathname={pathname}
                    statusParam={statusParam}
                    onNavigate={close}
                    hideIds={EVALUATOR_APPLICANTS_MANAGEMENT_HIDDEN_IDS}
                  />
                  <CommunicationKnowledgeNav
                    basePath={basePath}
                    pathname={pathname}
                    sectionParam={communicationSectionParam}
                    documentsViewParam={documentsViewParam}
                    onNavigate={close}
                  />
                </div>
              );
            }

            const active = isDashboardNavActive(
              item.id,
              pathname,
              section,
              basePath
            );
            return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? "bg-[#f7be2a] text-[#062763]"
                      : "text-white hover:bg-white/15"
                  }`}
                >
                  <NavIcon section={item.id} />
                  {item.label}
                </Link>
                {item.id === "users" && (
                  <div className="mt-1 space-y-1">
                    <ApplicantsManagementNav
                      basePath={basePath}
                      pathname={pathname}
                      statusParam={statusParam}
                      onNavigate={close}
                    />
                    {portalKey !== "evaluator" && (
                      <>
                        <ScholarsManagementNav
                          basePath={basePath}
                          pathname={pathname}
                          sectionParam={scholarsSectionParam}
                          onNavigate={close}
                        />
                        <FinancialManagementNav
                          basePath={basePath}
                          pathname={pathname}
                          sectionParam={financeSectionParam}
                          onNavigate={close}
                        />
                        <ProjectManagementNav
                          basePath={basePath}
                          pathname={pathname}
                          sectionParam={projectSectionParam}
                          onNavigate={close}
                        />
                      </>
                    )}
                    <CommunicationKnowledgeNav
                      basePath={basePath}
                      pathname={pathname}
                      sectionParam={communicationSectionParam}
                      documentsViewParam={documentsViewParam}
                      onNavigate={close}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 mb-8 border-t border-white/10 px-4 py-4">
          {sessionUser && (
            <div className="rounded-lg bg-white/10 px-3 py-2.5">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">
                {sessionUser.name}
              </p>
              <p className="text-xs text-[#f7be2a]">{sessionUser.role}</p>
            </div>
          )}
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
