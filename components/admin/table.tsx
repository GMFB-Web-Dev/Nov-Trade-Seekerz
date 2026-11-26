import Link from "next/link";
import { Search } from "lucide-react";
import type { Key, ReactNode } from "react";
import type { PostgrestResponse } from "@supabase/supabase-js";
import { adminPageSize, type AdminFilter } from "@/lib/admin";
import { label } from "@/lib/format";
import { Empty, Pagination } from "@/components/ui";

export async function readAdminPage<Row>(
  query: { range: (from: number, to: number) => PromiseLike<PostgrestResponse<Row>> },
  filter: AdminFilter,
  errorMessage: string,
): Promise<{ data: Row[]; count: number | null }> {
  const { data, count, error } = await query.range(filter.first, filter.last);
  if (error) {
    if (filter.page > 1 && error.code === "PGRST103") return { data: [], count: null };
    throw new Error(errorMessage);
  }
  return { data, count };
}

export function FilterBar({ path, filter, search, states }: { path: string; filter: AdminFilter; search?: string; states?: string[] }) {
  return <form className="panel admin-filter" action={path} role="search" aria-label="Filter records">
    {search && <label>Search<input name="q" type="search" maxLength={80} placeholder={search} defaultValue={filter.q} /></label>}
    {states && <label>Status<select name="state" defaultValue={filter.state}><option value="">All statuses</option>
      {states.map((state) => <option key={state} value={state}>{label(state)}</option>)}</select></label>}
    <div className="buttons">
      <button className="button" type="submit"><Search size={16} aria-hidden="true" /> Filter</button>
      {(filter.q || filter.state) && <Link className="button secondary" href={path}>Clear filters</Link>}
    </div>
  </form>;
}

export function AdminTable({ rows, total, path, filter }: {
  rows: { id: Key; cells: Record<string, ReactNode> }[];
  total: number | null;
  path: string;
  filter: AdminFilter;
}) {
  const params = { q: filter.q, state: filter.state };
  if (!rows.length) {
    return <Empty title="No records found">
      {filter.page > 1
        ? <Link href={path + "?" + new URLSearchParams(params)} className="inline-link">Return to the first page</Link>
        : (filter.q || filter.state) && <Link href={path} className="inline-link">Clear filters</Link>}
    </Empty>;
  }

  const columns = Object.keys(rows[0].cells);
  const records = total ?? rows.length;
  return <div className="admin-records">
    <div className="admin-table-wrap">
      <p className="admin-record-count">{records.toLocaleString("en-NZ")} {records === 1 ? "record" : "records"}</p>
      <table className="admin-table" role="table" aria-label="Records">
        <thead role="rowgroup"><tr role="row">{columns.map((heading) => <th scope="col" role="columnheader" key={heading}>{heading}</th>)}</tr></thead>
        <tbody role="rowgroup">{rows.map(({ id, cells }) => <tr role="row" key={id}>
          {columns.map((column) => <td role="cell" key={column}>
            <span className="admin-cell-label" aria-hidden="true">{column}</span>
            <div className="admin-cell-value">{cells[column]}</div>
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <Pagination page={filter.page} total={records} size={adminPageSize} path={path} params={params} />
  </div>;
}
