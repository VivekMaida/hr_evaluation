/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets role/record checks call forbidden() for a real 403 instead of
  // faking denial with a 200-status page or a redirect.
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
