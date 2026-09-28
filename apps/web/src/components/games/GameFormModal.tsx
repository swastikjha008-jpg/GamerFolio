"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Game, UserGameStatus, UserGameWithGame } from "@/types/models";

const statusOptions: UserGameStatus[] = [
  "playing",
  "played",
  "completed",
  "watched",
  "dropped",
  "wishlist",
];

export type GameFormValue = {
  gameId: string;
  status: UserGameStatus;
  hoursPlayed: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  rating?: number;
  favorite: boolean;
  notes?: string;
  completionPercentage?: number;
};

export function GameFormModal({
  game,
  entry,
  onClose,
  onSubmit,
}: {
  game?: Game;
  entry?: UserGameWithGame;
  onClose: () => void;
  onSubmit: (value: GameFormValue) => void;
}) {
  const targetGame = game ?? entry?.game;
  const [form, setForm] = useState<GameFormValue>({
    gameId: targetGame?.id ?? "",
    status: entry?.status ?? "playing",
    hoursPlayed: entry?.hoursPlayed ?? 0,
    achievementsUnlocked: entry?.achievementsUnlocked ?? 0,
    achievementsTotal: entry?.achievementsTotal ?? 50,
    rating: entry?.rating,
    favorite: entry?.favorite ?? false,
    notes: entry?.notes ?? "",
    completionPercentage: entry?.completionPercentage,
  });

  useEffect(() => {
    if (targetGame) {
      setForm((current) => ({ ...current, gameId: targetGame.id }));
    }
  }, [targetGame]);

  if (!targetGame) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="game-modal" role="dialog">
        <button aria-label="Close modal" className="modal-close" onClick={onClose} type="button">
          <X size={20} />
        </button>
        <div className="modal-cover">
          <img alt={`${targetGame.title} cover`} src={targetGame.coverUrl} />
        </div>
        <form
          className="game-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
            onClose();
          }}
        >
          <p className="eyebrow">{entry ? "Update game" : "Add to library"}</p>
          <h2>{targetGame.title}</h2>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as UserGameStatus })
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Hours Played
              <input
                min={0}
                onChange={(event) =>
                  setForm({ ...form, hoursPlayed: Number(event.target.value) })
                }
                type="number"
                value={form.hoursPlayed}
              />
            </label>
            <label>
              Achievements
              <span className="split-input">
                <input
                  min={0}
                  onChange={(event) =>
                    setForm({ ...form, achievementsUnlocked: Number(event.target.value) })
                  }
                  type="number"
                  value={form.achievementsUnlocked}
                />
                <input
                  min={0}
                  onChange={(event) =>
                    setForm({ ...form, achievementsTotal: Number(event.target.value) })
                  }
                  type="number"
                  value={form.achievementsTotal}
                />
              </span>
            </label>
            <label>
              Rating
              <select
                value={form.rating ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rating: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Completion %
              <input
                max={100}
                min={0}
                onChange={(event) =>
                  setForm({
                    ...form,
                    completionPercentage: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                type="number"
                value={form.completionPercentage ?? ""}
              />
            </label>
          </div>
          <label>
            Personal Note
            <textarea
              maxLength={180}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="One of my favorite horror games."
              value={form.notes ?? ""}
            />
          </label>
          <label className="toggle-row">
            <input
              checked={form.favorite}
              onChange={(event) => setForm({ ...form, favorite: event.target.checked })}
              type="checkbox"
            />
            Mark as favorite
          </label>
          <Button type="submit">{entry ? "Save Changes" : "Add to My Games"}</Button>
        </form>
      </section>
    </div>
  );
}
