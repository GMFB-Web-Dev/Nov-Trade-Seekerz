"use client";

import { ChevronDown, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sections } from "@/lib/admin";

const groups = [
  { name: "Accounts", slugs: ["users", "banned", "admins", "credentials"] },
  { name: "Marketplace", slugs: ["projects", "applications", "quotes", "categories"] },
  { name: "Moderation", slugs: ["reviews", "reports", "support"] },
  { name: "Billing", slugs: ["subscriptions", "billing"] },
  { name: "System", slugs: ["settings", "errors", "audit"] },
] as const;

const sectionBySlug = new Map(sections.map((section) => [section.slug, section]));

export function AdminNavigation() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const currentSection = sections.find(({ slug }) => path === (slug ? "/admin/" + slug : "/admin"));

  return <aside className="panel admin-nav">
    <h2 className="admin-nav-title">Administration</h2>
    <button className="admin-nav-toggle" type="button" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)}>
      <span><strong>Admin menu</strong><small>{currentSection?.name ?? "Overview"}</small></span>
      <ChevronDown size={18} aria-hidden="true" />
    </button>
    <nav className="admin-nav-links side-links" id="admin-navigation" data-open={open} aria-label="Administration pages">
      <Link prefetch={false} href="/admin" aria-current={path === "/admin" ? "page" : undefined} onClick={() => setOpen(false)}>
        <LayoutDashboard size={17} aria-hidden="true" /> Overview
      </Link>
      {groups.map(({ name, slugs }) => <div className="admin-nav-group" key={name}>
        <h3>{name}</h3>
        {slugs.map((slug) => {
          const section = sectionBySlug.get(slug);
          if (!section) return null;
          const { name, Icon } = section;
          const href = "/admin/" + slug;
          return <Link prefetch={false} href={href} key={slug} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>
            <Icon size={17} aria-hidden="true" />{name}
          </Link>;
        })}
      </div>)}
    </nav>
  </aside>;
}
