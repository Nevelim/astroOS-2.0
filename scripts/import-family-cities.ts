/**
 * Import the 682 family-astrocartography reference cities into the Prisma City
 * table. Idempotent: matches on (name, country), upserts region/lat/lng.
 *
 * Usage:  npx tsx scripts/import-family-cities.ts
 *
 * These cities come from FAMILY_CITY_SEEDS (customer reference database).
 * They lack timezone info, so we store "UTC"/0 — timezone is not used by the
 * abundance engine (only lat/lng + GMST matter). Cities already seeded by
 * city-seeds.ts (331 cities with full data) are left untouched unless their
 * name+country matches a family seed, in which case the region is back-filled.
 */
import { db } from "../src/lib/db";
import { FAMILY_CITY_SEEDS } from "../src/lib/astroos/real/family-city-seeds";

async function main(): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const seed of FAMILY_CITY_SEEDS) {
    // Match on name + country (country includes flag emoji + ru name).
    const existing = await db.city.findFirst({
      where: { name: seed.name, country: seed.country },
    });
    if (existing) {
      // Only back-fill region if missing.
      if (!existing.region) {
        await db.city.update({
          where: { id: existing.id },
          data: { region: seed.region, lat: seed.lat, lng: seed.lng },
        });
        updated++;
      }
    } else {
      await db.city.create({
        data: {
          name: seed.name,
          country: seed.country,
          lat: seed.lat,
          lng: seed.lng,
          timezone: "UTC",
          tzOffsetHours: 0,
          region: seed.region,
        },
      });
      created++;
    }
  }

  const total = await db.city.count();
  const withRegion = await db.city.count({ where: { NOT: { region: null } } });
  console.log(
    `✓ Family cities: ${created} created, ${updated} region back-filled. ` +
      `DB now has ${total} cities (${withRegion} with region).`,
  );
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
