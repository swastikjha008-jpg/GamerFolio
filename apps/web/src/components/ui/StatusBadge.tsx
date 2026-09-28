import {
  CheckCircle2,
  Eye,
  Heart,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { UserGameStatus } from "@/types/models";

const config = {
  playing: { label: "Playing", icon: PlayCircle },
  completed: { label: "Completed", icon: Trophy },
  played: { label: "Played", icon: CheckCircle2 },
  watched: { label: "Watched", icon: Eye },
  dropped: { label: "Dropped", icon: PauseCircle },
  wishlist: { label: "Wishlist", icon: Sparkles },
};

export function StatusBadge({
  status,
  favorite = false,
}: {
  status: UserGameStatus;
  favorite?: boolean;
}) {
  const { label, icon: Icon } = config[status];

  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon size={14} />
      {label}
      {favorite ? <Heart className="status-heart" size={13} fill="currentColor" /> : null}
    </span>
  );
}
