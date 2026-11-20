import Link from "next/link";
import type { Project } from "@/lib/projects";
import type { Action } from "./ui";

export function ProjectForm({ action, categories, project, invite }: {
  action: Action;
  categories: { slug: string; name: string }[];
  project?: Project;
  invite?: { id: string; business_name: string; category_slug: string | null };
}) {
  return <form action={action} className="panel stack project-form">
    {project && <input type="hidden" name="id" value={project.id} />}
    {invite && <div className="notice success"><span>Requesting <strong>{invite.business_name}</strong> for this job.</span></div>}
    <input type="hidden" name="invite" value={invite?.id || ""} />
    <h2>Job details</h2>
    <label>Job title<input name="title" placeholder="e.g. Replace a timber fence" defaultValue={project?.title} required minLength={6} maxLength={100} /></label>
    <label>Trade category<select name="category_slug" defaultValue={project?.category_slug ?? invite?.category_slug ?? ""} required>
      <option value="">Select a trade</option>{categories.map(({ slug, name }) => <option value={slug} key={slug}>{name}</option>)}
    </select></label>
    <label>Describe the work<textarea name="description" placeholder="Include scope, timing and details a tradesperson should know." rows={5} defaultValue={project?.description} required minLength={20} maxLength={3000}/></label>
    <div className="form-row">
      <label>Suburb<input name="suburb" defaultValue={project?.suburb} required minLength={2} maxLength={100} placeholder="e.g. Sandringham" /></label>
      <label>Postcode<input name="postcode" defaultValue={project?.postcode} required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" /></label>
    </div>
    <div className="form-row">
      <label>Minimum budget (NZD)<input name="budget_min" type="number" defaultValue={project?.budget_min} min={0} max={10000000} required /></label>
      <label>Maximum budget (NZD)<input name="budget_max" type="number" defaultValue={project?.budget_max} min={0} max={10000000} required /></label>
    </div>
    <div className="form-row">
      <label>Applicant limit<input name="applicant_limit" type="number" min={1} max={10} required defaultValue={project?.applicant_limit ?? (invite ? 1 : 5)} /></label>
      <label>{project?.photo_path ? "Replace job photo" : "Job photo (optional)"}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG or WebP, up to 5 MB.</small></label>
    </div>
    <div className="buttons">
      <button className="button" type="submit">{project ? "Save changes" : "Post job"}</button>
      <Link className="button secondary" href={project ? "/projects/" + project.id : "/dashboard"}>Cancel</Link>
    </div>
  </form>;
}
