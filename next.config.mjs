/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure the Prisma query engine binary is bundled into Vercel's serverless
  // functions. Without this, DB pages 500 at runtime ("Query engine ... not
  // found") even though the build succeeds and non-DB pages work.
  // Same class of problem for the certificate renderer: its fonts, logo and
  // signature are read off disk at runtime, so they have to be traced in too.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
      "./src/assets/**/*",
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
