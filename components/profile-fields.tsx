"use client";

import { useState } from "react";

type ProfileValues = {
  role?: "homeowner" | "tradesperson" | null;
  display_name?: string; postcode?: string; business_name?: string; category_slug?: string | null; bio?: string;
};

export function ProfileFields({ profile, categories, onboarding = false }: {
  profile: ProfileValues; categories: { slug: string; name: string }[]; onboarding?: boolean;
}) {
  const [role, selectRole] = useState(profile.role || "homeowner");
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
      <label>Trade category<select name="category_slug" defaultValue={profile.category_slug ?? ""} required>
        <option value="">Choose a category</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
      </select></label>
      <label>About your business<textarea name="bio" rows={4} defaultValue={profile.bio} maxLength={1500} /></label>
    </> : <><input type="hidden" name="business_name" value="" /><input type="hidden" name="category_slug" value="" /><input type="hidden" name="bio" value="" /></>}
  </>;
}
