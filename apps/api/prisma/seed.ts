import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed data uses real, well-known games with accurate titles, genres,
 * platforms, and release dates. Per project rules, we do NOT fabricate
 * cover artwork — `coverUrl` is intentionally left `null` here. Real
 * cover URLs get populated by `gameProvider.service.ts` the first time
 * each game is looked up through the catalogue provider (IGDB), which
 * upserts the canonical artwork onto these same rows (matched by title/slug
 * only if you also set a real `externalId` — for a pure local seed, the
 * catalogue endpoints will otherwise fetch-and-cache on demand instead).
 */
const games = [
  {
    externalId: "seed-elden-ring",
    title: "Elden Ring",
    slug: "elden-ring",
    description:
      "An action RPG set in the Lands Between, developed by FromSoftware in collaboration with George R. R. Martin.",
    releaseDate: new Date("2022-02-25"),
    genres: ["Action RPG", "Open World"],
    platforms: ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One"],
  },
  {
    externalId: "seed-resident-evil-4",
    title: "Resident Evil 4",
    slug: "resident-evil-4",
    description: "A survival horror classic, remade by Capcom for modern platforms.",
    releaseDate: new Date("2023-03-24"),
    genres: ["Survival Horror", "Action"],
    platforms: ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S"],
  },
  {
    externalId: "seed-marvels-spiderman",
    title: "Marvel's Spider-Man",
    slug: "marvels-spider-man",
    description: "An open-world superhero action-adventure developed by Insomniac Games.",
    releaseDate: new Date("2018-09-07"),
    genres: ["Action-Adventure", "Open World"],
    platforms: ["PlayStation 5", "PlayStation 4", "PC"],
  },
  {
    externalId: "seed-god-of-war-ragnarok",
    title: "God of War Ragnarök",
    slug: "god-of-war-ragnarok",
    description: "Kratos and Atreus journey through the Nine Realms as Ragnarök approaches.",
    releaseDate: new Date("2022-11-09"),
    genres: ["Action-Adventure"],
    platforms: ["PlayStation 5", "PlayStation 4", "PC"],
  },
  {
    externalId: "seed-ghost-of-tsushima",
    title: "Ghost of Tsushima",
    slug: "ghost-of-tsushima",
    description: "An open-world samurai action-adventure set during the first Mongol invasion of Japan.",
    releaseDate: new Date("2020-07-17"),
    genres: ["Action-Adventure", "Open World"],
    platforms: ["PlayStation 5", "PlayStation 4", "PC"],
  },
  {
    externalId: "seed-tlou-part-1",
    title: "The Last of Us Part I",
    slug: "the-last-of-us-part-1",
    description: "A rebuilt version of the acclaimed post-apocalyptic action-adventure.",
    releaseDate: new Date("2022-09-02"),
    genres: ["Action-Adventure", "Survival"],
    platforms: ["PlayStation 5", "PC"],
  },
  {
    externalId: "seed-horizon-forbidden-west",
    title: "Horizon Forbidden West",
    slug: "horizon-forbidden-west",
    description: "Aloy explores a post-apocalyptic America filled with machines, in this open-world action RPG.",
    releaseDate: new Date("2022-02-18"),
    genres: ["Action RPG", "Open World"],
    platforms: ["PlayStation 5", "PlayStation 4", "PC"],
  },
  {
    externalId: "seed-sekiro",
    title: "Sekiro: Shadows Die Twice",
    slug: "sekiro-shadows-die-twice",
    description: "A stealth-action game from FromSoftware set in reimagined late-1500s Sengoku Japan.",
    releaseDate: new Date("2019-03-22"),
    genres: ["Action", "Stealth"],
    platforms: ["PC", "PlayStation 4", "Xbox One"],
  },
  {
    externalId: "seed-rdr2",
    title: "Red Dead Redemption 2",
    slug: "red-dead-redemption-2",
    description: "An epic open-world Western action-adventure from Rockstar Games.",
    releaseDate: new Date("2018-10-26"),
    genres: ["Action-Adventure", "Open World"],
    platforms: ["PC", "PlayStation 4", "Xbox One"],
  },
  {
    externalId: "seed-witcher-3",
    title: "The Witcher 3: Wild Hunt",
    slug: "the-witcher-3-wild-hunt",
    description: "Geralt of Rivia hunts for Ciri across a vast open-world fantasy RPG.",
    releaseDate: new Date("2015-05-19"),
    genres: ["Action RPG", "Open World"],
    platforms: ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch"],
  },
];

async function main() {
  console.log("🌱 Seeding game catalogue...");

  for (const game of games) {
    await prisma.game.upsert({
      where: { externalId: game.externalId },
      update: game,
      create: game,
    });
  }

  console.log(`✅ Seeded ${games.length} games.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
