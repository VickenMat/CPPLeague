/** Preserve complete Unicode characters when team names contain emoji. */
export function teamInitials(text?: string) {
  const parts = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  const first = Array.from(parts[0])[0] || "";
  const last =
    parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || "" : "";
  return (first + last).toUpperCase();
}
