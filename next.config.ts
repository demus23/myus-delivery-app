/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Do not fail the build because of ESLint errors
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
