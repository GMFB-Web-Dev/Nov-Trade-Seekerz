import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { HeaderNavigation } from "./header-navigation";

const postJob = { href: "/projects/new", label: "Post a job" };
const findJobs = { href: "/jobs", label: "Find jobs" };
const directory = { href: "/trades", label: "Find a tradie" };
const messages = { href: "/messages", label: "Messages" };
const publicLinks = [directory, findJobs, { href: "/how-it-works", label: "How it works" }];

export async function SiteHeader() {
  const viewer = await getViewer();
  const profile = viewer?.profile;
  const active = profile?.status === "active";
  const ready = active && Boolean(profile.onboarded_at);
  const tradie = ready && profile.role === "tradesperson";
  const primary = tradie ? findJobs : postJob;
  const links = ready ? [
    { href: "/dashboard", label: tradie ? "My applications" : "My jobs" },
    tradie ? findJobs : directory,
    messages,
  ] : publicLinks;
  const account = viewer ? [
    ...(active && !ready ? [{ href: "/onboarding", label: "Finish setup" }] : []),
    { href: "/account", label: "Account settings" },
    ...(tradie ? [{ href: "/billing", label: "Tokens and membership" }] : []),
    ...(viewer.admin ? [{ href: "/admin", label: "Admin workspace" }] : []),
  ] : [];

  return <header className="site-header">
    <div className="container site-header-inner">
      <Link className="brand" href="/" aria-label="Trade Seekerz home">
        <Image src="/images/logo.png" width={136} height={44} alt="Trade Seekerz" priority />
      </Link>
      <HeaderNavigation links={links} primary={primary} account={account} unreadUserId={ready ? viewer?.user.id : undefined} />
    </div>
  </header>;
}
