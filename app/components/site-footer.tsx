import Image from "next/image";
import { FooterLoginMenu } from "./footer-login-menu";

type SiteFooterProps = {
  /** Hide the login button (e.g. on auth pages). */
  hideLogin?: boolean;
  /** Tighter layout for the fixed-viewport home page. */
  compact?: boolean;
};

export function SiteFooter({
  hideLogin = false,
  compact = false,
}: SiteFooterProps = {}) {
  return (
    <footer
      className={`shrink-0 border-t border-white/10 bg-[#062763] px-4 text-white ${
        compact ? "py-3 sm:py-4" : "py-8 sm:py-10"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div
          className={`grid items-center sm:grid-cols-3 ${compact ? "gap-2" : "gap-4"}`}
        >
          <p
            className={`text-center font-medium text-white/70 sm:text-left ${
              compact ? "text-[0.65rem] sm:text-xs" : "text-xs sm:text-sm"
            }`}
          >
            Funded by the European Union
          </p>
          <div className="flex justify-center">
            <Image
              src="/images/brands.png"
              alt="Partner brands"
              width={380}
              height={80}
              sizes="(max-width: 640px) 280px, 380px"
              className={`object-contain ${compact ? "max-h-10 sm:max-h-12" : "max-h-16 sm:max-h-20"}`}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          {!hideLogin ? (
            <FooterLoginMenu compact={compact} />
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </div>
      </div>
    </footer>
  );
}
