import { changeUser } from "@/app/actions/admin";
import { Tag, TaskForm } from "@/components/ui";
import { adminPageSize, type AdminFilter } from "@/lib/admin";
import { shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar } from "./table";

export async function Accounts({ filter, kind, actor }: { filter: AdminFilter; kind: "users" | "banned" | "admins"; actor: string }) {
  const path = "/admin/" + kind;
  const client = await db();
  const accountFilter = kind === "banned" ? "banned" : kind === "admins" ? "staff" : filter.state === "deactivated" ? "deactivated" : "";
  const { data, error } = await client.rpc("list_accounts", {
    search_term: filter.q, account_filter: accountFilter, first_row: filter.first, row_limit: adminPageSize,
  });
  if (error) throw new Error("Could not load accounts.");
  return <>
    <FilterBar path={path} filter={filter} search="Name, business or email" states={kind === "users" ? ["deactivated"] : undefined} />
    <AdminTable total={data[0]?.total ?? 0} path={path} filter={filter} rows={data.map((account) => ({
      id: account.id,
      cells: {
        Account: <><strong>{account.display_name || "Onboarding pending"}</strong><small>{account.email}</small>{account.business_name && <small>{account.business_name}</small>}</>,
        "Role and status": <div className="chips"><Tag value={account.role || "Onboarding"} tone="neutral" /><Tag value={account.status} />{account.is_staff && <Tag value="Admin" />}</div>,
        Joined: shortDate(account.created_at),
        Actions: actor === account.id ? <small>Your account</small> : <details><summary>Manage</summary>
          <TaskForm action={changeUser} id={account.id} className="stack">
            <input type="hidden" name="section" value={kind} />
            <div className="buttons">
              {account.status === "active" ? <>
                <button className="button danger small" name="operation" value="banned">Ban user</button>
                <button className="button secondary small" name="operation" value="deactivated">Deactivate</button>
              </> : <button className="button secondary small" name="operation" value="active">{account.status === "banned" ? "Unban user" : "Reactivate"}</button>}
              {(account.is_staff || account.status === "active") &&
                <button className="button secondary small" name="operation" value={account.is_staff ? "revoke" : "grant"}>{account.is_staff ? "Remove admin access" : "Grant admin access"}</button>}
            </div>
            {account.status === "deactivated" && <details><summary>Permanent deletion</summary><div className="stack">
              <label>Type DELETE to confirm<input name="confirm" autoComplete="off" /></label>
              <button className="button danger small" name="operation" value="delete">Permanently delete</button>
            </div></details>}
          </TaskForm>
        </details>,
      },
    }))} />
  </>;
}
