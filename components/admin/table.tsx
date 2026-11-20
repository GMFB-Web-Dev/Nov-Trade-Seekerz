import Link from "next/link";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { adminPageSize, type AdminFilter } from "@/lib/admin";
import { label } from "@/lib/format";
import { Empty, Pagination } from "@/components/ui";

export function FilterBar({ path, filter, search, states }: { path: string; filter: AdminFilter; search?: string; states?: string[] }) {
  return <form className="admin-filter" action={path}>
    {search && <label>Search<input name="q" type="search" maxLength={80} placeholder={search} defaultValue={filter.q} /></label>}
    {states && <label>Status<select name="state" defaultValue={filter.state}><option value="">All statuses</option>
      {states.map((state) => <option key={state} value={state}>{label(state)}</option>)}</select></label>}
    <button className="button" type="submit"><Search size={16} /> Filter</button>
    <Link className="button secondary" href={path}>Clear</Link>
  </form>;
}

export function AdminTable({ columns, children, total, path, filter }: {
  columns: string[]; children: ReactNode; total: number | null; path: string; filter: AdminFilter;
}) {
  return <>
    {total ? <><div className="list-head"><span>{total} records</span></div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Records table">
        <table className="admin-table"><thead><tr>{columns.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table>
      </div>
      <Pagination page={filter.page} total={total} size={adminPageSize} path={path} params={{ q: filter.q, state: filter.state }} />
    </> : <Empty title="No records found">{filter.q || filter.state ? "Change the filters to see more results." : undefined}
      {filter.page > 1 && <Link href={path} className="inline-link"> Return to the first page</Link>}</Empty>}
  </>;
}
