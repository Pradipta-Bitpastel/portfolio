/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: []
  },
  compiler: {
    // Strip console.* in production builds, but keep error/warn so
    // crash diagnostics still surface in the deployed app. Dev keeps
    // the full set so debugging stays painless.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false
  },
  experimental: {
    // Tree-shake friendly modular imports. Next rewrites named imports
    // from these packages into deep imports, dropping unused exports
    // from the client bundle. drei + three are the biggest wins —
    // a typical drei import pulls ~60 named exports into the route
    // bundle even when only 4 are used.
    optimizePackageImports: [
      "gsap",
      "@react-three/drei",
      "@react-three/fiber",
      "three"
    ]
  }
};

export default nextConfig;
