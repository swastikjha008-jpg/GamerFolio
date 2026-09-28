import type { Game } from "../../types/models";

interface HeroCoverStackProps {
  games: Game[];
}

export function HeroCoverStack({ games }: HeroCoverStackProps) {
  const heroGames = games.slice(0, 6);

  return (
    <div aria-label="Featured real game covers" className="cover-stage" id="explore">
      <div className="cover-orbit" />
      <div className="cover-grid">
        {heroGames.map((game, index) => (
          <article className={`cover-card cover-card--${index + 1}`} key={game.id}>
            <img alt={`${game.title} cover artwork`} src={game.coverUrl} />
            <div className="cover-caption">
              <span>{game.title}</span>
              <small>{game.genres[0]}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="now-playing-panel">
        <span className="status-dot" />
        <div>
          <p>Currently playing</p>
          <strong>{heroGames[0]?.title}</strong>
        </div>
      </div>
    </div>
  );
}
