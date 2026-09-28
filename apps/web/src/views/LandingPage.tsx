import { Compass, Gamepad2, MessageCircle, UserRound } from "lucide-react";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { HeroCoverStack } from "@/components/landing/HeroCoverStack";
import { LandingNav } from "@/components/landing/LandingNav";
import { Button } from "@/components/ui/Button";
import { featuredGames } from "@/data/mockGames";

const features = [
  {
    title: "Track Games",
    description:
      "Track games you've played, watched, completed, dropped, or want to play.",
    icon: Gamepad2,
  },
  {
    title: "Build Your Identity",
    description:
      "Create your own gamer profile and showcase your gaming journey.",
    icon: UserRound,
  },
  {
    title: "Discover",
    description: "Explore games and discover titles you may want to play.",
    icon: Compass,
  },
  {
    title: "Connect",
    description:
      "Find other gamers and communicate with them through direct chat.",
    icon: MessageCircle,
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <LandingNav />

      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">GamerFolio social game tracking</p>
          <h1 id="hero-title">Your Games. Your Journey. Your Identity.</h1>
          <p className="hero-text">
            Track the games you play, discover new games, build your gaming
            identity, and connect with other gamers.
          </p>
          <div className="hero-actions">
            <Button href="/auth">Sign up with Google</Button>
            <Button href="/explore" variant="secondary">
              Explore Games
            </Button>
          </div>
          <p className="community-note">
            Join gamers building their gaming identity. Demo catalogue shown
            with real game titles and official store media.
          </p>
        </div>

        <HeroCoverStack games={featuredGames} />
      </section>

      <section className="feature-section" id="features" aria-labelledby="features-title">
        <div className="section-heading">
          <p className="eyebrow">Core loop</p>
          <h2 id="features-title">Simple, personal, and ready for your library.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="identity-band" id="community" aria-labelledby="community-title">
        <div>
          <p className="eyebrow">Community</p>
          <h2 id="community-title">See what people play, then start a direct chat.</h2>
        </div>
        <div className="identity-preview">
          <div className="avatar-stack" aria-hidden="true">
            <span>A</span>
            <span>S</span>
            <span>R</span>
          </div>
          <p>
            Profiles, game collections, and direct messages stay focused on the
            essentials for V1.
          </p>
        </div>
      </section>

      <section className="final-cta" id="about" aria-labelledby="final-cta-title">
        <p className="eyebrow">Start clean</p>
        <h2 id="final-cta-title">Your gaming journey starts here.</h2>
        <Button href="/auth">Create Your GamerFolio</Button>
      </section>
    </main>
  );
}
