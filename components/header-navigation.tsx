"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, UserRound } from "lucide-react";
import type { FocusEvent, KeyboardEvent } from "react";

type NavItem = { href: string; label: string };

function dismissOnBlur(event: FocusEvent<HTMLDetailsElement>) {
  if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
}

function dismissOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== "Escape" || !event.currentTarget.open) return;
  event.currentTarget.open = false;
  event.currentTarget.querySelector("summary")?.focus();
}

export function HeaderNavigation({ links, primary, account }: {
  links: NavItem[];
  primary: NavItem;
  account: NavItem[];
}) {
  const pathname = usePathname();
  const current = (href: string) => pathname === href ? "page" : pathname.startsWith(href + "/") ? "true" : undefined;
  const navigation = (items: NavItem[]) => items.map(({ href, label }) =>
    <Link key={href} href={href} aria-current={current(href)} onClick={(event) => {
      const menu = event.currentTarget.closest("details");
      if (menu) menu.open = false;
    }}>{label}</Link>);
  const desktopLinks = links.filter(({ href }) => href !== primary.href);
  return <>
    <nav className="header-links" aria-label="Main navigation">{navigation(desktopLinks)}</nav>
    <div className="header-actions">
      {account.length ? <details className="header-account" onBlur={dismissOnBlur} onKeyDown={dismissOnEscape}>
        <summary><UserRound size={17} aria-hidden="true" /> Account <ChevronDown size={14} aria-hidden="true" /></summary>
        <nav className="header-menu-panel" aria-label="Account navigation">{navigation(account)}</nav>
      </details> : <Link className="header-sign-in" href="/login" aria-current={current("/login")}>Sign in</Link>}
      <Link className="button header-primary" href={primary.href} aria-current={current(primary.href)}>{primary.label}</Link>
      <details className="mobile-menu" onBlur={dismissOnBlur} onKeyDown={dismissOnEscape}>
        <summary aria-label="Menu"><Menu size={22} aria-hidden="true" /></summary>
        <nav className="header-menu-panel" aria-label="Mobile navigation">
          {navigation(desktopLinks)}
          <div className="header-menu-divider">{navigation(account.length ? account : [
            { href: "/login", label: "Sign in" },
            { href: "/register", label: "Create an account" },
          ])}</div>
        </nav>
      </details>
    </div>
  </>;
}
