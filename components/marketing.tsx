import Image from "next/image";
import type { ReactNode } from "react";

export function Cover({ title, image, children }: { title: string; image: string; children?: ReactNode }) {
  return <section className="cover"><Image src={image} fill sizes="100vw" alt="" priority /><div className="container"><h1>{title}</h1>{children}</div></section>;
}
