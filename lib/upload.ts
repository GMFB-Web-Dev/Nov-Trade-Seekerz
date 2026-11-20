import "server-only";

export async function fileExtension(file: File, pdf = false) {
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return null;
  const bytes = Buffer.from(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
  if (file.type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (file.type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (pdf && file.type === "application/pdf" && bytes.toString("ascii", 0, 5) === "%PDF-") return "pdf";
  return null;
}
