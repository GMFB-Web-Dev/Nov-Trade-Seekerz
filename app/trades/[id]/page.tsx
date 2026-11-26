import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { ReportForm } from "@/components/report-form";
import { Back, Empty, Notice, PageTitle, Tag } from "@/components/ui";
import { tradeLabel } from "@/lib/catalog";
import { param, shortDate, type Query } from "@/lib/format";
import { uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { getViewer } from "@/lib/viewer";
import { backToDirectory, tradeInitials } from "../directory-path";

export default async function TradeProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const client = await db();
  const [trade, feedback, viewer] = await Promise.all([
    client.from("profiles").select("display_name,business_name,category_slug,bio,postcode,categories(name)")
      .eq("id", id).eq("role", "tradesperson").eq("status", "active").not("onboarded_at", "is", null).maybeSingle(),
    client.from("reviews").select("id,rating,body,created_at", { count: "exact" }).eq("tradesperson_id", id)
      .eq("visible", true).order("created_at", { ascending: false }).limit(25),
    getViewer(),
  ]);
  if (!trade.data) notFound();
  const profile = trade.data;
  const name = profile.business_name || profile.display_name;
  const active = viewer?.profile?.status === "active";
  const canRequest = !viewer || (active && (!viewer.profile?.onboarded_at || viewer.profile.role === "homeowner"));
  const canReport = active && viewer.profile?.onboarded_at && viewer.user.id !== id;
  const reviews = feedback.data ?? [];
  const total = feedback.count ?? reviews.length;
  const category = profile.category_slug ? profile.categories?.name ?? tradeLabel(profile.category_slug) : null;
  const from = backToDirectory(param(query.from));

  return <div className="market-surface"><div className="container page directory-page">
    <Back to={from}>{from === "/trades" ? "Find a tradesperson" : "Back to results"}</Back>
    <PageTitle title={name} description={name !== profile.display_name ? profile.display_name : undefined}
      action={canRequest ? <Link href={"/projects/new?invite=" + id} className="button">Request this tradesperson</Link>
        : viewer?.user.id === id && <Link href="/account#profile" className="button secondary">Edit profile</Link>} />
    <Notice query={query} />
    <div className="trade-profile-layout">
      <aside className="panel stack trade-profile-summary" aria-labelledby="business-details">
        <span className="trade-avatar" aria-hidden="true">{tradeInitials(name)}</span>
        <h2 id="business-details">Business details</h2>
        <div className="chips">{category && <Tag value={category} />}
          {profile.postcode && <span className="location"><MapPin size={16} aria-hidden="true" /> {profile.postcode}</span>}
        </div>
        {total > 0 && <a className="inline-link" href="#trade-reviews">{total} {total === 1 ? "completed job review" : "completed job reviews"}</a>}
        {canReport && <ReportForm routeId={id} subjectId={id} kind="tradesperson" title="Report profile" />}
      </aside>
      <div className="member-section-stack">
        <section className="panel stack">
          <h2>About the business</h2>
          <p className="detail-copy">{profile.bio || "This tradesperson hasn’t added a business description yet."}</p>
        </section>
        <section id="trade-reviews" className="panel stack member-section">
          <h2>Reviews from completed jobs</h2>
          {reviews.length ? <>
            {total > reviews.length && <p className="field-note">Showing the latest {reviews.length} of {total} reviews.</p>}
            <div className="trade-review-list">{reviews.map((review) => <article className="trade-review" key={review.id}>
              <div className="section-head"><span className="rating"><Star size={16} aria-hidden="true" /> {review.rating} / 5</span>
                <time dateTime={review.created_at}>{shortDate(review.created_at)}</time></div>
              <p className="detail-copy">{review.body}</p>
              {canReport && <ReportForm routeId={id} subjectId={review.id} kind="review" title="Report review" />}
            </article>)}</div>
          </> : <Empty title="No reviews yet" />}
        </section>
      </div>
    </div>
  </div></div>;
}
