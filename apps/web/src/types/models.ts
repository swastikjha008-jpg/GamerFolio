export interface User {
  id: string;
  username: string;
  name: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  steamId?: string;
  epicGamesId?: string;
  currentlyPlaying?: string;
  gamesCount?: number;
  online?: boolean;
  createdAt: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  imageSource: string;
  description: string;
  genres: string[];
  platforms: string[];
  releaseDate: string;
}

export type UserGameStatus =
  | "playing"
  | "played"
  | "completed"
  | "watched"
  | "dropped"
  | "wishlist";

export interface UserGame {
  id: string;
  userId: string;
  gameId: string;
  status: UserGameStatus;
  hoursPlayed: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  rating?: number;
  notes?: string;
  favorite: boolean;
  completionPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserGameWithGame extends UserGame {
  game: Game;
}

export interface Activity {
  id: string;
  userId: string;
  type: "added" | "completed" | "started" | "wishlist" | "updated";
  gameId: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}
