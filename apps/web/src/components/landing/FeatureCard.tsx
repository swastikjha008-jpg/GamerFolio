import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  description: string;
  icon: LucideIcon;
  title: string;
}

export function FeatureCard({ description, icon: Icon, title }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <span className="feature-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
