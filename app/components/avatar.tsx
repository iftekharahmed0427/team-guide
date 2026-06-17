// Round user avatar. Shows the Discord profile picture when available
// (Better Auth stores it on `user.image`), falling back to initials.
// Plain <img> (not next/image) to avoid remote-domain config for tiny thumbs.

function initialsOf(source?: string | null): string {
  const s = (source ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function Avatar({
  name,
  image,
  size = 32,
  className = "",
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const dims = { height: size, width: size };

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? "Member"}
        title={name ?? undefined}
        style={dims}
        className={`shrink-0 rounded-full border border-border object-cover ${className}`}
      />
    );
  }

  return (
    <span
      title={name ?? undefined}
      style={{ ...dims, fontSize: Math.max(9, Math.round(size * 0.38)) }}
      className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-semibold leading-none ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
