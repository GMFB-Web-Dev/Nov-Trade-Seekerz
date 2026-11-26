"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="market-surface"><div className="container narrow page"><div className="panel stack">
    <h1>Something went wrong</h1><p>We couldn’t load this page. Please try again.</p>
    <div className="buttons"><button className="button" type="button" onClick={reset}>Try again</button>
      <Link href="/" className="button secondary">Go home</Link></div>
  </div></div></div>;
}
