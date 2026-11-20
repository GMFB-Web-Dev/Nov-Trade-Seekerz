import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { tradeImage, tradeLabel } from "@/lib/catalog";
import { budget, shortDate } from "@/lib/format";
import type { Project } from "@/lib/projects";
import { Tag } from "./ui";

export function ProjectCard({ project, applicants, photo }: { project: Project; applicants?: number; photo?: string | null }) {
  return <article className="project-card">
    <Link className="project-thumb" href={"/projects/" + project.id} tabIndex={-1} aria-hidden="true">
      <Image src={photo ?? tradeImage(project.category_slug)} alt="" fill sizes="(max-width: 600px) 90vw, 260px" unoptimized={Boolean(photo)} />
    </Link>
    <div className="project-card-content">
      <div className="chips"><Tag value={tradeLabel(project.category_slug)} /><Tag value={project.status} />
        {project.invited_tradesperson_id && <Tag value="Direct request" tone="neutral" />}</div>
      <h2><Link href={"/projects/" + project.id}>{project.title}</Link></h2>
      <p className="location"><MapPin size={15} /> {project.suburb} {project.postcode}</p>
      <p className="clamp">{project.description}</p>
      <div className="card-tail"><strong>{budget(project.budget_min, project.budget_max)}</strong>{applicants !== undefined && <span>{applicants} of {project.applicant_limit} applicants</span>}<time>{shortDate(project.created_at)}</time></div>
    </div>
    <Link className="project-arrow" href={"/projects/" + project.id} aria-label={"View " + project.title}><ArrowRight size={19} /></Link>
  </article>;
}
