// The "who I am" slide (ME). The countries in the order its → reveals them: from Latin America across
// Africa, west to east (Santiago, October 30: his photos from countries he has been to, each with its
// flag). One photo per step, then one last step for the route's "10+ countries" stop (Santiago, October
// 30: so the room sees he has been everywhere), so `steps` for ME in shared/scenes.ts is ME_STEPS. The
// slide's logos and profile links live here too: tests/me-tour.test.ts checks every file and link, and
// tests/ui-layout.mjs clicks the links.

export interface TourStop {
  /** ISO 3166-1 alpha-2, lower case: the round flag in public/deck/flags/. */
  code: string;
  name: string;
  /** The photo in public/deck/me/: a 3:2 WebP, 1600 x 1067, with no metadata. */
  photo: string;
  alt: string;
  /** Where the print lands on the pile: its tilt in degrees and its offset from the pile's center (stage px). */
  tilt: number;
  x: number;
  y: number;
}

export const TOUR: readonly TourStop[] = [
  { code: "ar", name: "Argentina", photo: "argentina", alt: "Santiago with a big group of builders in a courtyard in Argentina", tilt: -6, x: -40, y: -24 },
  { code: "gh", name: "Ghana", photo: "ghana", alt: "Santiago crouching with his arms up in front of a group of builders in Ghana", tilt: 5, x: 38, y: -30 },
  { code: "ng", name: "Nigeria", photo: "nigeria", alt: "Santiago's selfie at a coding workshop in Nigeria, builders at their laptops behind him", tilt: -3, x: -30, y: 24 },
  { code: "et", name: "Ethiopia", photo: "ethiopia", alt: "Santiago with two builders in front of a sponsor wall in Ethiopia", tilt: 6.5, x: 42, y: 16 },
  { code: "ug", name: "Uganda", photo: "uganda", alt: "Santiago in a Uganda hat, sitting in front of a group of students in Web3 Engineer t-shirts", tilt: -4, x: -34, y: 4 },
  { code: "ke", name: "Kenya", photo: "kenya", alt: "Santiago with a crowd of students on the steps of a university in Kenya, beside a web3.js Africa Tour banner", tilt: 2, x: 12, y: -6 },
];

export const photoSrc = (stop: TourStop) => `/deck/me/${stop.photo}.webp`;
export const flagSrc = (stop: TourStop) => `/deck/flags/${stop.code}.svg`;

/** The route's last stop, lit by the → after the last photo: more countries than the photos show. */
export const MORE = { badge: "10+", label: "countries" } as const;

/** One step per photo, then the "10+ countries" stop. */
export const ME_STEPS = TOUR.length + 1;

/** A logo of where he worked before Arkiv: the official file in public/deck/logos/, colors unchanged
 * (sources and terms in Speaker.tsx's header). `ratio` is the file's own width / height. */
export interface PastLogo {
  name: string;
  src: string;
  height: number;
  ratio: number;
}

/** Before Arkiv, in the order he named them (Santiago, October 30: the logos instead of a "Worked for"
 * title). One height for the row: the two marks fill it and the two wordmarks' capitals match. */
export const BEFORE_ARKIV: readonly PastLogo[] = [
  { name: "Cosmos", src: "/deck/logos/cosmos-wordmark-white.svg", height: 48, ratio: 570 / 100 },
  { name: "ChainSafe", src: "/deck/logos/chainsafe-logo.svg", height: 48, ratio: 832 / 817 },
  { name: "web3.js", src: "/deck/logos/web3js-logo.svg", height: 48, ratio: 1502 / 1404 },
  { name: "Lisk", src: "/deck/logos/lisk-lockup-light.svg", height: 47, ratio: 265 / 92 },
];

/** His handle on every profile, shown once beside the icons. */
export const HANDLE = "@santiagodevrel";

/** A profile: its icon opens it in a new tab. `size` is the icon's height on the stage, tuned so the three
 * look the same size. */
export interface Profile {
  name: string;
  href: string;
  size: number;
  /** A simple-icons path in a 24 x 24 box (CC0), drawn white, or LinkedIn's own picture with its width / height. */
  icon: { path: string } | { src: string; ratio: number };
}

/** His profiles (Santiago, October 30: X, LinkedIn and Telegram icons that open them). LinkedIn allows only
 * its own logo files, so its icon is the white "in" logo from LinkedIn's brand kit. */
export const PROFILES: readonly Profile[] = [
  {
    name: "X",
    href: "https://x.com/santiagodevrel",
    size: 38,
    icon: { path: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" },
  },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/santiagodevrel", size: 40, icon: { src: "/deck/logos/linkedin-in-white.png", ratio: 840 / 779 } },
  {
    name: "Telegram",
    href: "https://t.me/santiagodevrel",
    size: 42,
    icon: {
      path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
    },
  },
];

export const profileLabel = (profile: Profile) => `Santiago on ${profile.name}`;
