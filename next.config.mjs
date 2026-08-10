/**
 * GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so
 * every asset and link needs the /<repo> prefix. The deploy workflow sets
 * NEXT_PUBLIC_BASE_PATH; locally it is empty, so `npm run dev` is unaffected.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Pages is static hosting — there is no Node server to render on demand.
  output: 'export',

  // Emit /route/index.html rather than /route.html, so directory URLs resolve.
  trailingSlash: true,

  basePath,

  // The image optimiser needs a running server; ship the PNG as-is.
  images: { unoptimized: true },
};

export default nextConfig;
