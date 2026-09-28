"use client";

import { Heart, Plus, Star } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Game, UserGameWithGame } from "@/types/models";

export function LibraryGameCard({
  entry,
  onEdit,
}: {
  entry: UserGameWithGame;
  onEdit?: (entry: UserGameWithGame) => void;
}) {
  return (
    <article className="game-card">
      <Link href={`/games/${entry.game.slug}`} className="cover-link">
        <img alt={`${entry.game.title} cover`} src={entry.game.coverUrl} />
      </Link>
      <div className="game-card-body">
        <div className="game-title-row">
          <h3>{entry.game.title}</h3>
          {entry.favorite ? <Heart size={18} fill="currentColor" /> : null}
        </div>
        <StatusBadge favorite={entry.favorite} status={entry.status} />
        <div className="game-meta-grid">
          <span>{entry.hoursPlayed}h</span>
          <span>{entry.achievementsUnlocked}/{entry.achievementsTotal} trophies</span>
          <span>{entry.rating ? `${entry.rating}/5 stars` : "No rating"}</span>
        </div>
        {onEdit ? (
          <button className="text-button" onClick={() => onEdit(entry)} type="button">
            Edit
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function ExploreGameCard({
  game,
  onAdd,
}: {
  game: Game;
  onAdd: (game: Game) => void;
}) {
  return (
    <article className="explore-game-card">
      <Link href={`/games/${game.slug}`}>
        <img alt={`${game.title} cover`} src={game.coverUrl} />
      </Link>
      <div>
        <p>{game.releaseDate.slice(0, 4)} • {game.genres.slice(0, 2).join(" / ")}</p>
        <h3>{game.title}</h3>
        <button onClick={() => onAdd(game)} type="button">
          <Plus size={16} />
          Add
        </button>
      </div>
    </article>
  );
}

export function RatingStars({ value }: { value?: number }) {
  return (
    <span className="rating-stars" aria-label={value ? `${value} out of 5` : "No rating"}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={15} fill={value && index < value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}
