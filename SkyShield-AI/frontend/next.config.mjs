/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this folder so Next does not pick up an
  // unrelated lockfile from a parent directory.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
