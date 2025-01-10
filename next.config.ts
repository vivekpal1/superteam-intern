/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;