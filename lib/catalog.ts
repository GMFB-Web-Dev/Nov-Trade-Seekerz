export const trades = [
  { slug: "builders", name: "Builders" },
  { slug: "landscaping", name: "Landscaping" },
  { slug: "handyman", name: "Handyman" },
  { slug: "plumbing", name: "Plumbing" },
  { slug: "flooring", name: "Flooring" },
  { slug: "roofing", name: "Roofing" },
  { slug: "electrical", name: "Electrical" },
  { slug: "painting", name: "Painting" },
] as const;

export function tradeLabel(slug: string) {
  return trades.find((item) => item.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

export function tradeImage(slug: string) {
  return "/images/" + (trades.some((item) => item.slug === slug) ? slug : "builders") + ".webp";
}
