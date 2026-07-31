/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint alineado con Next 14 (eslint 8 + eslint-config-next 14) → `next lint`
  // vuelve a correr, así que el build lo usa de gate igual que a tsc.
  eslint: { ignoreDuringBuilds: false },
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
