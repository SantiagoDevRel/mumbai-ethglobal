// Seed businesses for the Mumbai map. Every name is invented; any match with a real place is
// accidental. Coordinates sit on land in real neighborhoods. Ids are `<area>-<slug>`.
// No `photo` field: photos are not on Swarm yet.

import type { BusinessCategory } from "../types";
import type { BusinessCreate } from "../arkiv/adapter";

export interface SeedBusiness {
  id: string;
  business: Omit<BusinessCreate, "lifetimeSec">;
  reviews: { stars: number; text: string }[];
}

type Review = { stars: number; text: string };

const CITY = "Mumbai";

function biz(
  id: string,
  name: string,
  category: BusinessCategory,
  lat: number,
  lng: number,
  rating: number,
  opens: number,
  closes: number,
  reviews: Review[],
): SeedBusiness {
  return { id, business: { name, category, rating, opens, closes, city: CITY, lat, lng }, reviews };
}

const r = (stars: number, text: string): Review => ({ stars, text });

/** Times are minutes after midnight; closes < opens means it closes after midnight. */
export const SEED_BUSINESSES: SeedBusiness[] = [
  // Bandra West (cluster)
  biz("bandra-tapri-tales", "Tapri Tales", "cafe", 19.0558, 72.8325, 4.6, 420, 1380, [
    r(5, "Best cutting chai on Hill Road, hands down."),
    r(5, "Tiny tapri, huge flavour. Bun maska is a must."),
    r(4, "Bit crowded at 6 pm but worth the wait."),
  ]),
  biz("bandra-bhel-bandwagon", "Bhel Bandwagon", "street-food", 19.0542, 72.836, 4.3, 960, 1350, [
    r(4, "Tangy bhel, extra sev, no complaints."),
    r(5, "Ekdum mast! Sukha bhel is the star."),
    r(4, "Quick, cheap and always fresh."),
  ]),
  biz("bandra-monsoon-mug", "Monsoon Mug", "cafe", 19.059, 72.8305, 4.1, 480, 1320, [
    r(4, "Cosy corner to work from on rainy days."),
    r(4, "Cold coffee is solid. Wifi is fast."),
    r(3, "Pastries were okay, coffee was great."),
  ]),
  biz("bandra-frankie-frequency", "Frankie Frequency", "street-food", 19.0625, 72.8335, 4.5, 690, 90, [
    r(5, "Paneer frankie at midnight, perfect."),
    r(4, "Spicy chutney, soft roti, bahut badhiya."),
    r(5, "My go-to after a late show on Linking Road."),
  ]),
  biz("bandra-thali-theory", "Thali Theory", "restaurant", 19.0645, 72.8345, 4.4, 720, 1410, [
    r(5, "Unlimited Gujarati thali, came out very full."),
    r(4, "Service is fast and the dal is lovely."),
    r(4, "Great for a family lunch."),
  ]),
  biz("bandra-chapter-chowk", "Chapter Chowk", "bookstore", 19.067, 72.829, 4.7, 660, 1260, [
    r(5, "Lovely second-hand shelves and a reading nook."),
    r(5, "Found a rare Marathi poetry book here!"),
    r(4, "Staff give honest recommendations."),
  ]),
  biz("bandra-mawa-cake-mills", "Mawa Cake Mills", "bakery", 19.052, 72.83, 4.2, 450, 1230, [
    r(4, "Mawa cake is soft and buttery."),
    r(5, "Fresh khari every morning, love it."),
    r(4, "Small place, friendly owners."),
  ]),
  biz("bandra-kokum-cooler-bar", "Kokum Cooler Bar", "bar", 19.0605, 72.836, 3.9, 1080, 60, [
    r(4, "Kokum cocktail is super refreshing."),
    r(4, "Good music, a bit loud after 11."),
    r(3, "Snacks were slow on a Friday."),
  ]),
  biz("bandra-brew-ka-adda", "Brew Ka Adda", "cafe", 19.0575, 72.838, 4.0, 540, 1380, [
    r(4, "Chill vibe, strong filter coffee."),
    r(4, "Nice spot to meet friends after college."),
    r(3, "Seating is a bit tight."),
  ]),

  // Khar West (cluster, next to Bandra West)
  biz("khar-dabeli-dock", "Dabeli Dock", "street-food", 19.0715, 72.8335, 4.4, 900, 1320, [
    r(5, "Kutchi dabeli with pomegranate, so good."),
    r(4, "Spice level just right."),
    r(4, "Cheap and filling evening snack."),
  ]),
  biz("khar-rusk-republic", "Rusk Republic", "bakery", 19.074, 72.836, 3.8, 420, 1200, [
    r(4, "Crunchy rusk, perfect with chai."),
    r(3, "Cakes are fine, rusk is the reason to come."),
    r(4, "Good prices for the area."),
  ]),

  // Lower Parel (cluster)
  biz("lowerparel-local-train-latte", "Local Train Latte", "cafe", 18.996, 72.828, 4.3, 450, 1260, [
    r(4, "Grab-and-go coffee before the 9 am rush."),
    r(5, "Their masala latte is a winner."),
    r(4, "Quick service, office crowd friendly."),
  ]),
  biz("lowerparel-iron-mill-gym", "Iron Mill Gym", "gym", 18.9985, 72.8255, 4.5, 330, 1350, [
    r(5, "Clean, well kept, trainers actually help."),
    r(4, "Peak hours get busy, mornings are calm."),
    r(5, "Great vibe in an old mill shed."),
  ]),
  biz("lowerparel-biryani-bulletin", "Biryani Bulletin", "restaurant", 19.001, 72.8275, 4.6, 690, 1410, [
    r(5, "Mutton biryani, perfectly cooked rice."),
    r(5, "Generous portions, raita was fresh."),
    r(4, "Wait time 20 minutes on weekends."),
  ]),
  biz("lowerparel-dockyard-draughts", "Dockyard Draughts", "bar", 19.004, 72.8285, 4.2, 1020, 90, [
    r(4, "Good beer list and tasty bar bites."),
    r(5, "Live music on Thursdays, loved it."),
    r(4, "Pricey but the vibe is worth it."),
  ]),
  biz("lowerparel-sandwich-signal", "Sandwich Signal", "street-food", 19.0025, 72.831, 4.0, 480, 1200, [
    r(4, "Bombay toastie with green chutney, yum."),
    r(4, "Fast and fresh, great for lunch."),
    r(3, "Ran out of cheese once, still good."),
  ]),
  biz("lowerparel-konkan-compass", "Konkan Compass", "restaurant", 18.994, 72.826, 4.5, 720, 1380, [
    r(5, "Surmai fry and sol kadhi, perfect meal."),
    r(4, "Authentic Malvani flavours."),
    r(5, "Friendly staff, quick refills."),
  ]),
  biz("lowerparel-filter-kaapi-lab", "Filter Kaapi Lab", "cafe", 18.997, 72.8315, 4.7, 420, 1290, [
    r(5, "Best filter coffee south of Dadar."),
    r(5, "They explain every brew, so fun."),
    r(4, "Idli was good too."),
  ]),
  biz("lowerparel-nankhatai-nook", "Nankhatai Nook", "bakery", 19.0065, 72.826, 4.1, 480, 1260, [
    r(4, "Melt-in-the-mouth nankhatai."),
    r(4, "Great gift boxes for Diwali."),
    r(4, "Friendly and quick."),
  ]),
  biz("lowerparel-thela-market", "Thela Market", "market", 18.992, 72.829, 3.9, 600, 1320, [
    r(4, "Fun weekend stalls and snacks."),
    r(4, "Good spot for handmade gifts."),
    r(3, "Parking is tricky."),
  ]),

  // Colaba
  biz("colaba-tikka-tram", "Tikka Tram", "street-food", 18.916, 72.829, 4.4, 1080, 60, [
    r(5, "Chicken tikka straight off the coals."),
    r(4, "Late-night bite after a long walk."),
    r(4, "Smoky, juicy and well spiced."),
  ]),
  biz("colaba-footpath-pages", "Footpath Pages", "bookstore", 18.9148, 72.8264, 4.0, 630, 1230, [
    r(4, "Great finds for under 200 rupees."),
    r(4, "Owner knows every book on the shelf."),
    r(3, "Can get dusty, but such gems."),
  ]),

  // Fort
  biz("fort-bun-maska-bureau", "Bun Maska Bureau", "cafe", 18.934, 72.835, 4.6, 420, 1140, [
    r(5, "Bun maska and Irani chai, classic combo."),
    r(5, "Feels like old Bombay, love it."),
    r(4, "Closes early, go in the morning."),
  ]),
  biz("fort-ragda-rocket", "Ragda Rocket", "street-food", 18.931, 72.836, 4.2, 660, 1260, [
    r(4, "Ragda pattice is hot and tangy."),
    r(5, "Bahut tasty, quick office lunch."),
    r(4, "Long queue moves fast."),
  ]),

  // Kala Ghoda
  biz("kalaghoda-elaichi-engine", "Elaichi Engine", "cafe", 18.9282, 72.8317, 4.5, 480, 1320, [
    r(5, "Cardamom cold brew, absolute winner."),
    r(4, "Art on the walls, calm music."),
    r(5, "Nice place to sketch for an hour."),
  ]),
  biz("kalaghoda-dal-makhani-diaries", "Dal Makhani Diaries", "restaurant", 18.9275, 72.8325, 4.3, 720, 1380, [
    r(4, "Creamy dal and soft butter naan."),
    r(5, "Best North Indian meal in the area."),
    r(4, "Service is polite and quick."),
  ]),

  // Marine Drive (inland side)
  biz("marinedrive-sunset-sip-station", "Sunset Sip Station", "cafe", 18.9435, 72.826, 4.4, 600, 1410, [
    r(5, "Iced chai after a sunset walk, perfect."),
    r(4, "Friendly staff and good playlists."),
    r(4, "Bit pricey but nice view nearby."),
  ]),
  biz("marinedrive-pani-puri-planet", "Pani Puri Planet", "street-food", 18.936, 72.827, 4.6, 960, 1380, [
    r(5, "Six flavours of pani, try the jaljeera."),
    r(5, "Crispy puris every time."),
    r(4, "Clean stall and quick service."),
  ]),

  // Girgaon
  biz("girgaon-misal-mission", "Misal Mission", "street-food", 18.954, 72.8205, 4.5, 420, 840, [
    r(5, "Fiery misal pav, eyes watering, happy."),
    r(4, "Comes with extra farsan on request."),
    r(5, "Breakfast of champions."),
  ]),
  biz("girgaon-khari-and-co", "Khari & Co.", "bakery", 18.9565, 72.823, 4.0, 390, 1200, [
    r(4, "Flaky khari, just like old times."),
    r(4, "Morning bread is always warm."),
    r(3, "Few seats, mostly takeaway."),
  ]),

  // Worli (inland of the sea face)
  biz("worli-seaface-strength", "Seaface Strength", "gym", 19.012, 72.8215, 4.3, 300, 1380, [
    r(4, "Well equipped and never too crowded."),
    r(5, "Yoga classes are excellent."),
    r(4, "Lockers are clean."),
  ]),
  biz("worli-bombil-bay", "Bombil Bay", "restaurant", 19.0065, 72.8205, 4.4, 720, 1410, [
    r(5, "Crispy bombil fry, a must try."),
    r(4, "Prawn curry was rich and spicy."),
    r(4, "Good for a seafood dinner."),
  ]),

  // Dadar
  biz("dadar-vada-pav-velocity", "Vada Pav Velocity", "street-food", 19.019, 72.843, 4.7, 600, 1350, [
    r(5, "Hot vada, spicy chutney, perfect pav."),
    r(5, "Worth the queue near the station."),
    r(4, "Get the fried chilli on the side."),
  ]),
  biz("dadar-sunday-sabzi-bazaar", "Sunday Sabzi Bazaar", "market", 19.022, 72.845, 4.1, 360, 1260, [
    r(4, "Fresh greens and fair prices."),
    r(4, "Lively morning market, so colourful."),
    r(4, "Bring a cloth bag!"),
  ]),
  biz("dadar-udupi-upstairs", "Udupi Upstairs", "restaurant", 19.0275, 72.8405, 4.2, 420, 1350, [
    r(4, "Crispy dosa and great sambar."),
    r(5, "Filter coffee to finish, perfect."),
    r(4, "Quick service even at peak lunch."),
  ]),

  // Juhu (inland of the beach)
  biz("juhu-coconut-cove-cafe", "Coconut Cove Cafe", "cafe", 19.105, 72.834, 4.2, 480, 1380, [
    r(4, "Tender coconut shake is delicious."),
    r(4, "Breezy seating, relaxed vibe."),
    r(4, "Good waffles for brunch."),
  ]),
  biz("juhu-coastal-curry-co", "Coastal Curry Co.", "restaurant", 19.098, 72.835, 4.6, 720, 1410, [
    r(5, "Fish thali was outstanding."),
    r(5, "Kombdi vade like home, ekdum mast."),
    r(4, "Can be busy on Sundays."),
  ]),

  // Andheri West
  biz("andheri-masala-meter", "Masala Meter", "street-food", 19.136, 72.834, 3.8, 960, 30, [
    r(4, "Masala corn and chaat, all good."),
    r(4, "Open late, which is great."),
    r(3, "Spice levels vary day to day."),
  ]),
  biz("andheri-hop-and-hustle", "Hop & Hustle Taproom", "bar", 19.12, 72.843, 4.0, 1080, 60, [
    r(4, "Solid craft beer and good fries."),
    r(4, "Big screens for match nights."),
    r(3, "Loud on weekends, plan for it."),
  ]),
  biz("andheri-malai-moments", "Malai Moments", "cafe", 19.141, 72.83, 3.6, 600, 1380, [
    r(4, "Thick mango lassi, very filling."),
    r(3, "Desserts are hit or miss."),
    r(3, "Okay seating, nice staff."),
  ]),

  // Powai (south of the lake)
  biz("powai-code-and-cutting-chai", "Code & Cutting Chai", "cafe", 19.118, 72.914, 4.3, 480, 1410, [
    r(5, "Startup crowd, fast wifi, strong chai."),
    r(4, "Good sandwiches for long work days."),
    r(4, "Power sockets at every table."),
  ]),
  biz("powai-paratha-pitstop", "Paratha Pitstop", "restaurant", 19.115, 72.909, 3.4, 420, 1350, [
    r(4, "Aloo paratha with loads of butter."),
    r(3, "Tasty food, service a bit slow."),
    r(3, "Portions are generous."),
  ]),
];

const CATEGORIES: readonly BusinessCategory[] = [
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "bookstore",
  "gym",
  "market",
  "bar",
];

const BANNED: RegExp[] = [
  /\bttl\b/i,
  /\brecords?\b/i,
  /on ethereum/i,
  /golem/i,
  /decentrali[sz]ed/i,
  /trustless/i,
  /permanent/i,
];

const NAME_MAX = 24;
const TEXT_MAX = 80;
const LAT_MIN = 18.89;
const LAT_MAX = 19.25;
const LNG_MIN = 72.8;
const LNG_MAX = 72.98;

function decimals(n: number): number {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function isMinute(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < 24 * 60;
}

/** Returns every problem found in SEED_BUSINESSES; empty means the seed is valid. */
export function validateSeed(seed: SeedBusiness[] = SEED_BUSINESSES): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  const checkText = (where: string, text: string) => {
    for (const re of BANNED) if (re.test(text)) problems.push(`${where}: banned word ${re} in "${text}"`);
  };

  for (const s of seed) {
    const b = s.business;
    const at = s.id || "(no id)";

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) problems.push(`${at}: id is not kebab-case`);
    if (ids.has(s.id)) problems.push(`${at}: duplicate id`);
    ids.add(s.id);

    const key = b.name.trim().toLowerCase();
    if (names.has(key)) problems.push(`${at}: duplicate name "${b.name}"`);
    names.add(key);
    if (b.name.trim().length === 0 || b.name.length > NAME_MAX) problems.push(`${at}: name length ${b.name.length}`);
    checkText(at, b.name);

    if (!CATEGORIES.includes(b.category)) problems.push(`${at}: unknown category ${b.category}`);
    if (b.rating < 3.4 || b.rating > 4.9 || decimals(b.rating) > 1) problems.push(`${at}: rating ${b.rating}`);
    if (!isMinute(b.opens) || !isMinute(b.closes) || b.opens === b.closes)
      problems.push(`${at}: hours ${b.opens}-${b.closes}`);
    if (b.city !== "Mumbai") problems.push(`${at}: city ${b.city}`);
    if (b.lat < LAT_MIN || b.lat > LAT_MAX || decimals(b.lat) > 5) problems.push(`${at}: lat ${b.lat}`);
    if (b.lng < LNG_MIN || b.lng > LNG_MAX || decimals(b.lng) > 5) problems.push(`${at}: lng ${b.lng}`);
    for (const extra of ["photo", "session", "color", "country"] as const)
      if (b[extra] !== undefined) problems.push(`${at}: unexpected field ${extra}`);

    if (s.reviews.length < 2 || s.reviews.length > 3) problems.push(`${at}: ${s.reviews.length} reviews`);
    s.reviews.forEach((rv, i) => {
      const where = `${at} review ${i + 1}`;
      if (!Number.isInteger(rv.stars) || rv.stars < 1 || rv.stars > 5) problems.push(`${where}: stars ${rv.stars}`);
      if (rv.text.trim().length === 0 || rv.text.length > TEXT_MAX)
        problems.push(`${where}: text length ${rv.text.length}`);
      checkText(where, rv.text);
    });
    if (s.reviews.length > 0) {
      const mean = s.reviews.reduce((sum, rv) => sum + rv.stars, 0) / s.reviews.length;
      if (Math.abs(mean - b.rating) > 1) problems.push(`${at}: mean stars ${mean.toFixed(2)} vs rating ${b.rating}`);
    }
  }
  return problems;
}
