import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppErrorProvider } from "./components/app-error-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMECC2E",
  description:
    "Sustainable Energy & Materials, Energy Policy, Climate Change, Energy Economics and Environment.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} scroll-smooth antialiased`}
    >
      <body>
        <AppErrorProvider>{children}</AppErrorProvider>
      </body>
    </html>
  );
}
