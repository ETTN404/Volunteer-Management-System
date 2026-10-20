/**
 * Splits the `country-state-city` dataset into small static files so the app never
 * ships the full 8 MB database:
 *   public/geo/countries.json        — [{ iso, name, phone }]
 *   public/geo/cities/{ISO}.json     — [{ name, region }]
 * Run with `npm run geo` (also runs before `npm run build`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { City, Country, State } from 'country-state-city';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'geo');
mkdirSync(join(root, 'cities'), { recursive: true });

const countries = Country.getAllCountries().map((c) => ({ iso: c.isoCode, name: c.name, phone: c.phonecode.replace(/^\+/, '').split(/[ ,]/)[0] }));
writeFileSync(join(root, 'countries.json'), JSON.stringify(countries));

let files = 0;
for (const c of countries) {
  const regions = new Map(State.getStatesOfCountry(c.iso).map((s) => [s.isoCode, s.name]));
  const seen = new Set();
  const cities = (City.getCitiesOfCountry(c.iso) ?? [])
    .filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)))
    .map((x) => ({ name: x.name, region: regions.get(x.stateCode) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(root, 'cities', `${c.iso}.json`), JSON.stringify(cities));
  files++;
}
console.log(`geo: ${countries.length} countries, ${files} city files → public/geo`);
