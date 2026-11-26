import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { tradeImage, tradeLabel } from "@/lib/catalog";
import { budget, shortDate } from "@/lib/format";
import type { Application, Project } from "@/lib/projects";
import { Tag } from "./ui";

export function ProjectCard({ project, applicants, photo, href = "/projects/" + project.id, applicationStatus, appliedAt }: {
  project: Project;
  applicants?: number;
  photo?: string | null;
  href?: string;
  applicationStatus?: Application["status"];
  appliedAt?: string;
}) {
  const date = appliedAt ?? project.created_at;
  return <article className="panel listing-card">
    <div className="listing-thumbnail">
      <Image src={photo ?? tradeImage(project.category_slug)} alt="" fill sizes="(max-width: 620px) 72px, 128px" unoptimized={Boolean(photo)} />
    </div>
    <div className="listing-content">
      <div className="chips">
        <Tag value={tradeLabel(project.category_slug)} tone="neutral" />
        {applicationStatus
          ? <Tag value={"Application " + applicationStatus} tone={applicationStatus === "pending" ? "blue" : applicationStatus === "awarded" ? "good" : "neutral"} />
          : <Tag value={project.status} />}
        {project.invited_tradesperson_id && <Tag value="Direct request" tone="neutral" />}
      </div>
      <h3><Link href={href}>{project.title}</Link></h3>
      <p className="location"><MapPin size={15} aria-hidden="true" /> {project.suburb} {project.postcode}</p>
      <p className="clamp">{project.description}</p>
    </div>
    <div className="listing-meta">
      <strong>{budget(project.budget_min, project.budget_max)}</strong>
      <time dateTime={date}>{appliedAt ? "Applied " : "Posted "}{shortDate(date)}</time>
      {applicants !== undefined && <span>{applicants} of {project.applicant_limit} applicants</span>}
    </div>
    <ArrowRight className="listing-arrow" size={18} aria-hidden="true" />
  </article>;
}
