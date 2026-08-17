/**
 * The resolve hook itself. It lives in a separate file and is registered by path (rather than
 * as a data: URL with a dynamic import) deliberately: an earlier version imported the helper
 * file from inside the hook, and that import went through the hook again - infinite recursion
 * and "Maximum call stack size exceeded". A static import here resolves before the hook is
 * active, and is therefore safe.
 *
 * What it solves, and why it is needed - see alias-loader.mjs.
 */
import { existsSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);

function firstExisting(base, rest) {
  for (const candidate of [rest, `${rest}.ts`, `${rest}.tsx`, `${rest}/index.ts`]) {
    const url = new URL(candidate, base);
    if (existsSync(url)) return url.href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  // The project's alias: "@/data/x" -> src/data/x
  if (specifier.startsWith('@/')) {
    const url = firstExisting(SRC, specifier.slice(2));
    if (url) return { url, shortCircuit: true };
  }
  // Extensionless relative imports: type-stripping needs an explicit path
  if (context.parentURL && /^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    const url = firstExisting(context.parentURL, specifier);
    if (url) return { url, shortCircuit: true };
  }
  return next(specifier, context);
}
