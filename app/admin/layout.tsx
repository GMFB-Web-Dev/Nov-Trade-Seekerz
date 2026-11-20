import Link from "next/link";
import type { ReactNode } from "react";
import { sections } from "@/lib/admin";
import { administrator } from "@/lib/viewer";

export const metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await administrator();
  return <div className="admin-surface"><div className="container page admin-shell">
    <aside className="panel admin-nav sticky">
      <h2>Administration</h2>
      <nav className="side-links" aria-label="Administration pages">
        {sections.map(({ slug, name, Icon }) => <Link href={slug ? "/admin/" + slug : "/admin"} key={slug}><Icon size={16} />{name}</Link>)}
      </nav>
    </aside>
    <div className="admin-content">{children}</div>
  </div></div>;
}
