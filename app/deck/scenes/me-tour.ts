// The countries on the "who I am" slide (ME), in the order its → reveals them: from Latin America
// across Africa, west to east (Santiago, October 30: his photos from countries he has been to, each
// with its flag). One photo per step, so `steps` for ME in shared/scenes.ts is this list's length
// (tests/me-tour.test.ts checks it, and that every file exists).

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
