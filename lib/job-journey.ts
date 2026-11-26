const origin = "https://trade-seekerz.invalid";

export function jobJourney(value: unknown) {
  if (
    typeof value !== "string" || value.length > 2048 ||
    !/^\/(?:jobs|projects\/new)(?:\?|$)/.test(value) || /[\\\u0000-\u001f]/.test(value)
  ) return null;

  const url = new URL(value, origin);
  if (url.origin !== origin || url.hash) return null;

  return {
    href: url.pathname + url.search,
    role: url.pathname === "/jobs" ? "tradesperson" : "homeowner",
  } as const;
}

export function jobJourneyLink(path: "/login" | "/register" | "/onboarding", next?: unknown) {
  const journey = jobJourney(next);
  return journey ? path + "?" + new URLSearchParams({ next: journey.href }) : path;
}
