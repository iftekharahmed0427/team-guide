// All user-facing times render in US Eastern (America/New_York) so the team sees
// one consistent clock regardless of where the app is served or viewed. The zone
// handles DST automatically, and `formatDateTime` self-labels EST/EDT. Date-only
// values (e.g. a renewal date "YYYY-MM-DD") must NOT pass through here — they have
// no time and would shift across the boundary; format those literally.
const TZ = "America/New_York";

export function formatDate(d: Date | string | number): string {
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | number): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
