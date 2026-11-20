import Image from "next/image";
import Link from "next/link";

const links = [
  { title: "Homeowners", links: [["Post a job", "/projects/new"], ["Find a tradesperson", "/trades"], ["How it works", "/how-it-works"]] },
  { title: "Tradespeople", links: [["Browse jobs", "/jobs"], ["Trade memberships", "/billing"], ["Join Trade Seekerz", "/register?role=tradesperson"]] },
  { title: "Trade Seekerz", links: [["About us", "/about"], ["Contact us", "/contact"], ["Sign in", "/login"]] },
];

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div><Link href="/" aria-label="Trade Seekerz home"><Image src="/images/logo-footer.png" alt="Trade Seekerz" width={140} height={44} /></Link>
        <p>Connecting homeowners and tradespeople across Aotearoa New Zealand.</p></div>
      {links.map((column) => <div key={column.title}>
        <h2>{column.title}</h2>
        {column.links.map(([name, href]) => <Link key={href} href={href}>{name}</Link>)}
      </div>)}
    </div>
    <div className="container footer-tail"><span>© {new Date().getFullYear()} Trade Seekerz</span>
      <div><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms and Conditions</Link></div>
    </div>
  </footer>;
}
