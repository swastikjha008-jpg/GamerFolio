
import Link from "next/link";
import {
  Gamepad2,
  Github,
  Instagram,
  Twitter,
  ArrowUpRight,
  Heart,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const footerGroups = [
  {
    title: "Discover",
    links: [
      { label: "Explore Games", href: "/games" },
      { label: "Gaming Community", href: "/community" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Your Space",
    links: [
      { label: "My Profile", href: "/profile" },
      { label: "My Library", href: "/library" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    title: "GamerFolio",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com",
    icon: Github,
  },
  {
    label: "Twitter",
    href: "https://twitter.com",
    icon: Twitter,
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: Instagram,
  },
];

export function Footer() {
  return (
    <footer className="gf-footer">
      {/* Decorative background */}
      <div className="gf-footer-glow" aria-hidden="true" />
      <div className="gf-footer-grid" aria-hidden="true" />

      <div className="gf-footer-container">
        {/* Top section */}
        <div className="gf-footer-top">
          {/* Brand section */}
          <div className="gf-footer-brand-section">
            <Link href="/" className="gf-footer-brand">
              <span className="gf-footer-brand-mark">
                <Gamepad2 size={25} strokeWidth={2.2} />
                <span className="gf-footer-brand-dot" />
              </span>

              <span className="gf-footer-brand-name">
                Gamer<span>Folio</span>
              </span>
            </Link>

            <p className="gf-footer-description">
              More than just games.
              <br />
              It&apos;s your gaming identity.
            </p>

            <p className="gf-footer-subdescription">
              Track your journey, showcase your achievements, and connect
              with gamers who share your passion.
            </p>

            {/* Community CTA */}
            <Link href="/community" className="gf-footer-cta">
              <span className="gf-footer-cta-icon">
                <Sparkles size={16} />
              </span>

              <span>Explore the community</span>

              <ChevronRight
                size={17}
                className="gf-footer-cta-arrow"
              />
            </Link>

            {/* Social links */}
            <div className="gf-footer-socials">
              <span className="gf-footer-social-label">
                CONNECT WITH US
              </span>

              <div className="gf-footer-social-list">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="gf-footer-social-link"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="gf-footer-navigation">
            {footerGroups.map((group) => (
              <div key={group.title} className="gf-footer-column">
                <h3 className="gf-footer-column-title">
                  {group.title}
                </h3>

                <ul className="gf-footer-links">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href}>
                        <span>{link.label}</span>

                        <ArrowUpRight
                          size={14}
                          className="gf-footer-link-arrow"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="gf-footer-bottom">
          <div className="gf-footer-copyright">
            <span className="gf-footer-copyright-mark">
              ©
            </span>

            <span>
              {new Date().getFullYear()} GamerFolio.
              All rights reserved.
            </span>
          </div>

          <div className="gf-footer-made">
            Crafted for gamers
            <Heart
              size={14}
              className="gf-footer-heart"
              fill="currentColor"
            />
          </div>

          <div className="gf-footer-bottom-links">
            <Link href="/privacy">Privacy</Link>
            <span className="gf-footer-divider">/</span>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
