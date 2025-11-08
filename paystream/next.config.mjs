/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce runtime heaviness: disable image optimization and source maps in prod
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Prevent bundler from attempting to resolve optional pretty logger.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
