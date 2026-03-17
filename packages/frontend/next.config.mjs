/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
