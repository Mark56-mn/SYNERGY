/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared contracts/tokens packages are TS source; transpile them into
  // the web build rather than duplicating their code into web/.
  transpilePackages: ["@synergy/domain", "@synergy/design-tokens"],
};

export default nextConfig;
