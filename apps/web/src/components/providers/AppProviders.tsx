"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  activities as initialActivities,
  currentUser,
  gameById,
  messages as initialMessages,
  userGames as initialUserGames,
} from "@/data/mockAppData";
import { featuredGames } from "@/data/mockGames";
import { authService, type AuthSession } from "@/services/authService";
import { apiClient } from "@/services/apiClient";
import { libraryService, type UpsertLibraryGameInput } from "@/services/libraryService";
import type {
  Activity,
  Message,
  User,
  UserGame,
  UserGameStatus,
  UserGameWithGame,
} from "@/types/models";

type UpsertGameInput = UpsertLibraryGameInput;

type ProfileInput = {
  name: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  steamId?: string;
  epicGamesId?: string;
};

type AppContextValue = {
  session: AuthSession;
  isHydrated: boolean;
  user: User;
  userGames: UserGameWithGame[];
  activities: Activity[];
  messages: Message[];
  signInWithGoogle: (credential?: string) => Promise<void>;
  completeSetup: (profile: ProfileInput) => Promise<void>;
  signOut: () => Promise<void>;
  addUserGame: (input: UpsertGameInput) => Promise<void>;
  updateUserGame: (id: string, input: UpsertGameInput) => Promise<void>;
  removeUserGame: (id: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

const now = () => new Date().toISOString();

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User>(currentUser);
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession>({
    user: null,
    isAuthenticated: false,
    hasCompletedSetup: false,
  });
  const [userGames, setUserGames] = useState<UserGame[]>(initialUserGames);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    const saved = window.localStorage.getItem("gamerfolio-session");
    if (saved) {
      const parsed = JSON.parse(saved) as { user: User; session: AuthSession };
      const migratedUser = parsed.user.avatarUrl.includes("adventurer-neutral")
        ? { ...parsed.user, avatarUrl: currentUser.avatarUrl }
        : parsed.user;
      setUser(migratedUser);
      setSession({
        ...parsed.session,
        user: parsed.session.user
          ? { ...parsed.session.user, avatarUrl: migratedUser.avatarUrl }
          : null,
      });

      if (parsed.session.token && parsed.session.token !== "demo-token") {
        void Promise.all([
          apiClient.get<User>("/users/me", parsed.session.token),
          libraryService.getMyGames(parsed.session.token),
        ])
          .then(([remoteUser, remoteGames]) => {
            setUser({ ...remoteUser, name: remoteUser.displayName ?? remoteUser.username });
            setUserGames(remoteGames);
          })
          .catch(() => undefined);
      }
    }
    setIsHydrated(true);
  }, []);

  const userGamesWithGame = useMemo(
    () =>
      userGames
        .map((entry) => {
          const game = gameById(entry.gameId);
          return game ? { ...entry, game } : undefined;
        })
        .filter(Boolean) as UserGameWithGame[],
    [userGames],
  );

  const addActivity = (content: string, gameId: string, type: Activity["type"]) => {
    setActivities((current) => [
      {
        id: `act-${Date.now()}`,
        userId: user.id,
        type,
        gameId,
        content,
        createdAt: now(),
      },
      ...current,
    ]);
  };

  const signInWithGoogle = async (credential?: string) => {
    const nextSession = await authService.continueWithGoogle(credential);
    setSession(nextSession);
    window.localStorage.setItem(
      "gamerfolio-session",
      JSON.stringify({ user, session: nextSession }),
    );
    router.push("/setup");
  };

  const completeSetup = async (profile: ProfileInput) => {
    const nextUser = {
      ...user,
      ...profile,
      username: profile.username.replace("@", ""),
      displayName: profile.name,
      gamesCount: userGames.length,
    };

    if (session.token && session.token !== "demo-token") {
      await apiClient
        .patch<User>(
          "/users/me",
          {
            displayName: profile.name,
            username: profile.username.replace("@", ""),
            avatarUrl: profile.avatarUrl,
            bio: profile.bio || null,
            steamId: profile.steamId || null,
            epicGamesId: profile.epicGamesId || null,
          },
          session.token,
        )
        .then((remoteUser) => {
          nextUser.id = remoteUser.id;
          nextUser.displayName = remoteUser.displayName;
          nextUser.username = remoteUser.username;
        })
        .catch(() => undefined);
    }

    setUser(nextUser);
    setSession({
      user: nextUser,
      isAuthenticated: true,
      hasCompletedSetup: true,
    });
    window.localStorage.setItem(
      "gamerfolio-session",
      JSON.stringify({
        user: nextUser,
        session: {
          user: nextUser,
          isAuthenticated: true,
          hasCompletedSetup: true,
        },
      }),
    );
    router.push("/home");
  };

  const signOut = async () => {
    const nextSession = await authService.signOut(session.token);
    setSession(nextSession);
    window.localStorage.removeItem("gamerfolio-session");
    router.push("/");
  };

  const addUserGame = async (input: UpsertGameInput) => {
    const game = featuredGames.find((item) => item.id === input.gameId);

    if (session.token && session.token !== "demo-token") {
      const remoteEntry = await libraryService.addGame(input, session.token);
      setUserGames((current) => [remoteEntry, ...current]);
      return;
    }

    const newEntry: UserGame = {
      id: `ug-${Date.now()}`,
      userId: user.id,
      createdAt: now(),
      updatedAt: now(),
      ...input,
    };
    setUserGames((current) => [newEntry, ...current]);
    addActivity(`Added ${game?.title ?? "a game"}`, input.gameId, "added");
  };

  const updateUserGame = async (id: string, input: UpsertGameInput) => {
    const game = featuredGames.find((item) => item.id === input.gameId);

    if (session.token && session.token !== "demo-token") {
      const entry = userGamesWithGame.find((item) => item.id === id);
      if (entry) {
        const remoteEntry = await libraryService.updateGame(entry.gameId, input, session.token);
        setUserGames((current) =>
          current.map((item) => (item.id === id ? remoteEntry : item)),
        );
      }
      return;
    }

    setUserGames((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...input,
              updatedAt: now(),
            }
          : entry,
      ),
    );
    addActivity(`Updated ${game?.title ?? "a game"}`, input.gameId, "updated");
  };

  const removeUserGame = async (id: string) => {
    const entry = userGamesWithGame.find((item) => item.id === id);

    if (session.token && session.token !== "demo-token" && entry) {
      await libraryService.removeGame(entry.gameId, session.token);
      setUserGames((current) => current.filter((item) => item.id !== id));
      return;
    }

    setUserGames((current) => current.filter((item) => item.id !== id));
    if (entry) {
      addActivity(`Removed ${entry.game.title}`, entry.gameId, "updated");
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (!content.trim()) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: user.id,
        content: content.trim(),
        createdAt: now(),
      },
    ]);
  };

  const value = {
    session,
    isHydrated,
    user,
    userGames: userGamesWithGame,
    activities,
    messages,
    signInWithGoogle,
    completeSetup,
    signOut,
    addUserGame,
    updateUserGame,
    removeUserGame,
    sendMessage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProviders");
  }

  return context;
}
