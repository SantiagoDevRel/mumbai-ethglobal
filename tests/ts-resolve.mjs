// Test-only module resolution: the app imports its TypeScript without extensions (the bundler
// resolves them); Node needs `.ts`. Use with `node --import ./tests/ts-resolve.mjs` (Node 22.15+).
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (specifier.startsWith(".") && !/\.(?:[cm]?[jt]sx?|json)$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});
