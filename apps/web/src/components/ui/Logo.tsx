import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="GamerFolio home" className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        <span className="logo-core">GF</span>
        <span className="logo-ring" />
      </span>
      {!compact ? <span>GamerFolio</span> : null}
    </Link>
  );
}
