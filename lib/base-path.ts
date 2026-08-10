/**
 * GitHub Pages serves the project site under /<repo>. `next/link` picks the
 * prefix up from next.config's basePath automatically, but `next/image` with
 * `unoptimized: true` passes src straight through — so anything pointing at a
 * file in public/ has to be prefixed by hand.
 *
 * Inlined at build time, so it is safe in client and server components alike.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Resolve a public/ asset path against the deployment's base path. */
export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
