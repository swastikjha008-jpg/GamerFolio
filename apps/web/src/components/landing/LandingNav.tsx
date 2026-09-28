"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Logo } from "../ui/Logo";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Explore", href: "#explore" },
  { label: "Community", href: "#community" },
  { label: "About", href: "#about" },
];

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="landing-nav">
      <Logo />

      <nav aria-label="Primary navigation" className="desktop-links">
        {navItems.map((item) => (
          <a href={item.href} key={item.label}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="nav-actions">
        <Button href="/auth" variant="ghost">
          Sign In
        </Button>
        <button
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          className="icon-button mobile-menu-button"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen ? (
        <div className="mobile-panel">
          {navItems.map((item) => (
            <a href={item.href} key={item.label} onClick={() => setIsOpen(false)}>
              {item.label}
            </a>
          ))}
          <Button href="/auth" variant="primary">
            Sign In
          </Button>
        </div>
      ) : null}
    </header>
  );
}
