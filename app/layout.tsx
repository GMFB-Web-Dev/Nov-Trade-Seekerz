import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Trade Seekerz", template: "%s | Trade Seekerz" },
  description: "Find local NZ tradespeople, post your next job and compare quotes on Trade Seekerz.",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-NZ"><body>
    <a href="#content" className="skip-link">Skip to content</a>
    <SiteHeader />
    <main id="content">{children}</main>
    <SiteFooter />
  </body></html>;
}
