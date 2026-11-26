import Image from "next/image";
import type { ReactNode } from "react";

export function AuthPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <div className="market-surface"><div className="container auth-page page">
    <div className="auth-shell">
      <section className="auth-content">
        <div className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div></div>
        {children}
      </section>
      <div className="auth-art">
        <Image src="/images/how-it-works-tradies-cover.webp" fill sizes="(max-width: 740px) 0px, 45vw" alt="" />
      </div>
    </div>
  </div></div>;
}
