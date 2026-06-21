/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the Prisma query engine binary is bundled into Vercel's serverless
  // functions. Without this, DB pages 500 at runtime ("Query engine ... not
  // found") even though the build succeeds and non-DB pages work.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
