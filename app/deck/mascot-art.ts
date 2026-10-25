// The mascot renders in public/deck/mascot/, one transparent WebP per pose, cropped to the character.
// Width and height are the files' pixel sizes, so <Mascot> keeps each pose's aspect ratio.
export const MASCOT_ART = {
  stand: { file: "arkiv-mascot-stand.webp", width: 519, height: 900 },
  wave: { file: "arkiv-mascot-wave.webp", width: 746, height: 900 },
  thumbsUp: { file: "arkiv-mascot-thumbsUp.webp", width: 683, height: 900 },
  thumbsDown: { file: "arkiv-mascot-thumbsDown.webp", width: 687, height: 900 },
  key: { file: "arkiv-mascot-key.webp", width: 760, height: 900 },
  laptop: { file: "arkiv-mascot-laptop.webp", width: 828, height: 900 },
  magnifier: { file: "arkiv-mascot-magnifier.webp", width: 680, height: 900 },
  hourglass: { file: "arkiv-mascot-hourglass.webp", width: 531, height: 900 },
} as const;
