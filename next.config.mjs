/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent tesseract.js from being bundled server-side
      config.externals = config.externals || [];
      config.externals.push("tesseract.js");
    }
    return config;
  },
};

export default nextConfig;
