import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { label, param, type Query } from "@/lib/format";

export function Notice({ query }: { query: Query }) {
  const error = param(query.error);
  const success = param(query.success);
  if (!error && !success) return null;
  return <div className={error ? "notice error" : "notice success"} role={error ? "alert" : "status"}>
    {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
    <span>{error || success}</span>
  </div>;
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><Inbox size={30} aria-hidden /><h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function Tag({ value, tone }: { value: string; tone?: "blue" | "good" | "neutral" }) {
  return <span className={"tag " + (tone ?? (["active", "awarded", "completed", "paid", "resolved"].includes(value) ? "good" : "blue"))}>{label(value)}</span>;
}

export function Pagination({ page, total, size, path, params = {} }: {
  page: number; total: number; size: number; path: string; params?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages < 2 && page < 2) return null;
  const href = (number: number) => path + "?" + new URLSearchParams({ ...params, page: String(number) }).toString();
  return <nav className="pagination" aria-label="Pagination">
    {page > 1 ? <Link className="button secondary small" href={href(page - 1)}><ChevronLeft size={16} /> Previous</Link> : <span />}
    <span>Page {page} of {pages}</span>
    {page < pages ? <Link className="button secondary small" href={href(page + 1)}>Next <ChevronRight size={16} /></Link> : <span />}
  </nav>;
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="back-link" href={to}><ChevronLeft size={17} />{children}</Link>;
}

export type Action = (data: FormData) => void | Promise<void>;

export function TaskForm({ action, id, children, className }: { action: Action; id?: string; children: ReactNode; className?: string }) {
  return <form action={action} className={className}>
    {id && <input type="hidden" name="id" value={id} />}
    {children}
  </form>;
}
