"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Send } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type SubmitEvent } from "react";
import { budget } from "@/lib/format";
import type { Project } from "@/lib/projects";
import type { Action } from "./ui";

type Category = { slug: string; name: string };
type Invite = { id: string; business_name: string; category_slug: string | null };

const steps = ["Job details", "Location and budget", "Review and post"];

function JobDetails({ categories, project, invite }: {
  categories: Category[];
  project?: Project;
  invite?: Invite;
}) {
  return <>
    <label>Trade category<select name="category_slug" defaultValue={project?.category_slug ?? invite?.category_slug ?? ""} required>
      <option value="">Select a trade</option>{categories.map(({ slug, name }) => <option value={slug} key={slug}>{name}</option>)}
    </select></label>
    <label>Job title<input name="title" placeholder="e.g. Replace a timber fence" defaultValue={project?.title} required minLength={6} maxLength={100} /></label>
    <label>Describe the work<textarea name="description" placeholder="Include scope, timing and details a tradesperson should know." rows={5} defaultValue={project?.description} required minLength={20} maxLength={3000} /></label>
  </>;
}

function LocationAndBudget({ project }: { project?: Project }) {
  return <>
    <div className="form-row">
      <label>Suburb<input name="suburb" defaultValue={project?.suburb} required minLength={2} maxLength={100} placeholder="e.g. Sandringham" autoComplete="address-level2" /></label>
      <label>Postcode<input name="postcode" defaultValue={project?.postcode} required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" placeholder="e.g. 1025" autoComplete="postal-code" /></label>
    </div>
    <div className="form-row">
      <label>Minimum budget (NZD)<input name="budget_min" type="number" defaultValue={project?.budget_min} min={0} max={10000000} required /></label>
      <label>Maximum budget (NZD)<input name="budget_max" type="number" defaultValue={project?.budget_max} min={0} max={10000000} required /></label>
    </div>
  </>;
}

function ApplicantLimit({ count }: { count: number }) {
  return <label>Applicant limit<input name="applicant_limit" type="number" min={1} max={10} required defaultValue={count} /></label>;
}

function JobPhoto({ replacing = false }: { replacing?: boolean }) {
  return <label>{replacing ? "Replace job photo" : "Job photo (optional)"}
    <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
    <small>JPG, PNG or WebP, up to 5 MB.</small>
  </label>;
}

export function ProjectForm({ action, categories, project }: { action: Action; categories: Category[]; project: Project }) {
  return <form action={action} className="panel stack project-form">
    <input type="hidden" name="id" value={project.id} />
    <h2>Job details</h2>
    <JobDetails categories={categories} project={project} />
    <div className="stack job-edit-section">
      <h2>Location and budget</h2>
      <LocationAndBudget project={project} />
      <div className="form-row">
        <ApplicantLimit count={project.applicant_limit} />
        <JobPhoto replacing={Boolean(project.photo_path)} />
      </div>
    </div>
    <div className="job-post-actions">
      <Link className="button secondary" href={"/projects/" + project.id}>Cancel</Link>
      <button className="button" type="submit">Save changes</button>
    </div>
  </form>;
}

function draftSummary(form: HTMLFormElement, categories: Category[]) {
  const data = new FormData(form);
  const photo = data.get("photo");
  return {
    title: String(data.get("title")).trim(),
    description: String(data.get("description")).trim(),
    category: categories.find(({ slug }) => slug === data.get("category_slug"))?.name ?? "",
    location: String(data.get("suburb")).trim() + " " + data.get("postcode"),
    budget: budget(Number(data.get("budget_min")), Number(data.get("budget_max"))),
    applicants: String(data.get("applicant_limit")),
    photo: photo instanceof File ? photo.name : "",
  };
}

function checkStep(form: HTMLFormElement, step: number) {
  const section = form.querySelector(`[data-job-step="${step}"]`);
  const inputs = Array.from(section?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? []);
  for (const input of inputs) {
    input.setCustomValidity("");
    if (input instanceof HTMLInputElement && input.name === "budget_max") {
      const minimum = Number(form.querySelector<HTMLInputElement>('[name="budget_min"]')?.value);
      if (input.value && Number(input.value) < minimum) {
        input.setCustomValidity("Enter a maximum budget at least as high as the minimum.");
      }
    }
    if (input instanceof HTMLInputElement && input.name === "photo") {
      const file = input.files?.[0];
      if (file && (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
        input.setCustomValidity("Choose a JPG, PNG or WebP photo up to 5 MB.");
      }
    }
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      if (input.minLength > 0 && input.value && input.value.trim().length < input.minLength) {
        input.setCustomValidity(`Enter at least ${input.minLength} characters.`);
      }
    }
    if (!input.validity.valid) {
      const details = input.closest("details");
      if (details) details.open = true;
      input.reportValidity();
      return false;
    }
  }
  return true;
}

export function NewProjectForm({ action, categories, invite }: {
  action: (error: string | null, form: FormData) => Promise<string>;
  categories: Category[];
  invite?: Invite;
}) {
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<ReturnType<typeof draftSummary>>();
  const [error, submit, pending] = useActionState<string | null, FormData>(action, null);
  const activeHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);

  useEffect(() => {
    if (step !== previousStep.current) activeHeading.current?.focus();
    previousStep.current = step;
  }, [step]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    if (step < 2) {
      if (!checkStep(form, step)) return;
      if (step === 1) setSummary(draftSummary(form, categories));
      setStep(step + 1);
      return;
    }
    const data = new FormData(form);
    startTransition(() => submit(data));
  }

  return <form action={submit} onSubmit={handleSubmit} noValidate className="panel stack project-form new-project-form" aria-busy={pending}>
    <input type="hidden" name="invite" value={invite?.id ?? ""} />
    {invite && <div className="job-post-invite"><Send size={17} aria-hidden="true" /><span>Direct request to <strong>{invite.business_name}</strong></span></div>}

    <ol className="job-post-steps" aria-label="Job posting progress">
      {steps.map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined} className={index < step ? "complete" : undefined}>
        <span className="job-step-number" aria-hidden="true">{index < step ? <Check size={15} /> : index + 1}</span>
        {name}
      </li>)}
    </ol>

    <section className="stack" aria-labelledby="posting-job-details" data-job-step="0" hidden={step !== 0}>
      <h2 id="posting-job-details" ref={step === 0 ? activeHeading : undefined} tabIndex={-1}>Job details</h2>
      <JobDetails categories={categories} invite={invite} />
    </section>
    <section className="stack" aria-labelledby="posting-location" data-job-step="1" hidden={step !== 1}>
      <h2 id="posting-location" ref={step === 1 ? activeHeading : undefined} tabIndex={-1}>Location and budget</h2>
      <LocationAndBudget />
      <JobPhoto />
      <details className="job-post-options">
        <summary>More listing options <ChevronDown size={16} aria-hidden="true" /></summary>
        <ApplicantLimit count={invite ? 1 : 5} />
      </details>
    </section>
    <section className="stack" aria-labelledby="posting-review" hidden={step !== 2}>
      <h2 id="posting-review" ref={step === 2 ? activeHeading : undefined} tabIndex={-1}>Review your job</h2>
      {summary && <>
        <div className="job-post-preview">
          <div className="section-head">
            <span className="tag">{summary.category}</span>
            <button className="button secondary small" type="button" onClick={() => setStep(0)} disabled={pending}>Edit job details</button>
          </div>
          <h3>{summary.title}</h3>
          <p className="detail-copy">{summary.description}</p>
        </div>
        <div className="job-post-preview">
          <div className="section-head">
            <h3>Listing details</h3>
            <button className="button secondary small" type="button" onClick={() => setStep(1)} disabled={pending}>Edit listing details</button>
          </div>
          <dl>
            <div><dt>Location</dt><dd>{summary.location}</dd></div>
            <div><dt>Budget</dt><dd>{summary.budget}</dd></div>
            <div><dt>Applicant limit</dt><dd>{summary.applicants}</dd></div>
            {summary.photo && <div><dt>Photo</dt><dd>{summary.photo}</dd></div>}
          </dl>
        </div>
      </>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </section>

    <div className="job-post-actions">
      {step > 0
        ? <button className="button secondary" type="button" onClick={() => setStep(step - 1)} disabled={pending}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        : <Link className="button secondary" href="/dashboard">Cancel</Link>}
      <button className="button" type="submit" disabled={pending}>
        {step < 2 ? <>Continue <ArrowRight size={16} aria-hidden="true" /></> : pending ? "Posting job…" : "Post job"}
      </button>
    </div>
  </form>;
}
