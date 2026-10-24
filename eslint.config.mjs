import next from "eslint-config-next";

export default [
  { ignores: [".next/**", "out/**", "node_modules/**", "writer/**", "next-env.d.ts"] },
  ...next,
];
