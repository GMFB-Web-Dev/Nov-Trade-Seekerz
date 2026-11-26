const directory = "/trades";
const origin = "https://directory.invalid";

export function directoryPath(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return params.size ? directory + "?" + params : directory;
}

export function backToDirectory(from: string) {
  if (from.length > 1800 || (from !== directory && !from.startsWith(directory + "?")) || /[\\\u0000-\u001f]/.test(from)) return directory;
  const url = new URL(from, origin);
  return url.origin === origin && url.pathname === directory ? url.pathname + url.search : directory;
}

export function tradeInitials(name: string) {
  const words = name.trim().split(/\s+/u);
  return words.slice(0, 2).map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase("en-NZ") || "TS";
}
