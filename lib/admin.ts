import {
  BadgeCheck, Bell, BriefcaseBusiness, ClipboardList, CreditCard, FileWarning, Flag, LayoutDashboard, ListChecks, Mail, ReceiptText,
  Settings, Shield, ShieldOff, Star, Users,
} from "lucide-react";
import { param, type Query } from "./format";

export const sections = [
  { slug: "", name: "Overview", Icon: LayoutDashboard },
  { slug: "users", name: "Users", Icon: Users },
  { slug: "banned", name: "Banned users", Icon: ShieldOff },
  { slug: "admins", name: "Admin access", Icon: Shield },
  { slug: "projects", name: "Jobs", Icon: BriefcaseBusiness },
  { slug: "applications", name: "Applications", Icon: ClipboardList },
  { slug: "quotes", name: "Quotes", Icon: ReceiptText },
  { slug: "credentials", name: "Trade documents", Icon: BadgeCheck },
  { slug: "categories", name: "Categories", Icon: ListChecks },
  { slug: "reviews", name: "Reviews", Icon: Star },
  { slug: "reports", name: "Reports", Icon: Flag },
  { slug: "support", name: "Support inbox", Icon: Mail },
  { slug: "subscriptions", name: "Subscriptions", Icon: CreditCard },
  { slug: "billing", name: "Billing orders", Icon: BadgeCheck },
  { slug: "errors", name: "Error logs", Icon: FileWarning },
  { slug: "audit", name: "Audit history", Icon: Bell },
  { slug: "settings", name: "Settings", Icon: Settings },
] as const;

export const adminPageSize = 15;

export function adminFilter(query: Query) {
  const q = param(query.q).replace(/[^\p{L}\p{N}@.+_ -]/gu, "").trim().slice(0, 80);
  const state = param(query.state).replace(/[^a-z_]/g, "").slice(0, 25);
  const page = Math.max(1, Math.min(500, Math.floor(Number(param(query.page)) || 1)));
  const first = (page - 1) * adminPageSize;
  const last = first + adminPageSize - 1;
  return { q, state, page, first, last };
}

export type AdminFilter = ReturnType<typeof adminFilter>;
