/**
 * Bridges the project's import style to the way Node resolves modules, so that `npm test`
 * can import from `src/lib` exactly as the app does - without adding a dev dependency
 * (vitest/jest would need approval under hard rule 6).
 *
 * Two gaps, both of them contracts between TypeScript and Next's bundler that Node knows
 * nothing about:
 *   1. The `@/...` alias (defined in tsconfig `paths`) - `@/data/x` -> `src/data/x`.
 *   2. Extensionless relative imports (`./travel`) - type-stripping needs the full path.
 *
 * Without both, every import inside the library fails with ERR_MODULE_NOT_FOUND, which is
 * why there were no tests here until now. The hook itself lives in alias-hooks.mjs.
 */
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
