"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { useId, type FocusEvent, type KeyboardEvent } from "react";
import { logout } from "@/app/actions/auth";
import { useLiveActivity, type ActivityConnection } from "@/lib/use-live-activity";

type NavItem = { href: string; label: string };

function dismissMenu(element: HTMLElement) {
  const menu = element.closest("details");
  if (menu) menu.open = false;
}

function dismissOnBlur(event: FocusEvent<HTMLDetailsElement>) {
  if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
}

function dismissOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== "Escape" || !event.currentTarget.open) return;
  event.currentTarget.open = false;
  event.currentTarget.querySelector("summary")?.focus();
}

export function HeaderNavigation({ links, primary, account, accountName, activity }: {
  links: NavItem[];
  primary: NavItem;
  account: NavItem[];
  accountName?: string;
  activity?: ActivityConnection;
}) {
  const pathname = usePathname();
  const description = useId();
  const unread = useLiveActivity(activity, pathname);
  const hasUnread = Boolean(unread?.messages || unread?.jobs);
  const current = (href: string) => pathname === href ? "page" : pathname.startsWith(href + "/") ? "true" : undefined;
  const navigation = (items: NavItem[]) => items.map(({ href, label }) => {
    const badge = href === "/messages" && unread?.messages ? "messages" : href === "/dashboard" && unread?.jobs ? "jobs" : null;
    return <Link key={href} href={href} aria-current={current(href)} aria-describedby={badge ? description + "-" + badge : undefined}
      onClick={(event) => dismissMenu(event.currentTarget)}>
      {label}{badge && <span className="unread-dot" data-nav-unread={badge} aria-hidden="true" />}
    </Link>;
  });
  const desktopLinks = links.filter(({ href }) => href !== primary.href);
  const signOut = account.length > 0 && <form className="header-menu-divider" action={logout} onSubmit={(event) => dismissMenu(event.currentTarget)}>
    <button type="submit"><LogOut size={16} aria-hidden="true" /> Sign out</button>
  </form>;
  return <>
    {hasUnread && <>
      <span id={description + "-messages"} hidden>Unread messages</span>
      <span id={description + "-jobs"} hidden>Unread job updates</span>
      <span id={description + "-menu"} hidden>Unread messages or job updates</span>
    </>}
    <nav className="header-links" aria-label="Main navigation">{navigation(desktopLinks)}</nav>
    <div className="header-actions">
      {account.length ? <details className="header-account" onBlur={dismissOnBlur} onKeyDown={dismissOnEscape}>
        <summary aria-label={accountName ? `${accountName}, account menu` : undefined}>
          <UserRound size={17} aria-hidden="true" />
          <span className="header-account-name" dir="auto">{accountName || "Account"}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <nav className="header-menu-panel" aria-label="Account navigation">{navigation(account)}{signOut}</nav>
      </details> : <Link className="header-sign-in" href="/login" aria-current={current("/login")}>Sign in</Link>}
      <Link className="button header-primary" href={primary.href} aria-current={current(primary.href)}>{primary.label}</Link>
      <details className="mobile-menu" onBlur={dismissOnBlur} onKeyDown={dismissOnEscape}>
        <summary aria-label="Menu" aria-describedby={hasUnread ? description + "-menu" : undefined}>
          <Menu size={22} aria-hidden="true" />
          {hasUnread && <span className="unread-dot" data-nav-unread="menu" aria-hidden="true" />}
        </summary>
        <nav className="header-menu-panel" aria-label="Mobile navigation">
          {navigation(desktopLinks)}
          <div className="header-menu-divider">{navigation(account.length ? account : [
            { href: "/login", label: "Sign in" },
            { href: "/register", label: "Create an account" },
          ])}</div>
          {signOut}
        </nav>
      </details>
    </div>
  </>;
}
