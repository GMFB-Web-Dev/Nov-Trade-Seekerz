export const money = new Intl.NumberFormat("en-NZ", {
  style: "currency", currency: "NZD", maximumFractionDigits: 2,
});

export function dollars(cents: number) {
  return money.format(cents / 100).replace(/\.00$/, "");
}

export function budget(min: number, max: number) {
  return min === max ? dollars(min * 100) : dollars(min * 100) + " – " + dollars(max * 100);
}

export function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeZone: "Pacific/Auckland" }).format(new Date(date));
}

export function label(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export type Query = Record<string, string | string[] | undefined>;

export function withNotice(path: string, kind: "error" | "success", message: string) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set(kind, message);
  return url.pathname + url.search;
}
