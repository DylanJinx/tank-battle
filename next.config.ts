/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  typescript: {
    // 在生产构建中忽略类型检查错误
    ignoreBuildErrors: true,
  },
  eslint: {
    // 在生产构建中忽略ESLint错误
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
