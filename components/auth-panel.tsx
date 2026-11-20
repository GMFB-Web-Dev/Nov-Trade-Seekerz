import Image from "next/image";
import type { ReactNode } from "react";

export function AuthPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <div className="container auth-shell">
    <div className="auth-art" aria-hidden="true"><Image src="/images/how-it-works-tradies-cover.webp" fill sizes="45vw" alt="" /></div>
    <section className="auth-content">
      <h1>{title}</h1>{description && <p>{description}</p>}
      {children}
    </section>
  </div>;
}
