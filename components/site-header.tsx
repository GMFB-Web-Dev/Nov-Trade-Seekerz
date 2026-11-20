import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, LayoutGrid, Menu, MessageSquare, Plus, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { getViewer } from "@/lib/viewer";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/projects/new", label: "Post a Job" },
  { href: "/how-it-works#tradespeople", label: "For Tradespeople" },
  { href: "/how-it-works", label: "How it Works" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const tradesperson = viewer?.profile?.role === "tradesperson";
  const active = viewer?.profile?.status === "active" && viewer.profile.onboarded_at;
  const memberLinks = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
    tradesperson
      ? { href: "/jobs", label: "Get Jobs", Icon: BriefcaseBusiness }
      : { href: "/projects/new", label: "Post a Job", Icon: Plus },
    tradesperson
      ? { href: "/billing", label: "Tokens", Icon: Wallet }
      : { href: "/trades", label: "Find a Trade", Icon: ClipboardList },
    { href: "/messages", label: "Messages", Icon: MessageSquare },
  ];

  const navigation = active
    ? memberLinks.map(({ href, label, Icon }) => <Link href={href} key={href}><Icon size={17} />{label}</Link>)
    : publicLinks.map(({ href, label }) => <Link href={href} key={href}>{label}</Link>);

  const account = viewer ? <>
    {viewer.admin && <Link className="account-link" href="/admin"><ShieldCheck size={17} /> Admin</Link>}
    <Link className="account-link" href="/account"><UserRound size={17} /> Account</Link>
  </> : <><Link href="/login">Login</Link><Link className="button small" href="/register">Get Started Now</Link></>;

  return <header className={"site-header " + (active ? "member-header" : "")}>
    <Link className="brand" href="/" aria-label="Trade Seekerz home">
      <Image src="/images/logo.png" width={122} height={40} alt="Trade Seekerz" priority />
    </Link>
    <nav className="desktop-nav" aria-label="Main navigation">{navigation}</nav>
    <div className="desktop-nav header-account">{account}</div>
    <details className="mobile-menu">
      <summary aria-label="Open navigation"><Menu size={23} /></summary>
      <nav aria-label="Mobile navigation">{navigation}{account}</nav>
    </details>
  </header>;
}
