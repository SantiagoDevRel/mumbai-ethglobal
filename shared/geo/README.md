# shared/geo

`countries.json` comes from [Natural Earth](https://www.naturalearthdata.com/) 1:50m admin-0 countries (public domain): per country, the outer ring of its largest polygon, simplified to at most 150 points. `place.ts` picks a deterministic random point inside a country from a seed.

Rebuild: download `ne_50m_admin_0_countries.geojson` from [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson), then run `node shared/geo/build-countries.mjs <path-to-geojson>`.

Test: `node --test --experimental-strip-types shared/geo/place.test.ts`.
