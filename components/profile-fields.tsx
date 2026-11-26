"use client";

import { useId, useState } from "react";

type ProfileValues = {
  role?: "homeowner" | "tradesperson" | null;
  display_name?: string; postcode?: string; business_name?: string; bio?: string;
};

function validateTradeCategories(group: HTMLFieldSetElement | null) {
  const first = group?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  first?.setCustomValidity(group?.querySelector("input:checked") ? "" : "Choose at least one trade category.");
}

export function ProfileFields({ profile, categories, selectedCategories = [], onboarding = false }: {
  profile: ProfileValues; categories: { slug: string; name: string }[]; selectedCategories?: string[]; onboarding?: boolean;
}) {
  const [role, selectRole] = useState(profile.role || "homeowner");
  const categoryHint = useId();
  return <>
    {onboarding && <label>Account type<select name="role" value={role} onChange={(e) => selectRole(e.currentTarget.value as typeof role)}>
      <option value="homeowner">Homeowner</option><option value="tradesperson">Tradesperson</option>
    </select></label>}
    <div className="form-row">
      <label>Full name<input name="display_name" defaultValue={profile.display_name} required minLength={2} maxLength={100} autoComplete="name" /></label>
      <label>Postcode<input name="postcode" defaultValue={profile.postcode} inputMode="numeric" required pattern="[0-9]{4}" maxLength={4} autoComplete="postal-code" /></label>
    </div>
    {role === "tradesperson" ? <>
      <label>Business name<input name="business_name" defaultValue={profile.business_name} required minLength={2} maxLength={120} autoComplete="organization" /></label>
      <fieldset className="trade-category-fields" aria-describedby={categoryHint} ref={validateTradeCategories} onChange={(event) => validateTradeCategories(event.currentTarget)}>
        <legend>Trade categories</legend>
        <p id={categoryHint} className="field-note">
          {categories.length ? "Choose every trade your business offers." : "No trade categories are available right now."}
        </p>
        {categories.length > 0 && <div className="trade-category-options">
          {categories.map(({ slug, name }) => <label key={slug} className="checkbox">
            <input type="checkbox" name="category_slugs" value={slug} defaultChecked={selectedCategories.includes(slug)} />
            <span>{name}</span>
          </label>)}
        </div>}
      </fieldset>
      <label>About your business<textarea name="bio" rows={4} defaultValue={profile.bio} maxLength={1500} /></label>
    </> : <><input type="hidden" name="business_name" value="" /><input type="hidden" name="bio" value="" /></>}
  </>;
}
