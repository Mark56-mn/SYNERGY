/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared contracts/tokens packages are TS source; transpile them into
  // the web build rather than duplicating their code into web/.
  transpilePackages: ["@synergy/domain", "@synergy/design-tokens"],
  // `@synergy/domain` is TypeScript source that uses NodeNext-style ".js"
  // specifiers (./users-and-profiles.js) so Node ESM consumers resolve it
  // correctly. The server compiler maps those through SWC; webpack needs the
  // same mapping now that a client component (the profile form) imports the
  // shared username rules. Without this, the client graph cannot resolve
  // "./listings.js" and the build fails.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
