/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pino-pretty"],
  // Reduce runtime heaviness: disable image optimization and source maps in prod
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
