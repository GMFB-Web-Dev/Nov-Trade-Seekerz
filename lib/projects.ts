import "server-only";
import { z } from "zod";
import { db } from "./supabase";
import type { Tables } from "./database.types";

export type Project = Tables<"projects">;
export type Application = Tables<"applications">;
export type Quote = Tables<"quotes">;
export type Message = Tables<"messages">;

export const uuid = z.uuid();

export async function loadCategories() {
  const client = await db();
  const result = await client.from("categories").select("slug,name").eq("active", true).order("sort_order").order("name");
  if (result.error) throw new Error("Could not load trade categories.");
  return result.data;
}

export async function projectImage(project: Project) {
  if (!project.photo_path) return null;
  const client = await db();
  const { data } = await client.storage.from("project-photos").createSignedUrl(project.photo_path, 300);
  return data?.signedUrl ?? null;
}
