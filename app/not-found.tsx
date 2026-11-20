import Link from "next/link";

export default function NotFound() {
  return <div className="container narrow page"><div className="panel stack">
    <h1>Page unavailable</h1><p>This page may have moved, or your account may not have access.</p>
    <Link href="/" className="button">Back to Trade Seekerz</Link>
  </div></div>;
}
