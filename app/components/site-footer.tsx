import Image from "next/image";
import { FooterLoginMenu } from "./footer-login-menu";

type SiteFooterProps = {
  /** Hide the login button (e.g. on auth pages). */
  hideLogin?: boolean;
};

export function SiteFooter({ hideLogin = false }: SiteFooterProps = {}) {
  return (
    <footer className="border-t border-white/10 bg-[#062763] px-4 py-8 text-white sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-4 sm:grid-cols-3">
          <p className="text-center text-xs font-medium text-white/70 sm:text-left sm:text-sm">
            Funded by the European Union
          </p>
          <div className="flex justify-center">
            <Image
              src="/images/brands.png"
              alt="Partner brands"
              width={380}
              height={80}
              sizes="(max-width: 640px) 280px, 380px"
              className="max-h-16 object-contain sm:max-h-20"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          {!hideLogin ? (
            <FooterLoginMenu />
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </div>
      </div>
    </footer>
  );
}
