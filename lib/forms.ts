import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "./database.types";
import { withNotice } from "./format";
import { db } from "./supabase";
import { operationalError } from "./ops";

export const idSchema = z.uuid();
export const slugSchema = z.string().trim().regex(/^[a-z0-9-]{2,60}$/);
export const postcode = z.string().trim().regex(/^\d{4}$/, "Enter a four-digit NZ postcode.");
export const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
export const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export function failure(path: string, message = "Check the form fields and try again."): never {
  redirect(withNotice(path, "error", message));
}

export function parse<T extends z.ZodType>(schema: T, form: FormData, path: string): z.output<T> {
  const result = schema.safeParse(Object.fromEntries(form.entries()));
  if (!result.success) failure(path);
  return result.data;
}

export function safePath(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

export async function mutate(command: string, args: Record<string, Json | undefined>, back: string) {
  const client = await db();
  const result = await client.rpc("market_action", { command, args });
  if (result.error) {
    const message = result.error.code === "P0001" ? result.error.message : "Could not save this change. Check the fields and try again.";
    if (result.error.code !== "P0001") await operationalError("market-" + command, result.error.code);
    failure(back, message);
  }
  return result.data;
}
