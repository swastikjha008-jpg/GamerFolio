"use client";

import {
  Activity,
  Compass,
  Home,
  Library,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { Logo } from "@/components/ui/Logo";
import { ProtectedRoute } from "./ProtectedRoute";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/my-games", label: "My Games", icon: Library },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { user, signOut } = useApp();

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <aside className="sidebar">
          <Logo />
          <nav className="side-nav" aria-label="Application navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link className={`side-link ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-user">
            <img alt={`${user.displayName} avatar`} src={user.avatarUrl} />
            <div>
              <strong>@{user.username}</strong>
              <span><i /> Online</span>
            </div>
            <button aria-label="Sign out" onClick={signOut} type="button">
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div>
              <p className="eyebrow">GamerFolio</p>
              <h1>{title}</h1>
            </div>
            <label className="global-search">
              <Search size={18} />
              <input placeholder="Search games, users..." />
            </label>
            <img className="topbar-avatar" alt="" src={user.avatarUrl} />
          </header>
          {children}
        </div>

        <nav className="mobile-tabbar" aria-label="Mobile navigation">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link className={pathname === item.href ? "is-active" : ""} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ProtectedRoute>
  );
}
