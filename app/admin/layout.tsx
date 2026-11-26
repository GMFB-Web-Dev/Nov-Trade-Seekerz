import type { ReactNode } from "react";
import { AdminNavigation } from "@/components/admin/navigation";
import { administrator } from "@/lib/viewer";
import "./workspace.css";

export const metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await administrator();
  return <div className="admin-surface"><div className="container page admin-shell">
    <AdminNavigation />
    <div className="admin-content">{children}</div>
  </div></div>;
}
