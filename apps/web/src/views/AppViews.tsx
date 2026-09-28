"use client";

import {
  Bell,
  CheckCircle2,
  Clock,
  Gamepad2,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useApp } from "@/components/providers/AppProviders";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { ExploreGameCard, LibraryGameCard, RatingStars } from "@/components/games/GameCard";
import { GameFormModal, type GameFormValue } from "@/components/games/GameFormModal";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { activities as mockActivities, conversations, users } from "@/data/mockAppData";
import { featuredGames } from "@/data/mockGames";
import { gameService } from "@/services/gameService";
import type { Game, UserGameWithGame } from "@/types/models";

export function AuthPage() {
  const { signInWithGoogle } = useApp();
  const [loading, setLoading] = useState(false);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Logo />
        <p className="eyebrow">Secure frontend flow</p>
        <h1>Create your GamerFolio</h1>
        <p>
          Continue with Google to start your profile setup. Your session is
          securely handed to the connected GamerFolio API.
        </p>
        <GoogleButton
          loading={loading}
          onCredential={async (credential) => {
            setLoading(true);
            await signInWithGoogle(credential);
          }}
        />
        {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
          <p className="auth-hint">Demo mode is active until Google OAuth is configured.</p>
        ) : null}
        <Link className="back-link" href="/">
          Back to landing page
        </Link>
      </section>
    </main>
  );
}

export function SetupPage() {
  const { user, completeSetup } = useApp();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [form, setForm] = useState({
    name: user.name,
    username: `@${user.username}`,
    bio: user.bio ?? "",
    steamId: user.steamId ?? "",
    epicGamesId: user.epicGamesId ?? "",
  });

  return (
    <ProtectedRoute>
      <main className="setup-page">
        <section className="setup-panel">
          <div>
            <Logo />
            <p className="eyebrow">First-time setup</p>
            <h1>Build the identity your library deserves.</h1>
            <p>
              Keep it quick: name, GamerFolio ID, avatar, optional gaming
              accounts, and a short profile line.
            </p>
          </div>
          <form
            className="setup-form"
            onSubmit={(event) => {
              event.preventDefault();
              completeSetup({ ...form, avatarUrl });
            }}
          >
            <AvatarPicker selected={avatarUrl} onChange={setAvatarUrl} />
            <div className="form-grid">
              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                GamerFolio ID
                <input
                  required
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                />
              </label>
              <label>
                Steam ID
                <input
                  value={form.steamId}
                  onChange={(event) => setForm({ ...form, steamId: event.target.value })}
                />
              </label>
              <label>
                Epic Games ID
                <input
                  value={form.epicGamesId}
                  onChange={(event) => setForm({ ...form, epicGamesId: event.target.value })}
                />
              </label>
            </div>
            <label>
              Short Bio
              <textarea
                maxLength={140}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </label>
            <Button type="submit">Create My GamerFolio</Button>
          </form>
        </section>
      </main>
    </ProtectedRoute>
  );
}

export function DashboardPage() {
  const { user, userGames } = useApp();
  const stats = getStats(userGames);
  const playing = userGames.filter((entry) => entry.status === "playing");

  return (
    <AppShell title="Home">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Hey, {user.displayName}.</h2>
          <p>What are you playing right now?</p>
          <Button href="/my-games">Open My Games</Button>
        </div>
        <img alt={`${user.displayName} avatar`} src={user.avatarUrl} />
      </section>
      <StatsGrid stats={stats} />
      <section className="content-section">
        <SectionHeader title="Currently Playing" actionHref="/explore" actionLabel="Explore" />
        <div className="library-grid compact">
          {playing.map((entry) => (
            <LibraryGameCard entry={entry} key={entry.id} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export function MyGamesPage() {
  const { userGames, addUserGame, updateUserGame, removeUserGame } = useApp();
  const [filter, setFilter] = useState("all");
  const [selectedGame, setSelectedGame] = useState<Game | undefined>();
  const [editing, setEditing] = useState<UserGameWithGame | undefined>();
  const filtered = filter === "all" ? userGames : userGames.filter((entry) => entry.status === filter || (filter === "favorites" && entry.favorite));

  return (
    <AppShell title="My Games">
      <section className="content-section">
        <SectionHeader title="Your Game Library" actionLabel="+ Add Game" onAction={() => setSelectedGame(featuredGames[0])} />
        <div className="filter-pills">
          {["all", "playing", "completed", "played", "watched", "dropped", "wishlist", "favorites"].map((item) => (
            <button className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="add-search-panel">
          <Search size={18} />
          <span>Quick add:</span>
          {featuredGames.slice(0, 5).map((game) => (
            <button key={game.id} onClick={() => setSelectedGame(game)} type="button">
              {game.title}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <div className="library-grid">
            {filtered.map((entry) => (
              <LibraryGameCard entry={entry} key={entry.id} onEdit={setEditing} />
            ))}
          </div>
        ) : (
          <EmptyState title="Your library is empty" text="Start building your gaming identity by adding your first game." />
        )}
      </section>
      {selectedGame ? (
        <GameFormModal
          game={selectedGame}
          onClose={() => setSelectedGame(undefined)}
          onSubmit={(value) => addUserGame(value)}
        />
      ) : null}
      {editing ? (
        <GameFormModal
          entry={editing}
          onClose={() => setEditing(undefined)}
          onSubmit={(value) => updateUserGame(editing.id, value)}
        />
      ) : null}
    </AppShell>
  );
}

export function ExplorePage() {
  const { addUserGame } = useApp();
  const [query, setQuery] = useState("");
  const [games, setGames] = useState(featuredGames);
  const [selectedGame, setSelectedGame] = useState<Game | undefined>();
  useEffect(() => {
    void gameService.getGames().then(setGames);
  }, []);

  const filteredGames = games.filter((game) =>
    [game.title, ...game.genres, ...game.platforms].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const filteredUsers = users.filter((user) =>
    [user.username, user.name, user.bio ?? ""].join(" ").toLowerCase().includes(query.replace("@", "").toLowerCase()),
  );

  return (
    <AppShell title="Explore">
      <section className="explore-search">
        <Search size={20} />
        <input placeholder="Search games, users..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </section>
      <section className="content-section">
        <SectionHeader title="Explore Games" />
        <p className="catalog-meta">{filteredGames.length} games in the catalogue · Search by title, genre, or platform</p>
        <div className="explore-grid">
          {filteredGames.map((game) => (
            <ExploreGameCard game={game} key={game.id} onAdd={setSelectedGame} />
          ))}
        </div>
        {!filteredGames.length ? <EmptyState title="No games found" text="Try another title, genre, or platform." /> : null}
      </section>
      <section className="content-section">
        <SectionHeader title="Explore Users" />
        <div className="user-grid">
          {filteredUsers.map((profile) => (
            <Link className="user-card" href={`/user/${profile.username}`} key={profile.id}>
              <img alt="" src={profile.avatarUrl} />
              <div>
                <h3>{profile.displayName}</h3>
                <p>@{profile.username}</p>
                <span>{profile.gamesCount} games • Playing {profile.currentlyPlaying}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {selectedGame ? (
        <GameFormModal
          game={selectedGame}
          onClose={() => setSelectedGame(undefined)}
          onSubmit={(value) => addUserGame(value)}
        />
      ) : null}
    </AppShell>
  );
}

export function GameDetailsPage({ slug }: { slug: string }) {
  const { userGames, updateUserGame, removeUserGame } = useApp();
  const [editing, setEditing] = useState<UserGameWithGame | undefined>();
  const entry = userGames.find((item) => item.game.slug === slug || item.game.id === slug);
  const game = entry?.game ?? featuredGames.find((item) => item.slug === slug || item.id === slug);

  if (!game) {
    return <AppShell title="Game Details"><EmptyState title="Game not found" text="Try exploring the catalogue again." /></AppShell>;
  }

  return (
    <AppShell title="Game Details">
      <section className="details-hero">
        <img alt={`${game.title} cover`} src={game.coverUrl} />
        <div>
          <p className="eyebrow">{game.releaseDate.slice(0, 4)} • {game.genres.join(" / ")}</p>
          <h2>{game.title}</h2>
          <p>{game.description}</p>
          <div className="platform-row">{game.platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
          {entry ? (
            <div className="detail-stats">
              <StatusBadge status={entry.status} favorite={entry.favorite} />
              <span>{entry.hoursPlayed} hours</span>
              <span>{entry.achievementsUnlocked}/{entry.achievementsTotal} achievements</span>
              <RatingStars value={entry.rating} />
            </div>
          ) : null}
          {entry?.notes ? <blockquote>{entry.notes}</blockquote> : null}
          {entry ? (
            <div className="hero-actions">
              <Button onClick={() => setEditing(entry)}>Edit</Button>
              <button className="danger-button" onClick={() => confirm("Remove this game from your library?") && removeUserGame(entry.id)} type="button">
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          ) : null}
        </div>
      </section>
      {editing ? <GameFormModal entry={editing} onClose={() => setEditing(undefined)} onSubmit={(value) => updateUserGame(editing.id, value)} /> : null}
    </AppShell>
  );
}

export function PublicProfilePage({ username }: { username?: string }) {
  const { user, userGames } = useApp();
  const profile = users.find((item) => item.username === username) ?? user;
  const stats = getStats(userGames);
  const favorites = userGames.filter((entry) => entry.favorite);

  return (
    <AppShell title="Profile">
      <section className="profile-hero">
        <img alt="" src={profile.avatarUrl} />
        <div>
          <p className="eyebrow">Public GamerFolio</p>
          <h2>{profile.displayName}</h2>
          <p>@{profile.username}</p>
          <strong>{profile.bio}</strong>
          <div className="account-row">
            {profile.steamId ? <span>Steam: {profile.steamId}</span> : null}
            {profile.epicGamesId ? <span>Epic: {profile.epicGamesId}</span> : null}
          </div>
          <Button href="/messages">Start Chat</Button>
        </div>
      </section>
      <StatsGrid stats={stats} />
      <section className="content-section">
        <SectionHeader title="Favorite Games" />
        <div className="library-grid compact">
          {favorites.map((entry) => <LibraryGameCard entry={entry} key={entry.id} />)}
        </div>
      </section>
    </AppShell>
  );
}

export function ActivityPage() {
  const { activities } = useApp();

  return (
    <AppShell title="Activity">
      <section className="timeline">
        {[...activities, ...mockActivities].slice(0, 8).map((activity) => {
          const game = featuredGames.find((item) => item.id === activity.gameId);
          return (
            <article className="activity-card" key={activity.id}>
              <span><CheckCircle2 size={18} /></span>
              <div>
                <h3>{activity.content}</h3>
                <p>{game?.title ?? "GamerFolio"} • {new Date(activity.createdAt).toLocaleDateString()}</p>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}

export function MessagesPage() {
  const { user, messages, sendMessage } = useApp();
  const [conversationId, setConversationId] = useState(conversations[0].id);
  const [content, setContent] = useState("");
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const other = activeConversation.participants.find((participant) => participant.id !== user.id) ?? activeConversation.participants[0];
  const visibleMessages = messages.filter((message) => message.conversationId === conversationId);

  return (
    <AppShell title="Messages">
      <section className="messages-layout">
        <aside className="conversation-list">
          {conversations.map((conversation) => {
            const participant = conversation.participants.find((item) => item.id !== user.id) ?? conversation.participants[0];
            return (
              <button className={conversationId === conversation.id ? "is-active" : ""} key={conversation.id} onClick={() => setConversationId(conversation.id)} type="button">
                <img alt="" src={participant.avatarUrl} />
                <span><strong>{participant.displayName}</strong><small>{conversation.lastMessage?.content}</small></span>
              </button>
            );
          })}
        </aside>
        <div className="chat-window">
          <header>
            <img alt="" src={other.avatarUrl} />
            <div>
              <h2>{other.displayName}</h2>
              <p>{other.online ? "Online" : "Offline"}</p>
            </div>
          </header>
          <div className="message-stream">
            {visibleMessages.map((message) => (
              <article className={`message-bubble ${message.senderId === user.id ? "is-mine" : ""}`} key={message.id}>
                <p>{message.content}</p>
                <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </article>
            ))}
          </div>
          <form
            className="message-input"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(conversationId, content);
              setContent("");
            }}
          >
            <input placeholder="Write a message..." value={content} onChange={(event) => setContent(event.target.value)} />
            <button type="submit" aria-label="Send message"><Send size={18} /></button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}

export function SettingsPage() {
  const { user, completeSetup, signOut } = useApp();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [form, setForm] = useState({
    name: user.name,
    username: `@${user.username}`,
    bio: user.bio ?? "",
    steamId: user.steamId ?? "",
    epicGamesId: user.epicGamesId ?? "",
  });

  return (
    <AppShell title="Settings">
      <section className="settings-grid">
        <form
          className="settings-panel"
          onSubmit={(event) => {
            event.preventDefault();
            completeSetup({ ...form, avatarUrl });
          }}
        >
          <SectionHeader title="Profile" />
          <AvatarPicker selected={avatarUrl} onChange={setAvatarUrl} />
          <div className="form-grid">
            {(["name", "username", "steamId", "epicGamesId"] as const).map((field) => (
              <label key={field}>
                {field}
                <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
              </label>
            ))}
          </div>
          <label>
            Bio
            <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </label>
          <Button type="submit">Save Profile</Button>
        </form>
        <section className="settings-panel">
          <SectionHeader title="Account" />
          <p>Frontend-only session controls for now.</p>
          <button className="danger-button" onClick={signOut} type="button">Sign out</button>
        </section>
      </section>
    </AppShell>
  );
}

function StatsGrid({ stats }: { stats: Array<{ label: string; value: string | number; icon: React.ElementType }> }) {
  return (
    <section className="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article className="stat-card" key={stat.label}>
            <Icon size={20} />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        );
      })}
    </section>
  );
}

function getStats(userGames: UserGameWithGame[]) {
  return [
    { label: "Games Added", value: userGames.length, icon: Gamepad2 },
    { label: "Currently Playing", value: userGames.filter((entry) => entry.status === "playing").length, icon: Sparkles },
    { label: "Completed", value: userGames.filter((entry) => entry.status === "completed").length, icon: Trophy },
    { label: "Hours Played", value: userGames.reduce((sum, entry) => sum + entry.hoursPlayed, 0), icon: Clock },
  ];
}

function SectionHeader({ title, actionHref, actionLabel, onAction }: { title: string; actionHref?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {actionHref && actionLabel ? <Button href={actionHref} variant="secondary">{actionLabel}</Button> : null}
      {onAction && actionLabel ? <button className="button button--primary" onClick={onAction} type="button"><Plus size={16} />{actionLabel}</button> : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <ShieldCheck size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
