import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { ReportForm } from "@/components/report-form";
import { Back, Empty, Notice, PageTitle, Tag } from "@/components/ui";
import { tradeLabel } from "@/lib/catalog";
import { shortDate, type Query } from "@/lib/format";
import { uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { getViewer } from "@/lib/viewer";

export default async function TradeProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const client = await db();
  const [trade, feedback, viewer] = await Promise.all([
    client.from("profiles").select("*,categories(name)").eq("id", id).eq("role","tradesperson").eq("status","active").not("onboarded_at","is",null).maybeSingle(),
    client.from("reviews").select("id,rating,body,created_at").eq("tradesperson_id", id).eq("visible", true).order("created_at", { ascending: false }).limit(25),
    getViewer(),
  ]);
  if (!trade.data) notFound();
  const profile = trade.data;
  const name = profile.business_name || profile.display_name;
  const homeowner = viewer?.profile?.status === "active" && viewer.profile.role === "homeowner" && viewer.profile.onboarded_at;
  const canReport = viewer?.profile?.status === "active" && viewer.profile.onboarded_at && viewer.user.id !== id;
  return <div className="market-surface"><div className="container narrow page">
    <Back to="/trades">Find a trade</Back>
    <PageTitle title={name} description={profile.display_name}
      action={homeowner ? <Link href={"/projects/new?invite=" + id} className="button">Request this tradesperson</Link>
      : !viewer && <Link href="/register" className="button">Create a homeowner account</Link>} />
    <Notice query={await searchParams} />
    <section className="panel stack">
      <div className="chips">{profile.category_slug && <Tag value={profile.categories?.name || tradeLabel(profile.category_slug)} />}
        <span className="location"><MapPin size={16} /> NZ {profile.postcode}</span></div>
      <h2>About the business</h2>
      <p className="detail-copy">{profile.bio || "This tradesperson hasn’t added a business description yet."}</p>
      {canReport && <ReportForm routeId={id} subjectId={id} kind="tradesperson" title="Report profile" />}
    </section>
    <section className="panel stack"><h2>Reviews from completed jobs</h2>
      {feedback.data?.length ? feedback.data.map((review) => <article className="application-card" key={review.id}>
        <div className="review-header"><span className="rating"><Star size={17} />{review.rating} / 5</span><time>{shortDate(review.created_at)}</time></div>
        <p className="detail-copy">{review.body}</p>
        {canReport && <ReportForm routeId={id} subjectId={review.id} kind="review" title="Report review" />}
      </article>) : <Empty title="No reviews yet" />}
    </section>
  </div></div>;
}
