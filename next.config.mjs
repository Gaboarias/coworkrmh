/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 9 is incompatible with Next 14's lint runner (unrelated to type safety) — kept off.
  eslint: { ignoreDuringBuilds: true },
  // Root-cause debt (snake/camel + as-any) closed → compiler is the safety net again.
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
